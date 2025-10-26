import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Edit, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const SalesInvoices = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">فواتير المبيعات</CardTitle>
          <Button onClick={() => navigate("/sales/new-invoice")}>
            <Plus className="ml-2 h-4 w-4" />
            فاتورة جديدة
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-4">لا توجد فواتير مبيعات حالياً</p>
            <p className="text-sm">قم بإنشاء فاتورة جديدة للبدء</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesInvoices;
