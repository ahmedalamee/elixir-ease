import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIGS: Record<string, StatusConfig> = {
  // PR statuses
  draft: { label: "مسودة", className: "bg-muted text-muted-foreground" },
  submitted: { label: "مقدم", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  approved: { label: "معتمد", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  rejected: { label: "مرفوض", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  converted_to_rfq: { label: "تم التحويل إلى RFQ", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  converted_to_po: { label: "تم التحويل إلى PO", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" },
  cancelled: { label: "ملغي", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  
  // RFQ statuses
  open: { label: "مفتوح", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  closed: { label: "مغلق", className: "bg-muted text-muted-foreground" },
  awarded: { label: "تم الترسية", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  
  // Quote statuses
  pending: { label: "قيد الانتظار", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  received: { label: "تم الاستلام", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  selected: { label: "تم الاختيار", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  winner: { label: "الفائز", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  
  // PO statuses
  partial: { label: "جزئي", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  completed: { label: "مكتمل", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  
  // Approval statuses
  in_progress: { label: "قيد المعالجة", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIGS[status] || { 
    label: status, 
    className: "bg-muted text-muted-foreground" 
  };

  return (
    <Badge 
      variant="secondary" 
      className={cn("font-normal", config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
