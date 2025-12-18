import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchApprovalRequests,
  fetchApprovalRequestById,
  fetchApprovalHistory,
  approveStep,
  rejectApprovalRequest,
  ApprovalRequest,
} from "@/services/purchasingApi";

export function useApprovalRequests(filters?: {
  status?: string;
  documentType?: string;
}) {
  return useQuery({
    queryKey: ["approval-requests", filters],
    queryFn: () => fetchApprovalRequests(filters),
  });
}

export function useApprovalRequest(id: string | undefined) {
  return useQuery({
    queryKey: ["approval-request", id],
    queryFn: () => (id ? fetchApprovalRequestById(id) : null),
    enabled: !!id,
  });
}

export function useApprovalHistory(requestId: string | undefined) {
  return useQuery({
    queryKey: ["approval-history", requestId],
    queryFn: () => (requestId ? fetchApprovalHistory(requestId) : []),
    enabled: !!requestId,
  });
}

export function useApproveStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, comments }: { requestId: string; comments?: string }) =>
      approveStep(requestId, comments),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast.success("تمت الموافقة بنجاح");
      } else {
        toast.error(result.message || "خطأ في الموافقة");
      }
    },
    onError: (error: Error) => {
      toast.error(`خطأ في الموافقة: ${error.message}`);
    },
  });
}

export function useRejectApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ requestId, reason }: { requestId: string; reason: string }) =>
      rejectApprovalRequest(requestId, reason),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ["approval-requests"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-requisitions"] });
        queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
        toast.success("تم الرفض بنجاح");
      } else {
        toast.error(result.message || "خطأ في الرفض");
      }
    },
    onError: (error: Error) => {
      toast.error(`خطأ في الرفض: ${error.message}`);
    },
  });
}
