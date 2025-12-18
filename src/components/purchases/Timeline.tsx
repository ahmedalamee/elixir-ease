import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Check, X, Clock, FileText, Send, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string;
  status: string;
  date: string;
  user?: string;
  notes?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  submitted: <Send className="h-4 w-4" />,
  approved: <Check className="h-4 w-4" />,
  rejected: <X className="h-4 w-4" />,
  converted_to_rfq: <ArrowRight className="h-4 w-4" />,
  converted_to_po: <ArrowRight className="h-4 w-4" />,
  cancelled: <X className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted border-muted-foreground/30",
  submitted: "bg-blue-100 border-blue-500 dark:bg-blue-900",
  approved: "bg-green-100 border-green-500 dark:bg-green-900",
  rejected: "bg-red-100 border-red-500 dark:bg-red-900",
  converted_to_rfq: "bg-purple-100 border-purple-500 dark:bg-purple-900",
  converted_to_po: "bg-indigo-100 border-indigo-500 dark:bg-indigo-900",
  cancelled: "bg-red-100 border-red-500 dark:bg-red-900",
  pending: "bg-yellow-100 border-yellow-500 dark:bg-yellow-900",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "إنشاء المسودة",
  submitted: "تقديم الطلب",
  approved: "اعتماد",
  rejected: "رفض",
  converted_to_rfq: "تحويل إلى RFQ",
  converted_to_po: "تحويل إلى PO",
  cancelled: "إلغاء",
  pending: "قيد الانتظار",
};

export function Timeline({ events, className }: TimelineProps) {
  if (!events || events.length === 0) {
    return (
      <div className={cn("text-muted-foreground text-sm", className)}>
        لا يوجد سجل
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="absolute right-3 top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={event.id || index} className="relative flex gap-4">
            <div
              className={cn(
                "relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2",
                STATUS_COLORS[event.status] || "bg-muted border-muted-foreground/30"
              )}
            >
              {STATUS_ICONS[event.status] || <Clock className="h-3 w-3" />}
            </div>
            <div className="flex-1 pt-0.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {STATUS_LABELS[event.status] || event.status}
                </p>
                <time className="text-xs text-muted-foreground">
                  {format(new Date(event.date), "yyyy/MM/dd HH:mm", { locale: ar })}
                </time>
              </div>
              {event.user && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  بواسطة: {event.user}
                </p>
              )}
              {event.notes && (
                <p className="text-sm text-muted-foreground mt-1">
                  {event.notes}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
