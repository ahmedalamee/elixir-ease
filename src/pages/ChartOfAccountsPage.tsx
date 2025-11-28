import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { AccountsTreeView } from "@/components/accounting/AccountsTreeView";
import { SelectedAccountInfo } from "@/components/accounting/SelectedAccountInfo";
import { fetchGlAccountsTree } from "@/lib/accounting";
import type { GlAccountTreeNode } from "@/types/accounting";
import { useToast } from "@/hooks/use-toast";

export default function ChartOfAccountsPage() {
  const [treeData, setTreeData] = useState<GlAccountTreeNode[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GlAccountTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load accounts tree from Supabase
  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const accounts = await fetchGlAccountsTree();
      setTreeData(accounts);
    } catch (err) {
      console.error("Error loading GL accounts:", err);
      setError("حدث خطأ أثناء تحميل شجرة الحسابات");
      toast({
        title: "خطأ في التحميل",
        description: "حدث خطأ أثناء تحميل شجرة الحسابات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load accounts tree on mount
  useEffect(() => {
    loadAccounts();
  }, [toast]);

  return (
    <div dir="rtl" className="container mx-auto p-6 space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          ترميز الدليل المحاسبي
        </h1>
        <p className="text-muted-foreground">
          إدارة وتنظيم الحسابات المالية للمؤسسة بشكل هرمي ومرن
        </p>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-sm overflow-hidden">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium text-foreground">
              جاري تحميل شجرة الحسابات...
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              الرجاء الانتظار
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-24 px-6">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <p className="text-lg font-semibold text-foreground mb-2">
              حدث خطأ أثناء تحميل البيانات
            </p>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {error}
            </p>
          </div>
        )}

        {/* Loaded State */}
        {!isLoading && !error && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
            {/* Right Side - Tree View (40%) */}
            <div className="lg:col-span-2 border-l border-border">
              <AccountsTreeView
                accounts={treeData}
                onSelect={setSelectedAccount}
                selectedId={selectedAccount?.id}
              />
            </div>

            {/* Left Side - Selected Account Info (60%) */}
            <div className="lg:col-span-3">
              <SelectedAccountInfo 
                account={selectedAccount}
                onRefresh={loadAccounts}
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
