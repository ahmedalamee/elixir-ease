import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, PieChart, Package, Eye } from "lucide-react";

const POSProfitReports = () => {
  const reports = [
    {
      title: "ربحية الورديات",
      description: "تقرير مفصل عن أرباح كل وردية",
      icon: BarChart3,
      color: "text-blue-500"
    },
    {
      title: "ربحية التصنيفات",
      description: "تحليل الأرباح حسب تصنيفات المنتجات",
      icon: PieChart,
      color: "text-green-500"
    },
    {
      title: "ربحية المنتجات",
      description: "تفاصيل أرباح المنتجات الفردية",
      icon: Package,
      color: "text-purple-500"
    },
    {
      title: "عرض",
      description: "عرض شامل للأرباح",
      icon: Eye,
      color: "text-orange-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">الأرباح - نقاط البيع</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {reports.map((report, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-shadow cursor-pointer"
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`${report.color} p-3 bg-muted rounded-lg`}>
                    <report.icon className="w-6 h-6" />
                  </div>
                  <CardTitle className="text-lg">{report.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{report.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default POSProfitReports;
