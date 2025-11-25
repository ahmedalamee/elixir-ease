import { z } from "zod";

// مخططات التحقق من المدخلات
// ============================

// التحقق من المنتجات
export const productSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200, "الاسم طويل جداً"),
  name_en: z.string().trim().max(200, "الاسم طويل جداً").optional().nullable(),
  sku: z.string().trim().max(100, "رمز المنتج طويل جداً").optional().nullable(),
  barcode: z.string().trim().max(100, "الباركود طويل جداً").optional().nullable(),
  category_id: z.string().uuid("يجب اختيار تصنيف").optional().nullable(),
  price: z.number().min(0, "السعر يجب أن يكون موجباً"),
  cost_price: z.number().min(0, "سعر التكلفة يجب أن يكون موجباً"),
  quantity: z.number().int().min(0, "الكمية يجب أن تكون موجبة"),
  min_quantity: z.number().int().min(0, "الحد الأدنى يجب أن يكون موجباً"),
});

// التحقق من عناصر المبيعات
export const saleItemSchema = z.object({
  product_id: z.string().uuid("يجب اختيار منتج"),
  quantity: z.number().int().min(1, "الكمية يجب أن تكون على الأقل 1"),
  unit_price: z.number().min(0, "السعر يجب أن يكون موجباً"),
  discount: z.number().min(0, "الخصم يجب أن يكون موجباً").max(100, "الخصم لا يمكن أن يتجاوز 100%"),
  total: z.number().min(0, "المجموع يجب أن يكون موجباً"),
});

// التحقق من المبيعات
export const saleSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  warehouse_id: z.string().uuid().optional().nullable(),
  sale_date: z.date(),
  subtotal: z.number().min(0, "المجموع الفرعي يجب أن يكون موجباً"),
  discount_amount: z.number().min(0, "الخصم يجب أن يكون موجباً"),
  tax_amount: z.number().min(0, "الضريبة يجب أن تكون موجبة"),
  total_amount: z.number().min(0, "المجموع الكلي يجب أن يكون موجباً"),
  final_amount: z.number().min(0, "المبلغ النهائي يجب أن يكون موجباً"),
  payment_method: z.enum(["cash", "card", "credit", "bank_transfer"]),
});

// التحقق من أوامر الشراء
export const purchaseOrderSchema = z.object({
  supplier_id: z.string().uuid("يجب اختيار مورد"),
  warehouse_id: z.string().uuid("يجب اختيار مستودع"),
  expected_date: z.date().optional().nullable(),
  subtotal: z.number().min(0, "المجموع الفرعي يجب أن يكون موجباً"),
  tax_amount: z.number().min(0, "الضريبة يجب أن تكون موجبة"),
  total_amount: z.number().min(0, "المجموع الكلي يجب أن يكون موجباً"),
  exchange_rate: z.number().min(0.01, "سعر الصرف يجب أن يكون أكبر من صفر"),
});

// التحقق من عناصر أوامر الشراء
export const poItemSchema = z.object({
  item_id: z.string().uuid("يجب اختيار منتج"),
  uom_id: z.string().uuid().optional().nullable(),
  qty_ordered: z.number().min(1, "الكمية يجب أن تكون على الأقل 1"),
  price: z.number().min(0, "السعر يجب أن يكون موجباً"),
  discount: z.number().min(0, "الخصم يجب أن يكون موجباً").max(100, "الخصم لا يمكن أن يتجاوز 100%"),
});

// التحقق من فواتير الشراء
export const purchaseInvoiceSchema = z.object({
  supplier_id: z.string().uuid("يجب اختيار مورد"),
  supplier_invoice_no: z.string().trim().min(1, "رقم فاتورة المورد مطلوب").max(100, "الرقم طويل جداً"),
  invoice_date: z.date(),
  due_date: z.date().optional().nullable(),
  subtotal: z.number().min(0, "المجموع الفرعي يجب أن يكون موجباً"),
  discount_amount: z.number().min(0, "الخصم يجب أن يكون موجباً"),
  tax_amount: z.number().min(0, "الضريبة يجب أن تكون موجبة"),
  total_amount: z.number().min(0, "المجموع الكلي يجب أن يكون موجباً"),
  exchange_rate: z.number().min(0.01, "سعر الصرف يجب أن يكون أكبر من صفر"),
});

// التحقق من دفعات المنتجات
export const productBatchSchema = z.object({
  product_id: z.string().uuid("يجب اختيار منتج"),
  batch_number: z.string().trim().min(1, "رقم الدفعة مطلوب").max(100, "الرقم طويل جداً"),
  quantity: z.number().int().min(0, "الكمية يجب أن تكون موجبة"),
  cost_price: z.number().min(0, "سعر التكلفة يجب أن يكون موجباً"),
  expiry_date: z.date().refine(
    (date) => date >= new Date(),
    "تاريخ انتهاء الصلاحية لا يمكن أن يكون في الماضي"
  ),
});

