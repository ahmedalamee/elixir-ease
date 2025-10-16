import { z } from 'zod';

export const productSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'اسم المنتج مطلوب')
    .max(200, 'اسم المنتج يجب أن يكون أقل من 200 حرف'),
  
  name_en: z.string()
    .trim()
    .max(200, 'الاسم الإنجليزي يجب أن يكون أقل من 200 حرف')
    .optional()
    .nullable(),
  
  barcode: z.string()
    .trim()
    .regex(/^[0-9]{8,13}$/, 'الباركود يجب أن يكون من 8-13 رقم')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  price: z.number()
    .positive('السعر يجب أن يكون موجب')
    .max(999999, 'السعر كبير جداً')
    .multipleOf(0.01, 'السعر يجب أن يحتوي على رقمين عشريين كحد أقصى'),
  
  cost_price: z.number()
    .positive('سعر التكلفة يجب أن يكون موجب')
    .max(999999, 'سعر التكلفة كبير جداً'),
  
  quantity: z.number()
    .int('الكمية يجب أن تكون رقم صحيح')
    .min(0, 'الكمية لا يمكن أن تكون سالبة')
    .max(1000000, 'الكمية كبيرة جداً'),
  
  min_quantity: z.number()
    .int('الحد الأدنى للكمية يجب أن يكون رقم صحيح')
    .min(1, 'الحد الأدنى للكمية يجب أن يكون على الأقل 1')
    .max(10000, 'الحد الأدنى للكمية كبير جداً'),
  
  expiry_date: z.string()
    .refine((date) => {
      if (!date) return true;
      const expiry = new Date(date);
      const now = new Date();
      const maxFuture = new Date();
      maxFuture.setFullYear(maxFuture.getFullYear() + 10);
      return expiry > now && expiry < maxFuture;
    }, 'تاريخ الانتهاء يجب أن يكون بين الآن و 10 سنوات في المستقبل')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  description: z.string()
    .trim()
    .max(1000, 'الوصف يجب أن يكون أقل من 1000 حرف')
    .optional()
    .nullable(),
});

export const customerSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'اسم العميل مطلوب')
    .max(100, 'الاسم يجب أن يكون أقل من 100 حرف'),
  
  phone: z.string()
    .regex(/^[+]?[0-9]{10,15}$/, 'رقم الهاتف غير صحيح')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  email: z.string()
    .email('البريد الإلكتروني غير صحيح')
    .max(255, 'البريد الإلكتروني طويل جداً')
    .optional()
    .nullable()
    .or(z.literal('')),
  
  address: z.string()
    .max(500, 'العنوان طويل جداً')
    .optional()
    .nullable(),
  
  credit_limit: z.number()
    .min(0, 'الحد الائتماني لا يمكن أن يكون سالب')
    .max(1000000, 'الحد الائتماني كبير جداً'),
});

export const saleItemSchema = z.object({
  product_id: z.string().uuid('معرف المنتج غير صحيح'),
  quantity: z.number()
    .int('الكمية يجب أن تكون رقم صحيح')
    .positive('الكمية يجب أن تكون موجبة')
    .max(10000, 'الكمية كبيرة جداً'),
  unit_price: z.number()
    .positive('السعر يجب أن يكون موجب'),
});
