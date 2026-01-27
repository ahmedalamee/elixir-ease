import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingCart,
  RotateCcw,
  FileText,
  Zap,
  ClipboardList,
  Package,
  PackageMinus,
  Receipt,
  CreditCard,
  BookOpen,
  Warehouse,
  Wallet,
  LogOut,
  Building2,
  MoreHorizontal,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "تم تسجيل الخروج بنجاح",
    });
  };

  const navItems = [
    { path: "/sales-invoices", icon: ShoppingCart, label: "المبيعات" },
    { path: "/sales-returns", icon: RotateCcw, label: "مردود المبيعات" },
    { path: "/customer-statement", icon: FileText, label: "كشف حساب عميل" },
    { path: "/pos", icon: Zap, label: "البيع السريع" },
    { path: "/purchase-requisitions", icon: ClipboardList, label: "طلبات الشراء" },
    { path: "/purchase-invoices", icon: Package, label: "المشتريات" },
    { path: "/purchase-returns", icon: PackageMinus, label: "مردود المشتريات" },
    { path: "/customer-payments", icon: Receipt, label: "سندات القبض" },
    { path: "/supplier-payments", icon: CreditCard, label: "سندات الصرف" },
    { path: "/manual-journal", icon: BookOpen, label: "قيود التسوية" },
    { path: "/warehouse-stock", icon: Warehouse, label: "أرصدة المخازن" },
    { path: "/expenses", icon: Wallet, label: "يومية الصندوق" },
  ];

  const visibleItems = isMobile ? navItems.slice(0, 4) : navItems.slice(0, 8);
  const overflowItems = isMobile ? navItems.slice(4) : navItems.slice(8);

  const NavButton = ({ item }: { item: typeof navItems[0] }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={item.path}>
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 transition-all ${
                isActive 
                  ? "bg-sidebar-accent text-sidebar-primary border border-sidebar-primary/20" 
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <Icon className="h-4 w-4" />
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-popover text-popover-foreground border">
          <p>{item.label}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="bg-sidebar border-b border-sidebar-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-3">
          <div className="flex items-center justify-between h-12">
            {/* Logo */}
            <Link 
              to="/dashboard" 
              className="flex items-center gap-2 text-sidebar-foreground hover:text-sidebar-primary transition-colors"
            >
              <Building2 className="h-5 w-5 text-sidebar-primary" />
              <span className="text-sm font-bold hidden sm:inline">نظام الصيدلية</span>
            </Link>

            {/* Navigation Icons */}
            <div className="flex items-center gap-0.5">
              {visibleItems.map((item) => (
                <NavButton key={item.path} item={item} />
              ))}

              {/* Overflow Menu */}
              {overflowItems.length > 0 && (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="bg-popover text-popover-foreground border">
                      <p>المزيد</p>
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48 bg-popover border">
                    {overflowItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <DropdownMenuItem
                          key={item.path}
                          asChild
                          className={isActive ? "bg-accent" : ""}
                        >
                          <Link to={item.path} className="flex items-center gap-2 cursor-pointer">
                            <Icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleLogout} 
                  variant="ghost" 
                  size="icon"
                  className="h-9 w-9 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="bg-popover text-popover-foreground border">
                <p>تسجيل الخروج</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  );
};

export default Navbar;
export { Navbar };
