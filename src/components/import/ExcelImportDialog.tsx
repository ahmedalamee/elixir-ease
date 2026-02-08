import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ExcelJS from "exceljs";

export interface ColumnMapping {
  excelColumn: string;
  dbColumn: string;
  required: boolean;
  type: "string" | "number" | "date" | "boolean";
  label: string;
  isKey?: boolean; // Used for upsert - identifies the unique key column
}

interface ExcelImportDialogProps {
  title: string;
  description: string;
  columns: ColumnMapping[];
  onImport: (data: Record<string, any>[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  onExport?: () => Promise<Record<string, any>[]>;
  templateFileName: string;
  triggerButton?: React.ReactNode;
  allowUpdate?: boolean; // Enable update mode for existing records
}

export const ExcelImportDialog = ({
  title,
  description,
  columns,
  onImport,
  onExport,
  templateFileName,
  triggerButton,
  allowUpdate = false,
}: ExcelImportDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);
    setImportResult(null);

    try {
      const data = await readExcelFile(selectedFile);
      setParsedData(data);
    } catch (error: any) {
      setErrors([error.message]);
      setParsedData([]);
    }
  };

  const readExcelFile = async (file: File): Promise<Record<string, any>[]> => {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);
    
    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new Error("الملف فارغ أو لا يحتوي على بيانات");
    }

    // Get headers from first row
    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = String(cell.value || "").trim();
    });

    const mappedData: Record<string, any>[] = [];
    const validationErrors: string[] = [];

    // Process data rows (starting from row 2)
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
      const row = worksheet.getRow(rowNumber);
      
      // Skip empty rows
      let hasValue = false;
      row.eachCell(() => { hasValue = true; });
      if (!hasValue) continue;

      const mappedRow: Record<string, any> = {};
      let rowHasError = false;

      columns.forEach((col) => {
        const excelIndex = headers.findIndex(
          (h) => h.toLowerCase() === col.excelColumn.toLowerCase()
        );
        
        let value: any = excelIndex >= 0 ? row.getCell(excelIndex + 1).value : undefined;

        // Handle ExcelJS cell value types
        if (value !== undefined && value !== null && value !== "") {
          // Handle rich text
          if (typeof value === "object" && "richText" in value) {
            value = value.richText.map((t: any) => t.text).join("");
          }
          // Handle formula results
          if (typeof value === "object" && "result" in value) {
            value = value.result;
          }
          // Handle hyperlinks
          if (typeof value === "object" && "text" in value) {
            value = value.text;
          }

          if (col.type === "number") {
            value = parseFloat(String(value));
            if (isNaN(value)) {
              validationErrors.push(`صف ${rowNumber}: قيمة غير صالحة في عمود "${col.label}"`);
              rowHasError = true;
              value = 0;
            }
          } else if (col.type === "boolean") {
            value = value === true || value === "نعم" || value === "yes" || value === "1" || value === 1;
          } else if (col.type === "date") {
            // Handle Date objects from ExcelJS
            if (value instanceof Date) {
              value = value.toISOString().split("T")[0];
            } else if (typeof value === "number") {
              // Excel serial date number
              const date = new Date((value - 25569) * 86400 * 1000);
              value = date.toISOString().split("T")[0];
            }
          } else {
            value = String(value).trim();
          }
        }

        // Required validation
        if (col.required && (value === undefined || value === null || value === "")) {
          validationErrors.push(`صف ${rowNumber}: الحقل "${col.label}" مطلوب`);
          rowHasError = true;
        }

        mappedRow[col.dbColumn] = value;
      });

      if (!rowHasError) {
        mappedData.push(mappedRow);
      }
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors.slice(0, 10)); // Show first 10 errors
    }

    return mappedData;
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsImporting(true);
    setProgress(0);

    try {
      const result = await onImport(parsedData);
      setImportResult({ success: result.success, failed: result.failed });
      
      if (result.errors.length > 0) {
        setErrors(result.errors.slice(0, 10));
      }

      if (result.success > 0) {
        toast({
          title: "تم الاستيراد بنجاح",
          description: `تم استيراد ${result.success} سجل بنجاح${result.failed > 0 ? ` وفشل ${result.failed} سجل` : ""}`,
        });
      }

      setProgress(100);
    } catch (error: any) {
      toast({
        title: "فشل الاستيراد",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Template");

    // Add headers
    const headers = columns.map((col) => col.excelColumn);
    worksheet.addRow(headers);

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add sample row
    const sampleRow = columns.map((col) => {
      if (col.type === "number") return 0;
      if (col.type === "boolean") return "نعم";
      if (col.type === "date") return "2025-01-01";
      return col.required ? "مطلوب" : "";
    });
    worksheet.addRow(sampleRow);

    // Auto-width columns
    worksheet.columns.forEach((column) => {
      column.width = 15;
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { 
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = templateFileName;
    link.click();
  };

  const handleExport = async () => {
    if (!onExport) return;
    
    try {
      const data = await onExport();
      if (data.length === 0) {
        toast({
          title: "لا توجد بيانات",
          description: "لا توجد بيانات للتصدير",
          variant: "destructive",
        });
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Data");

      // Add headers
      const headers = columns.map((col) => col.excelColumn);
      worksheet.addRow(headers);

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add data rows
      data.forEach((item) => {
        const row = columns.map((col) => {
          const value = item[col.dbColumn];
          if (value === null || value === undefined) return "";
          if (col.type === "boolean") return value ? "نعم" : "لا";
          if (col.type === "date" && value) {
            return new Date(value).toISOString().split("T")[0];
          }
          return value;
        });
        worksheet.addRow(row);
      });

      // Auto-width columns
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });

      // Generate and download file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = templateFileName.replace("_template", "_export");
      link.click();

      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${data.length} سجل`,
      });
    } catch (error: any) {
      toast({
        title: "فشل التصدير",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setErrors([]);
    setImportResult(null);
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetDialog(); }}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" className="gap-2">
            <Upload className="h-4 w-4" />
            استيراد من Excel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download & Export */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">قالب Excel</p>
              <p className="text-sm text-muted-foreground">
                {onExport 
                  ? "قم بتصدير البيانات الحالية للتعديل، أو حمّل قالب فارغ"
                  : "قم بتحميل القالب وملئه بالبيانات ثم رفعه"
                }
              </p>
              {allowUpdate && (
                <p className="text-xs text-blue-600 mt-1">
                  💡 سيتم تحديث السجلات الموجودة تلقائياً بناءً على المفتاح الفريد
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {onExport && (
                <Button variant="default" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  تصدير البيانات
                </Button>
              )}
              <Button variant="outline" onClick={downloadTemplate} className="gap-2">
                <Download className="h-4 w-4" />
                قالب فارغ
              </Button>
            </div>
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                {file ? file.name : "اضغط لاختيار ملف Excel"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                xlsx أو xls
              </p>
            </label>
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          {parsedData.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">
                معاينة البيانات ({parsedData.length} سجل)
              </h4>
              <div className="border rounded-lg max-h-64 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.slice(0, 6).map((col) => (
                        <TableHead key={col.dbColumn}>{col.label}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, index) => (
                      <TableRow key={index}>
                        {columns.slice(0, 6).map((col) => (
                          <TableCell key={col.dbColumn}>
                            {String(row[col.dbColumn] ?? "-")}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 5 && (
                <p className="text-sm text-muted-foreground mt-2">
                  ... و {parsedData.length - 5} سجل إضافي
                </p>
              )}
            </div>
          )}

          {/* Progress */}
          {isImporting && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                جاري الاستيراد...
              </p>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                تم استيراد {importResult.success} سجل بنجاح
                {importResult.failed > 0 && ` | فشل ${importResult.failed} سجل`}
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              إغلاق
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || isImporting}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              استيراد {parsedData.length} سجل
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
