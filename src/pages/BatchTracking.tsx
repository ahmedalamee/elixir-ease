import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package2, AlertTriangle, Calendar, Search } from "lucide-react";

const BatchTracking = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [batches, setBatches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expiringCount, setExpiringCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    checkAuth();
    fetchBatches();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_batches")
        .select(`
          *,
          product:products(name, name_en)
        `)
        .order("expiry_date", { ascending: true });

      if (error) throw error;

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      let expiring = 0;
      let expired = 0;

      data?.forEach((batch) => {
        const expiryDate = new Date(batch.expiry_date);
        if (expiryDate < today) {
          expired++;
        } else if (expiryDate <= thirtyDaysFromNow) {
          expiring++;
        }
      });

      setExpiringCount(expiring);
      setExpiredCount(expired);
      setBatches(data || []);
    } catch (error) {
      console.error("Error fetching batches:", error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الدفعات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry < 0) {
      return {
        badge: (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            منتهي الصلاحية
          </Badge>
        ),
        color: "text-red-600",
      };
    } else if (daysUntilExpiry <= 30) {
      return {
        badge: (
          <Badge className="bg-orange-500 gap-1">
            <AlertTriangle className="w-3 h-3" />
            قريب من الانتهاء ({daysUntilExpiry} يوم)
          </Badge>
        ),
        color: "text-orange-600",
      };
    } else if (daysUntilExpiry <= 90) {
      return {
        badge: (
          <Badge className="bg-yellow-500 gap-1">
            <Calendar className="w-3 h-3" />
            تنبيه ({daysUntilExpiry} يوم)
          </Badge>
        ),
        color: "text-yellow-600",
      };
    } else {
      return {
        badge: (
          <Badge className="bg-green-500">صالح ({daysUntilExpiry} يوم)</Badge>
        ),
        color: "text-green-600",
      };
    }
  };

  const filteredBatches = batches.filter(
    (batch) =>
      batch.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.product?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.product?.name_en?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">جارٍ التحميل...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">تتبع الدفعات</h1>
          <p className="text-muted-foreground">
            إدارة دفعات المنتجات ومراقبة تواريخ الصلاحية
          </p>
        </div>

        {/* Alerts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {expiredCount > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{expiredCount}</strong> دفعة منتهية الصلاحية تحتاج إلى معالجة
              </AlertDescription>
            </Alert>
          )}
          {expiringCount > 0 && (
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>{expiringCount}</strong> دفعة قريبة من انتهاء الصلاحية (خلال 30
                يوم)
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="ابحث عن دفعة أو منتج..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Batches Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package2 className="w-6 h-6" />
              جميع الدفعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">رقم الدفعة</TableHead>
                  <TableHead className="text-right">المنتج</TableHead>
                  <TableHead className="text-right">الكمية</TableHead>
                  <TableHead className="text-right">تكلفة الوحدة</TableHead>
                  <TableHead className="text-right">تاريخ الصلاحية</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length > 0 ? (
                  filteredBatches.map((batch) => {
                    const status = getExpiryStatus(batch.expiry_date);
                    return (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">
                          {batch.batch_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{batch.product?.name}</div>
                            {batch.product?.name_en && (
                              <div className="text-sm text-muted-foreground">
                                {batch.product.name_en}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{batch.quantity}</TableCell>
                        <TableCell>{batch.cost_price.toFixed(2)} ر.س</TableCell>
                        <TableCell className={status.color}>
                          {new Date(batch.expiry_date).toLocaleDateString("ar-SA")}
                        </TableCell>
                        <TableCell>{status.badge}</TableCell>
                        <TableCell>
                          {new Date(batch.created_at).toLocaleDateString("ar-SA")}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      {searchQuery
                        ? "لا توجد نتائج مطابقة للبحث"
                        : "لا توجد دفعات حالياً"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BatchTracking;
