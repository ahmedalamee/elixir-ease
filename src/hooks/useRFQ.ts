import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchRFQRequests,
  fetchRFQById,
  fetchRFQSuppliers,
  fetchRFQQuotes,
  fetchQuoteItems,
  createRFQRequest,
  addRFQSuppliers,
  createRFQQuote,
  createQuoteItems,
  selectWinningQuote,
  convertQuoteToPO,
  generateRFQNumber,
  RFQRequest,
  RFQQuote,
} from "@/services/purchasingApi";

export function useRFQRequests(filters?: {
  status?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["rfq-requests", filters],
    queryFn: () => fetchRFQRequests(filters),
  });
}

export function useRFQ(id: string | undefined) {
  return useQuery({
    queryKey: ["rfq", id],
    queryFn: () => (id ? fetchRFQById(id) : null),
    enabled: !!id,
  });
}

export function useRFQSuppliers(rfqId: string | undefined) {
  return useQuery({
    queryKey: ["rfq-suppliers", rfqId],
    queryFn: () => (rfqId ? fetchRFQSuppliers(rfqId) : []),
    enabled: !!rfqId,
  });
}

export function useRFQQuotes(rfqId: string | undefined) {
  return useQuery({
    queryKey: ["rfq-quotes", rfqId],
    queryFn: () => (rfqId ? fetchRFQQuotes(rfqId) : []),
    enabled: !!rfqId,
  });
}

export function useQuoteItems(quoteId: string | undefined) {
  return useQuery({
    queryKey: ["quote-items", quoteId],
    queryFn: () => (quoteId ? fetchQuoteItems(quoteId) : []),
    enabled: !!quoteId,
  });
}

export function useGenerateRFQNumber() {
  return useQuery({
    queryKey: ["generate-rfq-number"],
    queryFn: generateRFQNumber,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCreateRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ rfq, supplierIds }: { rfq: Partial<RFQRequest>; supplierIds: string[] }) => {
      const created = await createRFQRequest(rfq);
      if (supplierIds.length > 0) {
        await addRFQSuppliers(created.id, supplierIds);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-requests"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      toast.success("تم إنشاء طلب عرض الأسعار بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء طلب عرض الأسعار: ${error.message}`);
    },
  });
}

interface QuoteItemInput {
  product_id: string;
  quantity: number;
  unit_price_fc: number;
  uom_id?: string | null;
  line_total_fc?: number;
  line_total_bc?: number;
  notes?: string | null;
}

export function useCreateQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quote, items }: { quote: Partial<RFQQuote>; items: QuoteItemInput[] }) => {
      const created = await createRFQQuote(quote);
      if (items.length > 0) {
        await createQuoteItems(items.map(item => ({ ...item, quote_id: created.id })));
      }
      return created;
    },
    onSuccess: (_, { quote }) => {
      queryClient.invalidateQueries({ queryKey: ["rfq-quotes", quote.rfq_id] });
      queryClient.invalidateQueries({ queryKey: ["rfq-suppliers", quote.rfq_id] });
      toast.success("تم إضافة عرض السعر بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إضافة عرض السعر: ${error.message}`);
    },
  });
}

export function useSelectWinner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: selectWinningQuote,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rfq-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["rfq-requests"] });
      toast.success("تم اختيار العرض الفائز بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في اختيار الفائز: ${error.message}`);
    },
  });
}

export function useConvertQuoteToPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: convertQuoteToPO,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["rfq-requests"] });
        queryClient.invalidateQueries({ queryKey: ["rfq-quotes"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast.success("تم تحويل العرض إلى أمر شراء بنجاح");
      } else {
        toast.error(result.message || "خطأ في التحويل");
      }
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحويل العرض: ${error.message}`);
    },
  });
}
