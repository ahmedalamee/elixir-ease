import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Truck,
  Package,
  LogOut,
  Warehouse,
  Building2,
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
    { path: "/dashboard", icon: LayoutDashboard, label: "الرئيسية" },
    { path: "/pos", icon: ShoppingCart, label: "نقطة البيع" },
    { path: "/inventory", icon: Package, label: "المخزون" },
    { path: "/warehouses", icon: Warehouse, label: "المخازن" },
    { path: "/customers", icon: Users, label: "العملاء" },
    { path: "/suppliers", icon: Truck, label: "الموردين" },
  ];

  return (
    <nav className="bg-sidebar border-b border-sidebar-border sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors">
              <Building2 className="h-6 w-6 text-sidebar-primary" />
              <span className="text-lg font-bold">نظام الصيدلية</span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`gap-2 h-9 px-3 transition-all ${
                        isActive 
                          ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
                          : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
          <Button 
            onClick={handleLogout} 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">خروج</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
export { Navbar };
