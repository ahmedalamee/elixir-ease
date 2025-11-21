import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const POSNewSession = () => {
  const [status, setStatus] = useState("");
  const [shift, setShift] = useState("");
  const [device, setDevice] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");

  const handleSearch = () => {
    console.log("Searching...", { status, shift, device, sessionNumber });
  };

  const handleReset = () => {
    setStatus("");
    setShift("");
    setDevice("");
    setSessionNumber("");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">جلسة جديدة</h1>

        <Card className="p-6">
          {/* قسم الحالة */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">الحالة</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">أي حالة</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="closed">مغلق</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm mb-2">وردية</label>
                <Select value={shift} onValueChange={setShift}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوردية" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="morning">صباحية</SelectItem>
                    <SelectItem value="evening">مسائية</SelectItem>
                    <SelectItem value="night">ليلية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* قسم البحث */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">بحث</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">جهاز</label>
                <Input
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  placeholder="أدخل اسم الجهاز"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">رقم الجلسة</label>
                <Input
                  value={sessionNumber}
                  onChange={(e) => setSessionNumber(e.target.value)}
                  placeholder="أدخل رقم الجلسة"
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* أزرار التحكم */}
          <div className="flex gap-4 mb-6">
            <Button variant="outline" onClick={handleReset}>
              إلغاء الفلتر
            </Button>
            <Button onClick={handleSearch}>
              بحث متقدم
            </Button>
          </div>

          <Separator className="my-6" />

          {/* قسم النتائج */}
          <div>
            <h2 className="text-lg font-semibold mb-4">النتائج</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-right">رقم الجلسة</th>
                    <th className="px-4 py-3 text-right">الجهاز</th>
                    <th className="px-4 py-3 text-right">الوردية</th>
                    <th className="px-4 py-3 text-right">الحالة</th>
                    <th className="px-4 py-3 text-right">وقت البدء</th>
                    <th className="px-4 py-3 text-right">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="px-4 py-3 text-muted-foreground" colSpan={6}>
                      لا توجد نتائج
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default POSNewSession;
