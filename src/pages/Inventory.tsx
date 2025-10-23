import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, AlertTriangle, Calendar, Plus } from "lucide-react";

interface InventoryProduct {
  id: string;
  name: string;
  name_en: string | null;
  barcode: string | null;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  price: number;
  expiry_date: string | null;
  is_active: boolean;
}

const Inventory = () => {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "expired">("all");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchInventory();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchInventory = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("quantity", { ascending: true });

    if (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setProducts(data || []);
    }
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiryDate) <= thirtyDaysFromNow && !isExpired(expiryDate);
  };

  const getStockStatus = (product: InventoryProduct) => {
    if (product.quantity === 0) {
      return { label: "نفذ", variant: "destructive" as const };
    }
    if (product.quantity <= product.min_quantity) {
      return { label: "منخفض", variant: "destructive" as const };
    }
    return { label: "متوفر", variant: "default" as const };
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name_en?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.includes(searchTerm);

    if (!matchesSearch) return false;

    if (filter === "low") {
      return product.quantity <= product.min_quantity;
    }
    if (filter === "expired") {
      return isExpired(product.expiry_date) || isExpiringSoon(product.expiry_date);
    }
    return true;
  });

  const lowStockCount = products.filter(
    (p) => p.quantity <= p.min_quantity
  ).length;
  const expiredCount = products.filter(
    (p) => isExpired(p.expiry_date) || isExpiringSoon(p.expiry_date)
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                إجمالي المنتجات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{products.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                مخزون منخفض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {lowStockCount}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-destructive" />
                منتهية أو قريبة الانتهاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {expiredCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>تقرير المخزون</CardTitle>
                <CardDescription>
                  متابعة حالة المخزون والمنتجات منتهية الصلاحية
                </CardDescription>
              </div>
              <Button 
                className="btn-medical gap-2"
                onClick={() => navigate("/inventory")}
              >
                <Plus className="w-4 h-4" />
                إضافة
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم أو الباركود..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={filter === "all" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFilter("all")}
                >
                  الكل
                </Badge>
                <Badge
                  variant={filter === "low" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFilter("low")}
                >
                  مخزون منخفض
                </Badge>
                <Badge
                  variant={filter === "expired" ? "default" : "outline"}
                  className="cursor-pointer px-4 py-2"
                  onClick={() => setFilter("expired")}
                >
                  قريبة الانتهاء
                </Badge>
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الباركود</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>الحد الأدنى</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ الانتهاء</TableHead>
                    <TableHead>القيمة الإجمالية</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const status = getStockStatus(product);
                    const expired = isExpired(product.expiry_date);
                    const expiringSoon = isExpiringSoon(product.expiry_date);

                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">
                          {product.name}
                        </TableCell>
                        <TableCell>{product.barcode || "-"}</TableCell>
                        <TableCell>{product.quantity}</TableCell>
                        <TableCell>{product.min_quantity}</TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {product.expiry_date ? (
                            <div className="flex items-center gap-2">
                              {(expired || expiringSoon) && (
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                              )}
                              <span
                                className={
                                  expired || expiringSoon
                                    ? "text-destructive"
                                    : ""
                                }
                              >
                                {new Date(product.expiry_date).toLocaleDateString(
                                  "ar-SA"
                                )}
                              </span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {(product.cost_price * product.quantity).toFixed(2)}{" "}
                          ر.س
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Inventory;
