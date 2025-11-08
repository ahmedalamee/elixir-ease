import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Pill, ShoppingCart, Package, Users, BarChart } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: ShoppingCart,
      title: "نقاط البيع",
      description: "نظام نقاط بيع سريع وفعال مع دعم الباركود",
    },
    {
      icon: Package,
      title: "إدارة المخزون",
      description: "تتبع المنتجات والكميات والتنبيهات التلقائية",
    },
    {
      icon: Users,
      title: "إدارة العملاء",
      description: "سجلات كاملة للعملاء ونقاط الولاء",
    },
    {
      icon: BarChart,
      title: "التقارير والتحليلات",
      description: "تقارير شاملة عن المبيعات والأداء",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-accent/5 to-background" dir="rtl">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-8 mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-r from-primary to-primary-hover p-6 rounded-3xl shadow-lg">
              <Pill className="w-20 h-20 text-white" />
            </div>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
            نظام إدارة الصيدلية المتكامل
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            حل شامل لإدارة الصيدليات بكفاءة عالية - من المبيعات إلى المخزون والتقارير
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={() => navigate("/auth")}
              className="btn-medical text-lg px-8 py-6"
            >
              دخول الموظفين
            </Button>
            <Button
              onClick={() => navigate("/customer-auth")}
              variant="secondary"
              className="text-lg px-8 py-6"
            >
              بوابة العملاء
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              variant="outline"
              className="text-lg px-8 py-6"
            >
              عرض توضيحي
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="card-elegant text-center space-y-4 hover:scale-[1.02] transition-transform"
              >
                <div className="bg-gradient-to-r from-primary to-primary-hover p-4 rounded-xl w-fit mx-auto">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* Benefits Section */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">لماذا نظامنا؟</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card-elegant">
              <h3 className="text-xl font-bold mb-2">✨ واجهة سهلة الاستخدام</h3>
              <p className="text-muted-foreground">
                تصميم عربي بسيط وسلس يسهل على الجميع استخدامه
              </p>
            </div>
            <div className="card-elegant">
              <h3 className="text-xl font-bold mb-2">🔒 أمان وحماية</h3>
              <p className="text-muted-foreground">
                حماية كاملة للبيانات مع نسخ احتياطي تلقائي
              </p>
            </div>
            <div className="card-elegant">
              <h3 className="text-xl font-bold mb-2">📱 متعدد الأجهزة</h3>
              <p className="text-muted-foreground">
                يعمل على جميع الأجهزة المكتبية والمحمولة
              </p>
            </div>
            <div className="card-elegant">
              <h3 className="text-xl font-bold mb-2">⚡ أداء سريع</h3>
              <p className="text-muted-foreground">
                نظام سريع ويعمل بكفاءة عالية تحت الضغط
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
