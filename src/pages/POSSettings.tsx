import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Monitor, Clock, Settings } from "lucide-react";

const POSSettings = () => {
  const currentDate = new Date().toLocaleDateString('ar-EG', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });

  const settings = [
    {
      title: "أجهزة نقاط البيع",
      description: "إدارة وتكوين أجهزة نقاط البيع",
      icon: Monitor,
      color: "text-blue-500"
    },
    {
      title: "ورديات نقاط البيع",
      description: "تنظيم وإدارة الورديات",
      icon: Clock,
      color: "text-green-500"
    },
    {
      title: "عام",
      description: "الإعدادات العامة للنظام",
      icon: Settings,
      color: "text-purple-500"
    }
  ];

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
          <h1 className="text-3xl font-bold mb-8">إعدادات نقاط البيع</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {settings.map((setting, index) => (
              <Card 
                key={index}
                className="hover:shadow-lg transition-shadow cursor-pointer"
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`${setting.color} p-3 bg-muted rounded-lg`}>
                      <setting.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-lg">{setting.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{setting.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSSettings;
