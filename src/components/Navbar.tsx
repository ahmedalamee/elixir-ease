import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  FolderTree,
  FileText,
  Settings,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "تم تسجيل الخروج بنجاح",
    });
  };

  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "لوحة التحكم" },
    { path: "/pos", icon: ShoppingCart, label: "نقطة البيع" },
    { path: "/products", icon: Package, label: "المنتجات" },
    { path: "/customers", icon: Users, label: "العملاء" },
    { path: "/suppliers", icon: Truck, label: "الموردين" },
    { path: "/categories", icon: FolderTree, label: "التصنيفات" },
    { path: "/inventory", icon: Package, label: "المخزون" },
    { path: "/reports", icon: FileText, label: "التقارير" },
    { path: "/settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="text-xl font-bold text-primary">
              نظام الصيدلية
            </Link>
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2">
            <LogOut className="h-4 w-4" />
            تسجيل الخروج
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
