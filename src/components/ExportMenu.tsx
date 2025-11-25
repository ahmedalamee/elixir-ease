import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ExportMenuProps {
  data: any;
  fileName: string;
  disabled?: boolean;
}

export const ExportMenu = ({ data, fileName, disabled }: ExportMenuProps) => {
  const { toast } = useToast();

  const exportToCSV = () => {
    if (!data) {
      toast({
        title: "خطأ",
        description: "لا توجد بيانات للتصدير",
        variant: "destructive",
      });
      return;
    }

    try {
      let csvContent = "";

      if (Array.isArray(data)) {
        // Extract headers from first object
        const headers = Object.keys(data[0] || {});
        csvContent = headers.join(",") + "\n";

        // Add rows
        data.forEach((row) => {
          const values = headers.map((header) => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csvContent += values.join(",") + "\n";
        });
      } else if (typeof data === "object") {
        // Handle object data
        Object.entries(data).forEach(([key, value]) => {
          csvContent += `${key},${value}\n`;
        });
      }

      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `${fileName}.csv`);
      link.click();

      toast({
        title: "تم التصدير",
        description: "تم تصدير البيانات إلى CSV بنجاح",
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تصدير البيانات",
        variant: "destructive",
      });
    }
  };

  const exportToExcel = () => {
    toast({
      title: "قريباً",
      description: "ميزة التصدير إلى Excel قيد التطوير",
    });
  };

  const exportToPDF = () => {
    toast({
      title: "قريباً",
      description: "ميزة التصدير إلى PDF قيد التطوير",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <Download className="ml-2 h-4 w-4" />
          تصدير
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>تصدير كـ</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="ml-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="ml-2 h-4 w-4" />
          Excel (قريباً)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="ml-2 h-4 w-4" />
          PDF (قريباً)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handlePrint}>
          <Printer className="ml-2 h-4 w-4" />
          طباعة
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
