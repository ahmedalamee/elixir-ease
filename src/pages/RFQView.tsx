import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Plus, Trophy, FileCheck } from "lucide-react";
import {
  useRFQ,
  useRFQSuppliers,
  useRFQQuotes,
  useCreateQuote,
  useSelectWinner,
  useConvertQuoteToPO,
} from "@/hooks/useRFQ";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-500",
  sent: "bg-blue-500",
  received: "bg-yellow-500",
  evaluated: "bg-purple-500",
  awarded: "bg-green-500",
  cancelled: "bg-red-500",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  sent: "مرسل",
  received: "تم الاستلام",
  evaluated: "تم التقييم",
  awarded: "تم الترسية",
  cancelled: "ملغي",
};

export default function RFQView() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: rfq, isLoading } = useRFQ(id);
  const { data: suppliers } = useRFQSuppliers(id);
  const { data: quotes } = useRFQQuotes(id);
  const createQuote = useCreateQuote();
  const selectWinner = useSelectWinner();
  const convertToPO = useConvertQuoteToPO();

  const [isAddQuoteOpen, setIsAddQuoteOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [quoteTotal, setQuoteTotal] = useState("");
  const [quoteNotes, setQuoteNotes] = useState("");

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        جاري التحميل...
      </div>
    );
  }

  if (!rfq) {
    return (
      <div className="container mx-auto p-6 text-center" dir="rtl">
        طلب عرض السعر غير موجود
      </div>
    );
  }

  const handleAddQuote = async () => {
    if (!selectedSupplierId || !quoteTotal) {
      toast.error("يرجى اختيار المورد وإدخال المبلغ");
      return;
    }

    try {
      await createQuote.mutateAsync({
        quote: {
          rfq_id: id,
          supplier_id: selectedSupplierId,
          total_amount_fc: parseFloat(quoteTotal),
          currency_code: "YER",
          exchange_rate: 1,
          notes: quoteNotes,
          status: "received",
        },
        items: [],
      });
      setIsAddQuoteOpen(false);
      setSelectedSupplierId("");
      setQuoteTotal("");
      setQuoteNotes("");
    } catch (error) {
      console.error(error);
    }
  };

  const handleSelectWinner = async (quoteId: string) => {
    try {
      await selectWinner.mutateAsync(quoteId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleConvertToPO = async (quoteId: string) => {
    try {
      await convertToPO.mutateAsync(quoteId);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/rfq")}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{rfq.rfq_number}</h1>
            <p className="text-muted-foreground">{rfq.title || "طلب عرض سعر"}</p>
          </div>
        </div>
        <Badge className={statusColors[rfq.status] || "bg-gray-500"}>
          {statusLabels[rfq.status] || rfq.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>تفاصيل الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الطلب</p>
                <p className="font-medium">
                  {rfq.rfq_date
                    ? format(new Date(rfq.rfq_date), "dd MMM yyyy", { locale: ar })
                    : "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">تاريخ الانتهاء</p>
                <p className="font-medium">
                  {rfq.deadline
                    ? format(new Date(rfq.deadline), "dd MMM yyyy", { locale: ar })
                    : "-"}
                </p>
              </div>
            </div>
            {rfq.description && (
              <div>
                <p className="text-sm text-muted-foreground">الوصف</p>
                <p>{rfq.description}</p>
              </div>
            )}
            {rfq.notes && (
              <div>
                <p className="text-sm text-muted-foreground">ملاحظات</p>
                <p>{rfq.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>الموردين المدعوين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suppliers?.map((s: any) => (
                <div key={s.id} className="p-2 border rounded-md">
                  <p className="font-medium">{s.suppliers?.name}</p>
                  <Badge variant="outline" className="mt-1">
                    {s.status === "invited"
                      ? "تمت الدعوة"
                      : s.status === "quoted"
                      ? "قدم عرض"
                      : s.status}
                  </Badge>
                </div>
              ))}
              {(!suppliers || suppliers.length === 0) && (
                <p className="text-muted-foreground text-center py-4">
                  لا يوجد موردين
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>عروض الأسعار المستلمة</CardTitle>
          <Dialog open={isAddQuoteOpen} onOpenChange={setIsAddQuoteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="ml-2 h-4 w-4" />
                إضافة عرض سعر
              </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>إضافة عرض سعر جديد</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>المورد</Label>
                  <select
                    className="w-full border rounded-md p-2"
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                  >
                    <option value="">-- اختر المورد --</option>
                    {suppliers?.map((s: any) => (
                      <option key={s.supplier_id} value={s.supplier_id}>
                        {s.suppliers?.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>إجمالي العرض</Label>
                  <Input
                    type="number"
                    value={quoteTotal}
                    onChange={(e) => setQuoteTotal(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ملاحظات</Label>
                  <Input
                    value={quoteNotes}
                    onChange={(e) => setQuoteNotes(e.target.value)}
                    placeholder="ملاحظات على العرض"
                  />
                </div>
                <Button
                  onClick={handleAddQuote}
                  disabled={createQuote.isPending}
                  className="w-full"
                >
                  حفظ العرض
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {!quotes?.length ? (
            <p className="text-muted-foreground text-center py-8">
              لم يتم استلام عروض أسعار بعد
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المورد</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">التاريخ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote: any) => (
                  <TableRow key={quote.id}>
                    <TableCell>{quote.suppliers?.name || "-"}</TableCell>
                    <TableCell>
                      {quote.total_amount_fc?.toLocaleString()} {quote.currency_code}
                    </TableCell>
                    <TableCell>
                      {quote.quote_date
                        ? format(new Date(quote.quote_date), "dd MMM yyyy", {
                            locale: ar,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={quote.is_winner ? "default" : "outline"}
                        className={quote.is_winner ? "bg-green-500" : ""}
                      >
                        {quote.is_winner ? "فائز" : quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!quote.is_winner && rfq.status !== "awarded" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSelectWinner(quote.id)}
                            disabled={selectWinner.isPending}
                          >
                            <Trophy className="h-4 w-4" />
                          </Button>
                        )}
                        {quote.is_winner && (
                          <Button
                            size="sm"
                            onClick={() => handleConvertToPO(quote.id)}
                            disabled={convertToPO.isPending}
                          >
                            <FileCheck className="ml-1 h-4 w-4" />
                            تحويل لأمر شراء
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
