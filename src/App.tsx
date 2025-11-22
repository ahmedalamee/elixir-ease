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
import SalesReports from "./pages/SalesReports";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import WarehouseTransfers from "./pages/WarehouseTransfers";
import StockAdjustments from "./pages/StockAdjustments";
import BatchTracking from "./pages/BatchTracking";
import InventoryReports from "./pages/InventoryReports";
import POS from "./pages/POS";
import POSReports from "./pages/POSReports";
import POSNewSession from "./pages/POSNewSession";
import POSProfitReports from "./pages/POSProfitReports";
import POSSalesReports from "./pages/POSSalesReports";
import POSSettings from "./pages/POSSettings";
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
import ProductSettings from "./pages/ProductSettings";
import UOMTemplates from "./pages/ProductSettings/UOMTemplates";
import Classifications from "./pages/ProductSettings/Classifications";
import Brands from "./pages/ProductSettings/Brands";
import DefaultTaxes from "./pages/ProductSettings/DefaultTaxes";
import BarcodeSettings from "./pages/ProductSettings/BarcodeSettings";
import NotFound from "./pages/NotFound";
import Accounting from "./pages/Accounting";
import GeneralLedger from "./pages/GeneralLedger";
import TrialBalance from "./pages/TrialBalance";
import JournalEntryDetail from "./pages/JournalEntryDetail";
import IncomeStatement from "./pages/IncomeStatement";
import BalanceSheet from "./pages/BalanceSheet";
import PriceLists from "./pages/PriceLists";
import StockAlerts from "./pages/StockAlerts";
import GoodsReceipts from "./pages/GoodsReceipts";
import PurchaseInvoices from "./pages/PurchaseInvoices";
import Taxes from "./pages/Taxes";
import Currencies from "./pages/Currencies";
import InventorySettings from "./pages/InventorySettings";
import CustomerPayments from "./pages/CustomerPayments";
import SalesInvoices from "./pages/SalesInvoices";
import NewSalesInvoice from "./pages/NewSalesInvoice";
import SalesInvoiceView from "./pages/SalesInvoiceView";
import WarehouseStock from "./pages/WarehouseStock";
import CompanyProfile from "./pages/CompanyProfile";
import UnitOfMeasures from "./pages/UnitOfMeasures";
import StockMovements from "./pages/StockMovements";
import InsuranceCompanies from "./pages/InsuranceCompanies";
import PaymentMethods from "./pages/PaymentMethods";
import Expenses from "./pages/Expenses";
import AccountingIntegration from "./pages/AccountingIntegration";
import CRMDashboard from "./pages/CRMDashboard";
import MarketingCampaigns from "./pages/MarketingCampaigns";
import CustomerProfile from "./pages/CustomerProfile";
import CRMReports from "./pages/CRMReports";
import Doctors from "./pages/Doctors";
import Prescriptions from "./pages/Prescriptions";
import HealthRecords from "./pages/HealthRecords";
import DrugInteractions from "./pages/DrugInteractions";
import PharmacyReports from "./pages/PharmacyReports";
import RolesManagement from "./pages/RolesManagement";
import EmployeeReports from "./pages/EmployeeReports";
import AccountSettings from "./pages/AccountSettings";
import RolesPermissions from "./pages/RolesPermissions";
import CustomerAuth from "./pages/CustomerAuth";
import CustomerPortal from "./pages/CustomerPortal";
import SalesReturns from "./pages/SalesReturns";
import PurchaseReturns from "./pages/PurchaseReturns";
import TaxCompliance from "./pages/TaxCompliance";
import VATReturns from "./pages/VATReturns";
import EInvoicing from "./pages/EInvoicing";
import TaxReports from "./pages/TaxReports";
import CustomerComplaints from "./pages/CustomerComplaints";
import ComplaintsReports from "./pages/ComplaintsReports";
import CostCenters from "./pages/CostCenters";
import BankReconciliation from "./pages/BankReconciliation";
import FinancialRatios from "./pages/FinancialRatios";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import Leaves from "./pages/Leaves";
import Performance from "./pages/Performance";
import Tasks from "./pages/Tasks";

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

  const showSidebar = isAuthenticated && 
    location.pathname !== "/auth" && 
    location.pathname !== "/customer-auth" && 
    location.pathname !== "/customer-portal";

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
          <Route path="/customer-auth" element={<CustomerAuth />} />
          <Route path="/customer-portal" element={<CustomerPortal />} />
          <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/pos" element={<POS />} />
            <Route path="/pos/new-session" element={<POSNewSession />} />
            <Route path="/pos/profit-reports" element={<POSProfitReports />} />
            <Route path="/pos/sales-reports" element={<POSSalesReports />} />
            <Route path="/pos/settings" element={<POSSettings />} />
            <Route path="/pos/reports" element={<POSReports />} />
            <Route path="/warehouse-transfers" element={<WarehouseTransfers />} />
            <Route path="/stock-adjustments" element={<StockAdjustments />} />
            <Route path="/batch-tracking" element={<BatchTracking />} />
            <Route path="/inventory/reports" element={<InventoryReports />} />
            <Route path="/sales-reports" element={<SalesReports />} />
            <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products-advanced" element={<ProductsAdvanced />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/customers/:id" element={<CustomerProfile />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/warehouses" element={<Warehouses />} />
          <Route path="/purchase-orders" element={<PurchaseOrders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/product-settings" element={<ProductSettings />} />
          <Route path="/product-settings/uom-templates" element={<UOMTemplates />} />
          <Route path="/product-settings/classifications" element={<Classifications />} />
          <Route path="/product-settings/brands" element={<Brands />} />
          <Route path="/product-settings/default-taxes" element={<DefaultTaxes />} />
          <Route path="/product-settings/barcode-settings" element={<BarcodeSettings />} />
          <Route path="/accounting" element={<Accounting />} />
          <Route path="/general-ledger" element={<GeneralLedger />} />
          <Route path="/trial-balance" element={<TrialBalance />} />
          <Route path="/journal-entry/:id" element={<JournalEntryDetail />} />
          <Route path="/income-statement" element={<IncomeStatement />} />
          <Route path="/balance-sheet" element={<BalanceSheet />} />
          <Route path="/cost-centers" element={<CostCenters />} />
          <Route path="/bank-reconciliation" element={<BankReconciliation />} />
          <Route path="/financial-ratios" element={<FinancialRatios />} />
          <Route path="/price-lists" element={<PriceLists />} />
          <Route path="/inventory/alerts" element={<StockAlerts />} />
          <Route path="/goods-receipts" element={<GoodsReceipts />} />
          <Route path="/purchase-invoices" element={<PurchaseInvoices />} />
          <Route path="/settings/taxes" element={<Taxes />} />
          <Route path="/settings/currencies" element={<Currencies />} />
          <Route path="/inventory/settings" element={<InventorySettings />} />
          <Route path="/warehouse-stock" element={<WarehouseStock />} />
          <Route path="/company-profile" element={<CompanyProfile />} />
          <Route path="/unit-of-measures" element={<UnitOfMeasures />} />
          <Route path="/stock-movements" element={<StockMovements />} />
          <Route path="/insurance-companies" element={<InsuranceCompanies />} />
          <Route path="/settings/payment-methods" element={<PaymentMethods />} />
          <Route path="/sales/invoices" element={<SalesInvoices />} />
          <Route path="/sales/new-invoice" element={<NewSalesInvoice />} />
          <Route path="/sales/invoice/:id" element={<SalesInvoiceView />} />
          <Route path="/sales/payments" element={<CustomerPayments />} />
          <Route path="/sales/reports" element={<SalesReports />} />
          <Route path="/finance/expenses" element={<Expenses />} />
          <Route path="/accounting-integration" element={<AccountingIntegration />} />
          <Route path="/crm-dashboard" element={<CRMDashboard />} />
          <Route path="/marketing-campaigns" element={<MarketingCampaigns />} />
          <Route path="/customer-profile/:id" element={<CustomerProfile />} />
          <Route path="/crm-reports" element={<CRMReports />} />
          <Route path="/doctors" element={<Doctors />} />
          <Route path="/prescriptions" element={<Prescriptions />} />
          <Route path="/health-records" element={<HealthRecords />} />
          <Route path="/drug-interactions" element={<DrugInteractions />} />
          <Route path="/pharmacy-reports" element={<PharmacyReports />} />
          <Route path="/roles-management" element={<RolesManagement />} />
          <Route path="/roles-permissions" element={<RolesPermissions />} />
          <Route path="/hr/employees" element={<Employees />} />
          <Route path="/hr/attendance" element={<Attendance />} />
          <Route path="/hr/leaves" element={<Leaves />} />
          <Route path="/hr/performance" element={<Performance />} />
          <Route path="/hr/tasks" element={<Tasks />} />
          <Route path="/hr/employee-reports" element={<EmployeeReports />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/sales/returns" element={<SalesReturns />} />
          <Route path="/purchases/returns" element={<PurchaseReturns />} />
          <Route path="/tax/compliance" element={<TaxCompliance />} />
          <Route path="/tax/vat-returns" element={<VATReturns />} />
          <Route path="/tax/e-invoicing" element={<EInvoicing />} />
          <Route path="/tax/reports" element={<TaxReports />} />
          <Route path="/crm/complaints" element={<CustomerComplaints />} />
          <Route path="/crm/complaints-reports" element={<ComplaintsReports />} />
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
