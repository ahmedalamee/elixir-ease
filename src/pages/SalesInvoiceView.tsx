import { useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, Download, CheckCircle, Loader2 } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { toast } from "sonner";

const formatArabicDate = (value: string | null | undefined): string => {
  if (!value) return new Date().toLocaleDateString("ar-SA");
  const date = new Date(value);
  return isNaN(date.getTime())
    ? new Date().toLocaleDateString("ar-SA")
    : date.toLocaleDateString("ar-SA");
};

const SalesInvoiceView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);
  const shouldPrint = searchParams.get("print") === "true";

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["sales-invoice", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("sales_invoices")
        .select(`
          *,
          customers (*),
          warehouses (name),
          payment_methods (name),
          sales_invoice_items (
            *,
            products (name),
            uoms (name)
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as any;
    },
    enabled: !!id,
  });

  const { data: companyBranding } = useQuery({
    queryKey: ["company-branding"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_branding")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as any;
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `فاتورة-${invoice?.invoice_number}`,
  });

  // Post invoice mutation
  const postInvoiceMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("post_sales_invoice", {
        p_invoice_id: id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("تم ترحيل الفاتورة بنجاح");
      queryClient.invalidateQueries({ queryKey: ["sales-invoice", id] });
    },
    onError: (error: any) => {
      console.error("Error posting invoice:", error);
      toast.error(error.message || "حدث خطأ أثناء ترحيل الفاتورة");
    },
  });

  const handlePostInvoice = () => {
    if (confirm("هل أنت متأكد من ترحيل هذه الفاتورة؟ سيتم تحديث المخزون ورصيد العميل.")) {
      postInvoiceMutation.mutate();
    }
  };

  useEffect(() => {
    if (shouldPrint && invoice && companyBranding && handlePrint) {
      // Auto-print when the page loads with print=true parameter
      setTimeout(() => {
        if (handlePrint) {
          handlePrint();
        }
      }, 500);
    }
  }, [shouldPrint, invoice, companyBranding]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6" dir="rtl">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-destructive">لم يتم العثور على الفاتورة</p>
            <Button className="mt-4" onClick={() => navigate("/sales/invoices")}>
              العودة للقائمة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6" dir="rtl">
      {/* الأزرار */}
      <div className="flex gap-2 mb-4 no-print">
        <Button variant="outline" onClick={() => navigate("/sales/invoices")}>
          <ArrowLeft className="ml-2 h-4 w-4" />
          رجوع
        </Button>
        {invoice.status === "draft" && (
          <Button 
            onClick={handlePostInvoice}
            disabled={postInvoiceMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {postInvoiceMutation.isPending ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="ml-2 h-4 w-4" />
            )}
            ترحيل الفاتورة
          </Button>
        )}
        <Button onClick={handlePrint}>
          <Printer className="ml-2 h-4 w-4" />
          طباعة
        </Button>
        <Button variant="outline">
          <Download className="ml-2 h-4 w-4" />
          تحميل PDF
        </Button>
      </div>

      {/* محتوى الفاتورة للطباعة */}
      <div ref={printRef} className="bg-white p-8" dir="rtl">
        {/* رأس الفاتورة */}
        <div className="border-b-2 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              {companyBranding?.company_logo_url && (
                <img 
                  src={companyBranding.company_logo_url} 
                  alt="Company Logo" 
                  className="h-16 mb-4"
                />
              )}
              <h1 className="text-3xl font-bold mb-2">
                {companyBranding?.company_name || "اسم الشركة"}
              </h1>
              {companyBranding?.company_name_en && (
                <p className="text-lg text-muted-foreground">{companyBranding.company_name_en}</p>
              )}
              <p className="text-muted-foreground">{companyBranding?.company_address}</p>
              <p className="text-muted-foreground">{companyBranding?.company_phone}</p>
              <p className="text-muted-foreground">{companyBranding?.company_email}</p>
              {companyBranding?.tax_number && (
                <p className="text-muted-foreground">
                  الرقم الضريبي: {companyBranding.tax_number}
                </p>
              )}
              {companyBranding?.commercial_register && (
                <p className="text-muted-foreground">
                  السجل التجاري: {companyBranding.commercial_register}
                </p>
              )}
            </div>
            <div className="text-left">
              <h2 className="text-2xl font-bold mb-4">فاتورة مبيعات</h2>
              <div className="space-y-1">
                <div className="flex gap-2">
                  <span className="font-medium">رقم الفاتورة:</span>
                  <span>{invoice.invoice_number}</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-medium">التاريخ:</span>
                  <span>{formatArabicDate(invoice.invoice_date)}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex gap-2">
                    <span className="font-medium">تاريخ الاستحقاق:</span>
                    <span>{formatArabicDate(invoice.due_date)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* معلومات العميل */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">معلومات العميل</h3>
          <div className="bg-muted p-4 rounded-lg">
            <p className="font-medium text-lg">{invoice.customers?.name}</p>
            {invoice.customers?.phone && <p>الهاتف: {invoice.customers.phone}</p>}
            {invoice.customers?.email && <p>البريد: {invoice.customers.email}</p>}
            {invoice.customers?.address && <p>العنوان: {invoice.customers.address}</p>}
            {invoice.customers?.tax_number && (
              <p>الرقم الضريبي: {invoice.customers.tax_number}</p>
            )}
          </div>
        </div>

        {/* بنود الفاتورة */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>المنتج/الخدمة</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-center">الوحدة</TableHead>
              <TableHead className="text-left">السعر</TableHead>
              <TableHead className="text-left">الخصم</TableHead>
              <TableHead className="text-left">المبلغ</TableHead>
              <TableHead className="text-left">الضريبة</TableHead>
              <TableHead className="text-left">الإجمالي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.sales_invoice_items?.map((item: any, index: number) => {
              const itemSubtotal = item.quantity * item.unit_price;
              const itemAfterDiscount = itemSubtotal - item.discount_amount;
              
              return (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.products?.name}</div>
                      {item.batch_number && (
                        <div className="text-sm text-muted-foreground">دفعة: {item.batch_number}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-center">{item.uoms?.name || "قطعة"}</TableCell>
                  <TableCell className="text-left">{item.unit_price.toFixed(2)}</TableCell>
                  <TableCell className="text-left">
                    {item.discount_amount > 0 ? (
                      <div>
                        <div>{item.discount_percentage}%</div>
                        <div className="text-sm text-muted-foreground">
                          ({item.discount_amount.toFixed(2)} ر.س)
                        </div>
                      </div>
                    ) : "-"}
                  </TableCell>
                  <TableCell className="text-left font-medium">
                    {itemAfterDiscount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-left">
                    {item.tax_percentage}% ({item.tax_amount.toFixed(2)})
                  </TableCell>
                  <TableCell className="text-left font-bold">
                    {item.line_total.toFixed(2)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* الإجماليات */}
        <div className="mt-6 flex justify-end">
          <div className="w-full md:w-1/3 space-y-2">
            <div className="flex justify-between py-2">
              <span>المجموع الفرعي:</span>
              <span className="font-medium">{invoice.subtotal.toFixed(2)} ر.س</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between py-2">
                <span>الخصم:</span>
                <span className="font-medium text-red-600">
                  -{invoice.discount_amount.toFixed(2)} ر.س
                </span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span>الضريبة ({invoice.subtotal > 0 ? ((invoice.tax_amount / invoice.subtotal) * 100).toFixed(0) : "0"}%):</span>
              <span className="font-medium">{invoice.tax_amount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between py-3 border-t-2 border-foreground">
              <span className="text-lg font-bold">الإجمالي:</span>
              <span className="text-lg font-bold">{invoice.total_amount.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between py-2 text-green-600">
              <span>المدفوع:</span>
              <span className="font-medium">{invoice.paid_amount?.toFixed(2) || '0.00'} ر.س</span>
            </div>
            <div className="flex justify-between py-2 text-orange-600 font-semibold">
              <span>المتبقي:</span>
              <span className="font-bold">
                {(invoice.total_amount - (invoice.paid_amount || 0)).toFixed(2)} ر.س
              </span>
            </div>
          </div>
        </div>

        {/* طريقة الدفع وشروط الدفع */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {invoice.payment_methods && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">طريقة الدفع:</h4>
              <p className="text-sm">{invoice.payment_methods.name}</p>
            </div>
          )}
          {invoice.payment_terms && (
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold mb-2">شروط الدفع:</h4>
              <p className="text-sm">{invoice.payment_terms}</p>
            </div>
          )}
        </div>

        {/* الملاحظات */}
        {invoice.notes && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-semibold mb-2">ملاحظات:</h4>
            <p className="text-sm">{invoice.notes}</p>
          </div>
        )}

        {/* تذييل الفاتورة */}
        {companyBranding?.invoice_footer_note && (
          <div className="mt-6 text-center text-muted-foreground">
            <p>{companyBranding.invoice_footer_note}</p>
            {companyBranding?.invoice_footer_note_en && (
              <p className="text-sm mt-1">{companyBranding.invoice_footer_note_en}</p>
            )}
          </div>
        )}

        {/* التوقيع */}
        <div className="mt-12 grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="border-t-2 border-foreground pt-2 mt-16">
              <p className="font-medium">توقيع المستلم</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-foreground pt-2 mt-16">
              <p className="font-medium">توقيع المعتمد</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceView;
