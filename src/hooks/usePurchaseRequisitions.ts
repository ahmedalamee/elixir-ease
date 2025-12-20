import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchPurchaseRequisitions,
  fetchPurchaseRequisitionById,
  fetchPRItems,
  createPurchaseRequisition,
  updatePurchaseRequisition,
  createPRItems,
  deletePRItems,
  submitPR,
  convertPRToRFQ,
  convertPRToPO,
  generatePRNumber,
  PurchaseRequisition,
} from "@/services/purchasingApi";

export function usePurchaseRequisitions(filters?: {
  status?: string;
  warehouseId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: ["purchase-requisitions", filters],
    queryFn: () => fetchPurchaseRequisitions(filters),
  });
}

export function usePurchaseRequisition(id: string | undefined) {
  return useQuery({
    queryKey: ["purchase-requisition", id],
    queryFn: () => (id ? fetchPurchaseRequisitionById(id) : null),
    enabled: !!id,
  });
}

export function usePRItems(prId: string | undefined) {
  return useQuery({
    queryKey: ["pr-items", prId],
    queryFn: () => (prId ? fetchPRItems(prId) : []),
    enabled: !!prId,
  });
}

export function useGeneratePRNumber() {
  return useQuery({
    queryKey: ["generate-pr-number"],
    queryFn: generatePRNumber,
    staleTime: 0,
    gcTime: 0,
  });
}

export interface PRItemInput {
  product_id: string;
  requested_qty: number;
  uom_id?: string | null;
  estimated_unit_cost_fc?: number | null;
  line_total_fc?: number;
  line_total_bc?: number;
  notes?: string | null;
}

export function useCreatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pr, items }: { pr: Partial<PurchaseRequisition>; items: PRItemInput[] }) => {
      const created = await createPurchaseRequisition(pr);
      if (items.length > 0) {
        await createPRItems(items.map(item => ({ ...item, pr_id: created.id })));
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      toast.success("تم إنشاء طلب الشراء بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في إنشاء طلب الشراء: ${error.message}`);
    },
  });
}

export function useUpdatePurchaseRequisition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, pr, items }: { id: string; pr: Partial<PurchaseRequisition>; items: PRItemInput[] }) => {
      await updatePurchaseRequisition(id, pr);
      await deletePRItems(id);
      if (items.length > 0) {
        await createPRItems(items.map(item => ({ ...item, pr_id: id })));
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-requisition", id] });
      queryClient.invalidateQueries({ queryKey: ["pr-items", id] });
      toast.success("تم تحديث طلب الشراء بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحديث طلب الشراء: ${error.message}`);
    },
  });
}

export function useSubmitPR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: submitPR,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
      toast.success("تم تقديم طلب الشراء بنجاح");
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تقديم طلب الشراء: ${error.message}`);
    },
  });
}

export function useConvertPRToRFQ() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: convertPRToRFQ,
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
        queryClient.invalidateQueries({ queryKey: ["rfq-requests"] });
        toast.success("تم تحويل طلب الشراء إلى RFQ بنجاح");
      } else {
        toast.error(result.message || "خطأ في التحويل");
      }
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحويل طلب الشراء: ${error.message}`);
    },
  });
}

export function useConvertPRToPO() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ prId, supplierId }: { prId: string; supplierId: string }) => 
      convertPRToPO(prId, supplierId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast.success("تم تحويل طلب الشراء إلى أمر شراء بنجاح");
      } else {
        toast.error(result.message || "خطأ في التحويل");
      }
    },
    onError: (error: Error) => {
      toast.error(`خطأ في تحويل طلب الشراء: ${error.message}`);
    },
  });
}
