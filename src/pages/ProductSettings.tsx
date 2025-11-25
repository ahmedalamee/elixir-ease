import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Scale, Tag, Barcode, Store, Receipt, FileText } from "lucide-react";
import Navbar from "@/components/Navbar";

const ProductSettings = () => {
  const navigate = useNavigate();

  const settingsCards = [
    {
      title: "قوالب الوحدات",
      icon: Scale,
      path: "/product-settings/uom-templates",
      color: "text-blue-600"
    },
    {
      title: "التصنيفات",
      icon: Tag,
      path: "/product-settings/classifications",
      color: "text-green-600"
    },
    {
      title: "إعدادات الباركود",
      icon: Barcode,
      path: "/product-settings/barcode-settings",
      color: "text-purple-600"
    },
    {
      title: "Brands",
      icon: Store,
      path: "/product-settings/brands",
      color: "text-orange-600"
    },
    {
      title: "الضرائب الافتراضية",
      icon: Receipt,
      path: "/product-settings/default-taxes",
      color: "text-red-600"
    },
    {
      title: "حقول إضافية",
      icon: FileText,
      path: "/product-settings/additional-fields",
      color: "text-teal-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8 text-gray-800">إعدادات المنتجات</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingsCards.map((card) => (
            <Card 
              key={card.path}
              className="cursor-pointer hover:shadow-lg transition-shadow duration-300 bg-white"
              onClick={() => navigate(card.path)}
            >
              <CardContent className="flex flex-col items-center justify-center p-8">
                <card.icon className={`w-20 h-20 mb-4 ${card.color}`} />
                <h3 className="text-xl font-semibold text-gray-800 text-center">
                  {card.title}
                </h3>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductSettings;
