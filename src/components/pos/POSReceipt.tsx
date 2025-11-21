import { forwardRef } from "react";

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  discount?: number;
  total: number;
}

interface ReceiptProps {
  invoiceNumber: string;
  invoiceDate: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: string;
  customerName?: string;
  companyInfo?: {
    name: string;
    name_en?: string;
    tax_number?: string;
    address?: string;
    phone?: string;
  };
}

const formatArabicDate = (value: string | null | undefined): string => {
  if (!value) return new Date().toLocaleDateString("ar-SA");
  const date = new Date(value);
  return isNaN(date.getTime())
    ? new Date().toLocaleDateString("ar-SA")
    : date.toLocaleDateString("ar-SA");
};

export const POSReceipt = forwardRef<HTMLDivElement, ReceiptProps>(
  (
    {
      invoiceNumber,
      invoiceDate,
      items,
      subtotal,
      discount,
      taxAmount,
      totalAmount,
      paymentMethod,
      customerName,
      companyInfo,
    },
    ref
  ) => {
    return (
      <div ref={ref} className="receipt-print p-8 bg-white text-black" style={{ width: "80mm" }}>
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .receipt-print, .receipt-print * {
              visibility: visible;
            }
            .receipt-print {
              position: absolute;
              left: 0;
              top: 0;
              width: 80mm;
            }
          }
        `}</style>

        {/* Company Header */}
        <div className="text-center mb-4 border-b-2 border-black pb-4">
          <h1 className="text-xl font-bold">{companyInfo?.name || "اسم الشركة"}</h1>
          {companyInfo?.name_en && (
            <p className="text-sm">{companyInfo.name_en}</p>
          )}
          {companyInfo?.tax_number && (
            <p className="text-xs">الرقم الضريبي: {companyInfo.tax_number}</p>
          )}
          {companyInfo?.phone && (
            <p className="text-xs">هاتف: {companyInfo.phone}</p>
          )}
        </div>

        {/* Invoice Info */}
        <div className="mb-4 text-sm">
          <div className="flex justify-between">
            <span>رقم الفاتورة:</span>
            <span className="font-bold">{invoiceNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>التاريخ:</span>
            <span>{formatArabicDate(invoiceDate)}</span>
          </div>
          {customerName && (
            <div className="flex justify-between">
              <span>العميل:</span>
              <span className="font-bold">{customerName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>طريقة الدفع:</span>
            <span>{paymentMethod}</span>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-xs mb-4">
          <thead className="border-t-2 border-b-2 border-black">
            <tr>
              <th className="text-right py-2">الصنف</th>
              <th className="text-center">الكمية</th>
              <th className="text-center">السعر</th>
              <th className="text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="border-b">
                <td className="text-right py-2">{item.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-center">{item.price.toFixed(2)}</td>
                <td className="text-left">{item.total.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="border-t-2 border-black pt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span>{subtotal.toFixed(2)} ر.س</span>
          </div>
          {discount && discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>الخصم:</span>
              <span>-{discount.toFixed(2)} ر.س</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>الضريبة:</span>
            <span>{taxAmount.toFixed(2)} ر.س</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t pt-2">
            <span>الإجمالي الكلي:</span>
            <span>{totalAmount.toFixed(2)} ر.س</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs border-t-2 border-black pt-4">
          <p className="font-bold mb-2">شكراً لزيارتكم</p>
          <p>فاتورة ضريبية مبسطة</p>
          <p className="mt-2">Simplified Tax Invoice</p>
        </div>
      </div>
    );
  }
);

POSReceipt.displayName = "POSReceipt";
