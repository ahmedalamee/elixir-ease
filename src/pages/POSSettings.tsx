import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Monitor, Clock, Settings, Plus, Search, Filter, Edit, Trash2, Copy, Power } from "lucide-react";
import { toast } from "sonner";

type ViewType = "main" | "devices" | "shifts" | "general";

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  type: string;
  location: string;
  status: "online" | "offline";
  lastActivity: string;
}

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  type: string;
  isActive: boolean;
  openingCash: number;
}

const POSSettings = () => {
  const [currentView, setCurrentView] = useState<ViewType>("main");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [devices, setDevices] = useState<Device[]>([
    {
      id: "1",
      name: "جهاز الكاشير الرئيسي",
      serialNumber: "POS-001",
      type: "كمبيوتر",
      location: "الطابق الأول",
      status: "online",
      lastActivity: "منذ 5 دقائق"
    }
  ]);
  const [shifts, setShifts] = useState<Shift[]>([
    {
      id: "1",
      name: "الوردية الصباحية",
      startTime: "08:00",
      endTime: "16:00",
      type: "صباحية",
      isActive: true,
      openingCash: 1000
    }
  ]);

  const currentDate = new Date().toLocaleDateString('ar-EG', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });

  const MainView = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setCurrentView("devices")}
      >
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="text-blue-500 p-3 bg-muted rounded-lg">
              <Monitor className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg">أجهزة نقاط البيع</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>إدارة وتكوين أجهزة نقاط البيع</CardDescription>
        </CardContent>
      </Card>

      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setCurrentView("shifts")}
      >
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="text-green-500 p-3 bg-muted rounded-lg">
              <Clock className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg">ورديات نقاط البيع</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>تنظيم وإدارة الورديات</CardDescription>
        </CardContent>
      </Card>

      <Card 
        className="hover:shadow-lg transition-shadow cursor-pointer"
        onClick={() => setCurrentView("general")}
      >
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="text-purple-500 p-3 bg-muted rounded-lg">
              <Settings className="w-6 h-6" />
            </div>
            <CardTitle className="text-lg">عام</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>الإعدادات العامة للنظام</CardDescription>
        </CardContent>
      </Card>
    </div>
  );

  const DevicesView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">أجهزة نقاط البيع</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              إضافة جهاز جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة جهاز جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم الجهاز</Label>
                <Input placeholder="مثال: جهاز الكاشير الرئيسي" />
              </div>
              <div>
                <Label>الرقم التسلسلي</Label>
                <Input placeholder="مثال: POS-001" />
              </div>
              <div>
                <Label>نوع الجهاز</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الجهاز" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="computer">كمبيوتر</SelectItem>
                    <SelectItem value="tablet">تابلت</SelectItem>
                    <SelectItem value="mobile">محمول</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>الموقع</Label>
                <Input placeholder="مثال: الطابق الأول" />
              </div>
              <Button className="w-full">حفظ الجهاز</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <Input 
                placeholder="ابحث بالاسم أو الرقم التسلسلي"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="online">متصل</SelectItem>
                <SelectItem value="offline">غير متصل</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Search className="w-4 h-4" />
            </Button>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {devices.map((device) => (
              <Card key={device.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{device.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          device.status === "online" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {device.status === "online" ? "متصل" : "غير متصل"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>الرقم التسلسلي: {device.serialNumber}</p>
                        <p>النوع: {device.type}</p>
                        <p>الموقع: {device.location}</p>
                        <p>آخر نشاط: {device.lastActivity}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Power className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const ShiftsView = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ورديات نقاط البيع</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              إضافة وردية جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة وردية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>اسم الوردية</Label>
                <Input placeholder="مثال: الوردية الصباحية" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>وقت البدء</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>
                <div>
                  <Label>وقت الانتهاء</Label>
                  <Input type="time" defaultValue="16:00" />
                </div>
              </div>
              <div>
                <Label>نوع الوردية</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع الوردية" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">صباحية</SelectItem>
                    <SelectItem value="evening">مسائية</SelectItem>
                    <SelectItem value="night">ليلية</SelectItem>
                    <SelectItem value="custom">مخصص</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>رصيد الخزنة الافتتاحي</Label>
                <Input type="number" placeholder="1000" />
              </div>
              <div className="flex items-center justify-between">
                <Label>تفعيل الوردية</Label>
                <Switch defaultChecked />
              </div>
              <Button className="w-full">حفظ الوردية</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 mb-4">
            <Input 
              placeholder="ابحث باسم الوردية"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="inactive">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            {shifts.map((shift) => (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{shift.name}</h3>
                        <span className={`text-xs px-2 py-1 rounded ${
                          shift.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                        }`}>
                          {shift.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>النوع: {shift.type}</p>
                        <p>التوقيت: {shift.startTime} - {shift.endTime}</p>
                        <p>رصيد الخزنة: {shift.openingCash.toFixed(2)} ر.س</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const GeneralView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">الإعدادات العامة</h2>
      
      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">القوالب الافتراضية</TabsTrigger>
          <TabsTrigger value="payment">طرق الدفع</TabsTrigger>
          <TabsTrigger value="customer">العميل الافتراضي</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>قالب الفاتورة الافتراضي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>نوع الفاتورة الافتراضية</Label>
                <Select defaultValue="sales">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">فاتورة بيع</SelectItem>
                    <SelectItem value="receipt">إيصال</SelectItem>
                    <SelectItem value="invoice">فاتورة ضريبية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>ترويسة الفاتورة</Label>
                <Input placeholder="صيدلية النخيل" />
              </div>
              <div>
                <Label>تذييل الفاتورة</Label>
                <Input placeholder="شكراً لزيارتكم" />
              </div>
              <div className="flex items-center justify-between">
                <Label>تطبيق الضريبة تلقائياً</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>السماح بالخصم التلقائي</Label>
                <Switch />
              </div>
              <Button>حفظ الإعدادات</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>طرق الدفع الافتراضية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>طريقة الدفع الافتراضية</Label>
                <Select defaultValue="cash">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="card">بطاقة ائتمان</SelectItem>
                    <SelectItem value="transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="wallet">محفظة إلكترونية</SelectItem>
                    <SelectItem value="deferred">دفع آجل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>السماح بالدفع المقسم</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label>السماح بالدفع الآجل</Label>
                <Switch />
              </div>
              <Button>حفظ الإعدادات</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>العميل الافتراضي</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>نوع العميل الافتراضي</Label>
                <Select defaultValue="cash">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">عميل نقدي</SelectItem>
                    <SelectItem value="wholesale">عميل جملة</SelectItem>
                    <SelectItem value="corporate">عميل مؤسسات</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label>طلب معلومات العميل</Label>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <Label>تطبيق خصم العميل تلقائياً</Label>
                <Switch defaultChecked />
              </div>
              <Button>حفظ الإعدادات</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* شريط علوي */}
      <div className="bg-primary text-primary-foreground p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Ahmed Alarmee</span>
            <span>{currentDate}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">
              الذهاب إلى الموقع
            </Button>
            <Button variant="secondary" size="sm">
              المساعدة
            </Button>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            {currentView !== "main" && (
              <Button 
                variant="outline" 
                onClick={() => setCurrentView("main")}
              >
                العودة
              </Button>
            )}
            <h1 className="text-3xl font-bold">إعدادات نقاط البيع</h1>
          </div>

          {currentView === "main" && <MainView />}
          {currentView === "devices" && <DevicesView />}
          {currentView === "shifts" && <ShiftsView />}
          {currentView === "general" && <GeneralView />}
        </div>
      </div>
    </div>
  );
};

export default POSSettings;
