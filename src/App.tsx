import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "./components/Sidebar";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import Products from "./pages/Products";
import ProductsAdvanced from "./pages/ProductsAdvanced";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Categories from "./pages/Categories";
import Inventory from "./pages/Inventory";
import Warehouses from "./pages/Warehouses";
import PurchaseOrders from "./pages/PurchaseOrders";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import UserManagement from "./pages/UserManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const showSidebar = isAuthenticated && location.pathname !== "/auth";

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">جاري التحميل...</div>;
  }

  return (
    <div className="flex min-h-screen" dir="rtl">
      {showSidebar && <Sidebar />}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products-advanced" element={<ProductsAdvanced />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user-management" element={<UserManagement />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
