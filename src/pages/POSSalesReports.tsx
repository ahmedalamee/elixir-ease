import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListOrdered } from "lucide-react";

const POSSalesReports = () => {
  const reports = [
    {
      title: "إجمالي مبيعات التصنيفات",
      description: "عرض إجمالي المبيعات حسب تصنيفات المنتجات"
    },
    {
      title: "إجمالي مبيعات المنتجات",
      description: "تقرير شامل لمبيعات جميع المنتجات"
    },
    {
      title: "مبيعات الورديات",
      description: "تفاصيل المبيعات لكل وردية"
    },
    {
      title: "حركة الورديات تفصيلي",
      description: "تقرير تفصيلي لحركة الورديات"
    },
    {
      title: "عرض 5",
      description: "عرض ملخص للتقارير"
    }
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">الحركات - المبيعات نقاط البيع</h1>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="w-5 h-5" />
              قائمة التقارير
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reports.map((report, index) => (
                <div 
                  key={index}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                    <div className="text-2xl font-bold text-primary">{index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default POSSalesReports;
