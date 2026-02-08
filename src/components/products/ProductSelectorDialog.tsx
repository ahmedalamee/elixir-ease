import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Package, Check, ChevronLeft, ChevronRight, FlaskConical } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { ProductImage } from "./ProductImage";

interface ProductSelectorProduct {
  id: string;
  name: string;
  name_en?: string;
  barcode?: string;
  sku?: string;
  price: number;
  cost_price: number;
  is_active: boolean;
  sellable: boolean;
  base_uom_id?: string;
  scientific_material_id?: string;
  allow_discount: boolean;
  max_discount_percentage: number;
  default_discount_percentage: number;
  image_url?: string;
  scientific_material_name?: string;
  category_name?: string;
  total_stock: number;
  available_stock: number;
  reserved_stock: number;
  free_stock: number;
}

interface ProductSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: string;
  onSelect: (product: ProductSelectorProduct) => void;
  currencyCode?: string;
}

const PAGE_SIZE = 20;

export const ProductSelectorDialog = ({
  open,
  onOpenChange,
  warehouseId,
  onSelect,
  currencyCode = "YER",
}: ProductSelectorDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(0);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Fetch products with stock for selected warehouse
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["product-selector", warehouseId, debouncedSearch, page],
    queryFn: async () => {
      // Get products from view
      let query = supabase
        .from("v_product_selector")
        .select("*")
        .eq("is_active", true)
        .eq("sellable", true)
        .order("name");

      // Apply search filter
      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,barcode.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%,scientific_material_name.ilike.%${debouncedSearch}%`
        );
      }

      // Pagination
      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      // If warehouse is selected, get warehouse-specific stock
      let warehouseStock: Record<string, number> = {};
      if (warehouseId) {
        const { data: stockData } = await supabase
          .from("warehouse_stock")
          .select("item_id, qty_on_hand, qty_reserved")
          .eq("warehouse_id", warehouseId);
        
        if (stockData) {
          stockData.forEach(s => {
            warehouseStock[s.item_id] = (s.qty_on_hand || 0) - (s.qty_reserved || 0);
          });
        }
      }

      // Enrich products with warehouse-specific stock
      const enrichedProducts = (data || []).map(p => ({
        ...p,
        warehouse_available: warehouseId ? (warehouseStock[p.id] || 0) : p.available_stock,
      }));

      return {
        products: enrichedProducts,
        hasMore: (data?.length || 0) === PAGE_SIZE,
      };
    },
    enabled: open,
  });

  const products = productsData?.products || [];
  const hasMore = productsData?.hasMore || false;

  // Reset selection when search changes
  useEffect(() => {
    setSelectedIndex(0);
    setPage(0);
  }, [debouncedSearch]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!products.length) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, products.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (products[selectedIndex]) {
            handleSelect(products[selectedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          onOpenChange(false);
          break;
      }
    },
    [products, selectedIndex, onOpenChange]
  );

  const handleSelect = (product: any) => {
    onSelect({
      ...product,
      available_stock: product.warehouse_available ?? product.available_stock,
    });
    onOpenChange(false);
    setSearchQuery("");
    setPage(0);
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ar-SA", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            اختيار منتج
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم، الباركود، الكود، أو المادة العلمية..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pr-10"
              autoFocus
            />
          </div>

          {/* Products Table */}
          <ScrollArea className="h-[400px] border rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                جاري التحميل...
              </div>
            ) : products.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p>لا توجد منتجات مطابقة</p>
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الكود</TableHead>
                    <TableHead>المادة العلمية</TableHead>
                    <TableHead className="text-center">المتوفر</TableHead>
                    <TableHead className="text-left">السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product: any, index: number) => {
                    const isSelected = index === selectedIndex;
                    const availableQty = product.warehouse_available ?? product.available_stock;
                    const isOutOfStock = availableQty <= 0;

                    return (
                      <TableRow
                        key={product.id}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-muted/50"
                        } ${isOutOfStock ? "opacity-60" : ""}`}
                        onClick={() => handleSelect(product)}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <TableCell>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ProductImage
                              imageUrl={product.image_url}
                              productName={product.name}
                              size="sm"
                            />
                            <div>
                              <p className="font-medium">{product.name}</p>
                              {product.barcode && (
                                <p className="text-xs text-muted-foreground">{product.barcode}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {product.sku || "-"}
                        </TableCell>
                        <TableCell>
                        {product.scientific_material_name ? (
                            <div className="flex items-center gap-1 text-sm">
                              <FlaskConical className="h-3 w-3 text-primary" />
                              <span className="text-primary">{product.scientific_material_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              isOutOfStock
                                ? "destructive"
                                : availableQty <= 10
                                ? "secondary"
                                : "default"
                            }
                          >
                            {availableQty}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left font-medium">
                          {formatCurrency(product.price)} {currencyCode}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {products.length > 0 && (
                <>
                  عرض {page * PAGE_SIZE + 1} - {page * PAGE_SIZE + products.length}
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronRight className="h-4 w-4" />
                السابق
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
              >
                التالي
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground text-center">
            استخدم ↑↓ للتنقل • Enter للاختيار • Esc للإغلاق
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSelectorDialog;