// التحقق من القيود اليومية
export const journalEntrySchema = z.object({
  entry_date: z.date(),
  description: z.string().trim().max(500, "الوصف طويل جداً").optional().nullable(),
  total_debit: z.number().min(0, "المجموع المدين يجب أن يكون موجباً"),
  total_credit: z.number().min(0, "المجموع الدائن يجب أن يكون موجباً"),
}).refine(
  (data) => data.total_debit === data.total_credit,
  "المجموع المدين يجب أن يساوي المجموع الدائن"
);

// التحقق من سطور القيود اليومية
export const journalEntryLineSchema = z.object({
  account_id: z.string().uuid("يجب اختيار حساب"),
  debit_amount: z.number().min(0, "المبلغ المدين يجب أن يكون موجباً"),
  credit_amount: z.number().min(0, "المبلغ الدائن يجب أن يكون موجباً"),
  description: z.string().trim().max(500, "الوصف طويل جداً").optional().nullable(),
}).refine(
  (data) => (data.debit_amount > 0 && data.credit_amount === 0) || (data.debit_amount === 0 && data.credit_amount > 0),
  "يجب إدخال مبلغ في جانب واحد فقط (مدين أو دائن)"
);

// التحقق من العملاء
export const customerSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200, "الاسم طويل جداً"),
  phone: z.string().trim().max(20, "رقم الهاتف طويل جداً").optional().nullable(),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255, "البريد طويل جداً").optional().nullable(),
  address: z.string().trim().max(500, "العنوان طويل جداً").optional().nullable(),
  tax_number: z.string().trim().max(50, "الرقم الضريبي طويل جداً").optional().nullable(),
  credit_limit: z.number().min(0, "حد الائتمان يجب أن يكون موجباً").optional().nullable(),
  loyalty_points: z.number().int().min(0, "نقاط الولاء يجب أن تكون موجبة"),
});

// التحقق من الموردين
export const supplierSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(200, "الاسم طويل جداً"),
  contact_person: z.string().trim().max(200, "اسم جهة الاتصال طويل جداً").optional().nullable(),
  phone: z.string().trim().max(20, "رقم الهاتف طويل جداً").optional().nullable(),
  email: z.string().trim().email("بريد إلكتروني غير صالح").max(255, "البريد طويل جداً").optional().nullable(),
  address: z.string().trim().max(500, "العنوان طويل جداً").optional().nullable(),
  tax_number: z.string().trim().max(50, "الرقم الضريبي طويل جداً").optional().nullable(),
  payment_terms: z.string().trim().max(200, "شروط الدفع طويلة جداً").optional().nullable(),
});

// التحقق من الضرائب
export const taxSchema = z.object({
  tax_code: z.string().trim().min(1, "رمز الضريبة مطلوب").max(20, "الرمز طويل جداً"),
  name: z.string().trim().min(1, "الاسم مطلوب").max(100, "الاسم طويل جداً"),
  rate: z.number().min(0, "نسبة الضريبة يجب أن تكون موجبة").max(100, "نسبة الضريبة لا يمكن أن تتجاوز 100%"),
});

// التحقق من قواعد إعادة الطلب
export const reorderRuleSchema = z.object({
  item_id: z.string().uuid("يجب اختيار منتج"),
  warehouse_id: z.string().uuid("يجب اختيار مستودع"),
  supplier_id: z.string().uuid().optional().nullable(),
  min_qty: z.number().min(0, "الحد الأدنى يجب أن يكون موجباً"),
  reorder_point: z.number().min(0, "نقطة إعادة الطلب يجب أن تكون موجبة"),
  reorder_qty: z.number().min(1, "كمية إعادة الطلب يجب أن تكون على الأقل 1"),
}).refine(
  (data) => data.reorder_point >= data.min_qty,
  "نقطة إعادة الطلب يجب أن تكون أكبر من أو تساوي الحد الأدنى"
);

// التحقق من أسعار المنتجات
export const itemPriceSchema = z.object({
  item_id: z.string().uuid("يجب اختيار منتج"),
  price_list_id: z.string().uuid("يجب اختيار قائمة سعر"),
  uom_id: z.string().uuid().optional().nullable(),
  price: z.number().min(0, "السعر يجب أن يكون موجباً"),
  min_price: z.number().min(0, "الحد الأدنى يجب أن يكون موجباً").optional().nullable(),
  max_price: z.number().min(0, "الحد الأقصى يجب أن يكون موجباً").optional().nullable(),
}).refine(
  (data) => !data.min_price || !data.max_price || data.min_price <= data.max_price,
  "الحد الأدنى يجب أن يكون أقل من أو يساوي الحد الأقصى"
);

// دالة مساعدة للتحقق من المدخلات
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: boolean; data?: T; errors?: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return {
      success: false,
      errors: ["خطأ في التحقق من البيانات"]
    };
  }
}
