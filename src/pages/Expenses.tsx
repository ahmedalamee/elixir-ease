import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const Expenses = () => {
  return (
    <div className="container mx-auto p-6" dir="rtl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl">إدارة المصروفات</CardTitle>
          <Button>
            <Plus className="ml-2 h-4 w-4" />
            مصروف جديد
          </Button>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-4">لا توجد مصروفات مسجلة حالياً</p>
            <p className="text-sm">قم بإضافة مصروف جديد للبدء</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Expenses;
