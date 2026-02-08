import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";

interface CollectionHistoryProps {
  receiptId: string;
}

export const CollectionHistory = ({ receiptId }: CollectionHistoryProps) => {
  const { data: collections, isLoading } = useQuery({
    queryKey: ["receipt-collections", receiptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("receipt_collections")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("collection_date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">جاري التحميل...</div>;
  }

  if (!collections || collections.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>لا توجد تحصيلات مسجلة بعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          سجل التحصيلات ({collections.length})
        </h3>
        <Badge variant="outline">
          إجمالي: {collections.reduce((sum, c) => sum + c.amount, 0).toLocaleString("ar-SA", {
            minimumFractionDigits: 2,
          })}
        </Badge>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>التاريخ</TableHead>
            <TableHead>المبلغ</TableHead>
            <TableHead>الملاحظات</TableHead>
            <TableHead>تاريخ التسجيل</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {collections.map((collection, index) => (
            <TableRow key={collection.id}>
              <TableCell>{collections.length - index}</TableCell>
              <TableCell>
                {new Date(collection.collection_date).toLocaleDateString("ar-SA")}
              </TableCell>
              <TableCell className="font-semibold text-green-600">
                {collection.amount.toLocaleString("ar-SA", {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {collection.notes || "-"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {new Date(collection.created_at).toLocaleString("ar-SA")}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
