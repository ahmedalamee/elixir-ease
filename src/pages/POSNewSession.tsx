import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Device {
  id: string;
  device_code: string;
  device_name: string;
  status: string;
}

interface Shift {
  id: string;
  shift_name: string;
  shift_type: string;
  is_active: boolean;
}

interface Session {
  id: string;
  session_number: string;
  device_id: string;
  shift_id: string;
  status: string;
  start_time: string;
}

const POSNewSession = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [shift, setShift] = useState("");
  const [device, setDevice] = useState("");
  const [sessionNumber, setSessionNumber] = useState("");
  const [devices, setDevices] = useState<Device[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const [newShiftId, setNewShiftId] = useState("");
  const [newDeviceId, setNewDeviceId] = useState("");
  const [openingCash, setOpeningCash] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchDevices();
    fetchShifts();
    fetchSessions();
  }, []);

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from("pos_devices")
      .select("*")
      .eq("status", "active")
      .order("device_name");

    if (error) {
      console.error("Error fetching devices:", error);
      toast.error("فشل في جلب الأجهزة");
    } else {
      setDevices(data || []);
    }
  };

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("pos_shifts")
      .select("*")
      .eq("is_active", true)
      .order("shift_name");

    if (error) {
      console.error("Error fetching shifts:", error);
      toast.error("فشل في جلب الورديات");
    } else {
      setShifts(data || []);
    }
  };

  const fetchSessions = async () => {
    let query = supabase
      .from("pos_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }
    if (shift) {
      query = query.eq("shift_id", shift);
    }
    if (device) {
      query = query.eq("device_id", device);
    }
    if (sessionNumber) {
      query = query.ilike("session_number", `%${sessionNumber}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching sessions:", error);
      toast.error("فشل في جلب الجلسات");
    } else {
      setSessions(data || []);
    }
  };

  const handleSearch = () => {
    fetchSessions();
  };

  const handleReset = () => {
    setStatus("");
    setShift("");
    setDevice("");
    setSessionNumber("");
    fetchSessions();
  };

  const handleCreateSession = async () => {
    if (!newShiftId || !newDeviceId || !openingCash) {
      toast.error("يرجى ملء جميع الحقول المطلوبة");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("يرجى تسجيل الدخول أولاً");
        return;
      }

      // توليد رقم الجلسة
      const { data: sessionNumber } = await supabase.rpc('generate_pos_session_number');

      const { error } = await supabase
        .from("pos_sessions")
        .insert({
          session_number: sessionNumber,
          shift_id: newShiftId,
          device_id: newDeviceId,
          opening_cash: parseFloat(openingCash),
          user_id: user.id,
          notes: notes,
          status: 'open',
        });

      if (error) throw error;

      toast.success("تم إنشاء الجلسة بنجاح");
      setNewShiftId("");
      setNewDeviceId("");
      setOpeningCash("");
      setNotes("");
      fetchSessions();
      
      // الانتقال إلى صفحة POS الرئيسية
      navigate("/pos");
    } catch (error) {
      console.error("Error creating session:", error);
      toast.error("فشل في إنشاء الجلسة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">جلسة جديدة</h1>

        {/* نموذج إنشاء جلسة جديدة */}
        <Card className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">إنشاء جلسة جديدة</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>الوردية *</Label>
              <Select value={newShiftId} onValueChange={setNewShiftId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الوردية" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.shift_name} ({s.shift_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>الجهاز *</Label>
              <Select value={newDeviceId} onValueChange={setNewDeviceId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الجهاز" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {devices.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.device_name} ({d.device_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <Label>رصيد افتتاحي *</Label>
              <Input
                type="number"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="أدخل الرصيد الافتتاحي"
              />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ملاحظات إضافية"
              />
            </div>
          </div>
          <Button onClick={handleCreateSession} disabled={loading}>
            {loading ? "جاري الإنشاء..." : "إنشاء جلسة"}
          </Button>
        </Card>

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
                    <SelectItem value="open">مفتوحة</SelectItem>
                    <SelectItem value="closed">مغلقة</SelectItem>
                    <SelectItem value="suspended">معلقة</SelectItem>
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
                    {shifts.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.shift_name}
                      </SelectItem>
                    ))}
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
                <Select value={device} onValueChange={setDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الجهاز" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {devices.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.device_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  {sessions.length === 0 ? (
                    <tr className="border-b">
                      <td className="px-4 py-3 text-muted-foreground text-center" colSpan={6}>
                        لا توجد نتائج
                      </td>
                    </tr>
                  ) : (
                    sessions.map((session) => (
                      <tr key={session.id} className="border-b">
                        <td className="px-4 py-3">{session.session_number}</td>
                        <td className="px-4 py-3">
                          {devices.find(d => d.id === session.device_id)?.device_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          {shifts.find(s => s.id === session.shift_id)?.shift_name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs ${
                            session.status === 'open' ? 'bg-green-100 text-green-800' :
                            session.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {session.status === 'open' ? 'مفتوحة' :
                             session.status === 'closed' ? 'مغلقة' : 'معلقة'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {new Date(session.start_time).toLocaleString('ar-SA')}
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="outline">
                            عرض
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
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
