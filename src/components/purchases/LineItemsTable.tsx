import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export interface LineItem {
  id?: string;
  product_id: string;
  uom_id?: string;
  quantity: number;
  unit_price_fc: number;
  discount_percent?: number;
  line_total_fc: number;
  line_total_bc: number;
  notes?: string;
}

interface LineItemsTableProps {
  items: LineItem[];
  onItemsChange: (items: LineItem[]) => void;
  exchangeRate: number;
  currencyCode: string;
  baseCurrency: string;
  disabled?: boolean;
  showUnitCost?: boolean;
  className?: string;
}

interface Product {
  id: string;
  name: string;
  name_en?: string;
}

interface UOM {
  id: string;
  name: string;
  name_en?: string;
}

export function LineItemsTable({
  items,
  onItemsChange,
  exchangeRate,
  currencyCode,
  baseCurrency,
  disabled = false,
  showUnitCost = true,
  className,
}: LineItemsTableProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [uoms, setUoms] = useState<UOM[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [productsRes, uomsRes] = await Promise.all([
        supabase.from("products").select("id, name, name_en").eq("is_active", true).order("name"),
        supabase.from("uoms").select("id, name, name_en").eq("is_active", true).order("name"),
      ]);
      setProducts(productsRes.data || []);
      setUoms(uomsRes.data || []);
    };
    fetchData();
  }, []);

  const addItem = () => {
    const newItem: LineItem = {
      product_id: "",
      uom_id: "",
      quantity: 1,
      unit_price_fc: 0,
      discount_percent: 0,
      line_total_fc: 0,
      line_total_bc: 0,
      notes: "",
    };
    onItemsChange([...items, newItem]);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate totals
    const qty = newItems[index].quantity || 0;
    const price = newItems[index].unit_price_fc || 0;
    const discount = newItems[index].discount_percent || 0;
    
    const subtotal = qty * price;
    const discountAmount = subtotal * (discount / 100);
    const lineTotalFC = subtotal - discountAmount;
    const lineTotalBC = lineTotalFC * exchangeRate;

    newItems[index].line_total_fc = lineTotalFC;
    newItems[index].line_total_bc = lineTotalBC;

    onItemsChange(newItems);
  };

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString("ar-YE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const isDifferentCurrency = currencyCode !== baseCurrency;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <h4 className="font-medium">البنود</h4>
        {!disabled && (
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 ml-2" />
            إضافة بند
          </Button>
        )}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">المنتج</TableHead>
              <TableHead className="w-[120px]">الوحدة</TableHead>
              <TableHead className="w-[100px]">الكمية</TableHead>
              {showUnitCost && (
                <TableHead className="w-[120px]">السعر ({currencyCode})</TableHead>
              )}
              <TableHead className="w-[80px]">الخصم %</TableHead>
              <TableHead className="w-[150px]">الإجمالي</TableHead>
              <TableHead className="w-[150px]">ملاحظات</TableHead>
              {!disabled && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showUnitCost ? 8 : 7} className="text-center text-muted-foreground py-8">
                  لا توجد بنود. اضغط "إضافة بند" لإضافة منتج.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={item.product_id}
                      onValueChange={(val) => updateItem(index, "product_id", val)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={item.uom_id || ""}
                      onValueChange={(val) => updateItem(index, "uom_id", val)}
                      disabled={disabled}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="الوحدة" />
                      </SelectTrigger>
                      <SelectContent>
                        {uoms.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                      className="w-full"
                    />
                  </TableCell>
                  {showUnitCost && (
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unit_price_fc}
                        onChange={(e) => updateItem(index, "unit_price_fc", parseFloat(e.target.value) || 0)}
                        disabled={disabled}
                        className="w-full"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={item.discount_percent || 0}
                      onChange={(e) => updateItem(index, "discount_percent", parseFloat(e.target.value) || 0)}
                      disabled={disabled}
                      className="w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{formatAmount(item.line_total_fc, currencyCode)}</span>
                      {isDifferentCurrency && (
                        <span className="text-xs text-muted-foreground block">
                          {formatAmount(item.line_total_bc, baseCurrency)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={item.notes || ""}
                      onChange={(e) => updateItem(index, "notes", e.target.value)}
                      disabled={disabled}
                      placeholder="ملاحظات"
                      className="w-full"
                    />
                  </TableCell>
                  {!disabled && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
