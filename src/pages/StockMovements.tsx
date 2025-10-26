import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, Filter, Calendar, Package, TrendingUp, TrendingDown } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface StockMovement {
  id: string;
  created_at: string;
  item_id: string;
  warehouse_id: string;
  batch_id?: string;
  qty_in: number;
  qty_out: number;
  ref_type?: string;
  ref_id?: string;
  note?: string;
  cogs_amount?: number;
  currency?: string;
  created_by?: string;
  products?: {
    name: string;
    name_en?: string;
  };
  warehouses?: {
    name: string;
    code: string;
  };
}

const StockMovements = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [filteredMovements, setFilteredMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [movements, selectedWarehouse, selectedProduct, selectedType, dateFrom, dateTo]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch movements from stock_ledger
      const { data: ledgerData, error: ledgerError } = await supabase
        .from("stock_ledger")
        .select(`
          *,
          products:item_id (name, name_en),
          warehouses:warehouse_id (name, code)
        `)
        .order("created_at", { ascending: false })
        .limit(500);

      if (ledgerError) throw ledgerError;

      // Fetch warehouses
      const { data: warehousesData, error: warehousesError } = await supabase
        .from("warehouses")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (warehousesError) throw warehousesError;

      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, name_en")
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;

      setMovements(ledgerData || []);
      setWarehouses(warehousesData || []);
      setProducts(productsData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...movements];

    if (selectedWarehouse !== "all") {
      filtered = filtered.filter((m) => m.warehouse_id === selectedWarehouse);
    }

    if (selectedProduct !== "all") {
      filtered = filtered.filter((m) => m.item_id === selectedProduct);
    }

    if (selectedType !== "all") {
      const isInType = selectedType.includes("in") || selectedType === "purchase";
      filtered = filtered.filter((m) => 
        isInType ? m.qty_in > 0 : m.qty_out > 0
      );
    }

    if (dateFrom) {
      filtered = filtered.filter((m) => m.created_at >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((m) => m.created_at <= dateTo);
    }

    setFilteredMovements(filtered);
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      in: "إدخال",
      out: "إخراج",
      transfer_in: "تحويل وارد",
      transfer_out: "تحويل صادر",
      adjustment_in: "تعديل زيادة",
      adjustment_out: "تعديل نقص",
      sale: "بيع",
      purchase: "شراء",
      return_in: "مرتجع وارد",
      return_out: "مرتجع صادر",
    };
    return labels[type] || type;
  };

  const getMovementTypeBadge = (type: string) => {
    if (type.includes("in") || type === "purchase" || type === "return_in") {
      return "default";
    }
    return "destructive";
  };

  const resetFilters = () => {
    setSelectedWarehouse("all");
    setSelectedProduct("all");
    setSelectedType("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8" />
            الحركات المخزنية
          </h1>
          <p className="text-muted-foreground mt-2">
            عرض وتتبع جميع حركات المخزون (إدخال، إخراج، تحويلات، تعديلات)
          </p>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              الفلاتر
            </CardTitle>
            <CardDescription>تصفية الحركات المخزنية حسب المعايير</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">المستودع</label>
                <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المستودعات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المستودعات</SelectItem>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh.id} value={wh.id}>
                        {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">المنتج</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع المنتجات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المنتجات</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">نوع الحركة</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="جميع الأنواع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنواع</SelectItem>
                    <SelectItem value="in">إدخال</SelectItem>
                    <SelectItem value="out">إخراج</SelectItem>
                    <SelectItem value="transfer_in">تحويل وارد</SelectItem>
                    <SelectItem value="transfer_out">تحويل صادر</SelectItem>
                    <SelectItem value="adjustment_in">تعديل زيادة</SelectItem>
                    <SelectItem value="adjustment_out">تعديل نقص</SelectItem>
                    <SelectItem value="sale">بيع</SelectItem>
                    <SelectItem value="purchase">شراء</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">من تاريخ</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">إلى تاريخ</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={resetFilters} variant="outline">
                مسح الفلاتر
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Movements Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              سجل الحركات
            </CardTitle>
            <CardDescription>
              عرض {filteredMovements.length} حركة من أصل {movements.length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">جاري التحميل...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>المستودع</TableHead>
                    <TableHead className="text-center">الكمية</TableHead>
                    <TableHead>المرجع</TableHead>
                    <TableHead>ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        لا توجد حركات مخزنية
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMovements.map((movement) => (
                      <TableRow key={movement.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {format(new Date(movement.created_at), "dd/MM/yyyy", { locale: ar })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={movement.qty_in > 0 ? "default" : "destructive"}>
                            {movement.qty_in > 0 ? (
                              <TrendingUp className="h-3 w-3 ml-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 ml-1" />
                            )}
                            {movement.qty_in > 0 ? "إدخال" : "إخراج"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {movement.products?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{movement.warehouses?.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {movement.warehouses?.code}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`font-bold ${
                              movement.qty_in > 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {movement.qty_in > 0 ? "+" : "-"}
                            {movement.qty_in > 0 ? movement.qty_in : movement.qty_out}
                          </span>
                        </TableCell>
                        <TableCell>
                          {movement.ref_type ? (
                            <div className="text-xs">
                              <div className="font-medium">{movement.ref_type}</div>
                              <div className="text-muted-foreground">
                                {movement.ref_id?.substring(0, 8)}...
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {movement.note || "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StockMovements;
