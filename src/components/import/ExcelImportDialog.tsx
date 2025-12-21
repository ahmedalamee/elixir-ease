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
import * as XLSX from "xlsx";

export interface ColumnMapping {
  excelColumn: string;
  dbColumn: string;
  required: boolean;
  type: "string" | "number" | "date" | "boolean";
  label: string;
}

interface ExcelImportDialogProps {
  title: string;
  description: string;
  columns: ColumnMapping[];
  onImport: (data: Record<string, any>[]) => Promise<{ success: number; failed: number; errors: string[] }>;
  templateFileName: string;
  triggerButton?: React.ReactNode;
}

export const ExcelImportDialog = ({
  title,
  description,
  columns,
  onImport,
  templateFileName,
  triggerButton,
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
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            reject(new Error("الملف فارغ أو لا يحتوي على بيانات"));
            return;
          }

          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1);
          
          // Map Excel columns to database columns
          const mappedData: Record<string, any>[] = [];
          const validationErrors: string[] = [];

          rows.forEach((row, rowIndex) => {
            if (!row.some(cell => cell !== undefined && cell !== null && cell !== "")) {
              return; // Skip empty rows
            }

            const mappedRow: Record<string, any> = {};
            let rowHasError = false;

            columns.forEach((col) => {
              const excelIndex = headers.findIndex(
                (h) => h?.toString().trim().toLowerCase() === col.excelColumn.toLowerCase()
              );
              
              let value = excelIndex >= 0 ? row[excelIndex] : undefined;

              // Type conversion
              if (value !== undefined && value !== null && value !== "") {
                if (col.type === "number") {
                  value = parseFloat(value);
                  if (isNaN(value)) {
                    validationErrors.push(`صف ${rowIndex + 2}: قيمة غير صالحة في عمود "${col.label}"`);
                    rowHasError = true;
                    value = 0;
                  }
                } else if (col.type === "boolean") {
                  value = value === true || value === "نعم" || value === "yes" || value === "1" || value === 1;
                } else if (col.type === "date") {
                  // Handle Excel date serial numbers
                  if (typeof value === "number") {
                    const date = XLSX.SSF.parse_date_code(value);
                    value = `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
                  }
                } else {
                  value = String(value).trim();
                }
              }

              // Required validation
              if (col.required && (value === undefined || value === null || value === "")) {
                validationErrors.push(`صف ${rowIndex + 2}: الحقل "${col.label}" مطلوب`);
                rowHasError = true;
              }

              mappedRow[col.dbColumn] = value;
            });

            if (!rowHasError) {
              mappedData.push(mappedRow);
            }
          });

          if (validationErrors.length > 0) {
            setErrors(validationErrors.slice(0, 10)); // Show first 10 errors
          }

          resolve(mappedData);
        } catch (error) {
          reject(new Error("فشل قراءة ملف Excel. تأكد من صحة صيغة الملف"));
        }
      };

      reader.onerror = () => {
        reject(new Error("فشل قراءة الملف"));
      };

      reader.readAsArrayBuffer(file);
    });
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

  const downloadTemplate = () => {
    const headers = columns.map((col) => col.excelColumn);
    const sampleRow = columns.map((col) => {
      if (col.type === "number") return "0";
      if (col.type === "boolean") return "نعم";
      if (col.type === "date") return "2025-01-01";
      return col.required ? "مطلوب" : "";
    });

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, templateFileName);
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
          {/* Template Download */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">تحميل قالب Excel</p>
              <p className="text-sm text-muted-foreground">
                قم بتحميل القالب وملئه بالبيانات ثم رفعه
              </p>
            </div>
            <Button variant="outline" onClick={downloadTemplate} className="gap-2">
              <Download className="h-4 w-4" />
              تحميل القالب
            </Button>
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
