import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { AccountsTreeView } from "@/components/accounting/AccountsTreeView";
import { SelectedAccountInfo } from "@/components/accounting/SelectedAccountInfo";
import { fetchGlAccountsTree } from "@/lib/accounting";
import type { GlAccountTreeNode } from "@/types/accounting";
import { useToast } from "@/hooks/use-toast";

// Helper function to filter tree by search term and filters
const filterTree = (
  nodes: GlAccountTreeNode[],
  options: {
    searchTerm: string;
    hideInactive: boolean;
    accountTypeFilter: string;
  }
): GlAccountTreeNode[] => {
  const { searchTerm, hideInactive, accountTypeFilter } = options;
  
  const matchesSearch = (node: GlAccountTreeNode): boolean => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase().trim();
    return (
      node.accountCode.toLowerCase().includes(term) ||
      node.accountName.toLowerCase().includes(term)
    );
  };

  const matchesType = (node: GlAccountTreeNode): boolean => {
    if (accountTypeFilter === "all") return true;
    return node.accountType === accountTypeFilter;
  };

  const matchesActive = (node: GlAccountTreeNode): boolean => {
    if (!hideInactive) return true;
    return node.isActive;
  };

  const filterNode = (node: GlAccountTreeNode): GlAccountTreeNode | null => {
    // Filter children recursively first
    const filteredChildren = node.children
      ? node.children.map(filterNode).filter((child): child is GlAccountTreeNode => child !== null)
      : [];

    // Check if node itself matches all filters
    const nodeMatches = matchesSearch(node) && matchesType(node) && matchesActive(node);
    
    // Include node if it matches OR any child matches (to preserve hierarchy)
    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      };
    }

    return null;
  };

  return nodes.map(filterNode).filter((node): node is GlAccountTreeNode => node !== null);
};

export default function ChartOfAccountsPage() {
  const [treeData, setTreeData] = useState<GlAccountTreeNode[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<GlAccountTreeNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [hideInactive, setHideInactive] = useState(false);
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");

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

  // Memoized filtered tree data
  const filteredTreeData = useMemo(
    () => filterTree(treeData, { searchTerm, hideInactive, accountTypeFilter }),
    [treeData, searchTerm, hideInactive, accountTypeFilter]
  );

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
          <>
            {/* Search and Filter Controls */}
            <div className="p-4 border-b border-border bg-muted/30 space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="بحث برقم أو اسم الحساب"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              {/* Filters Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Hide Inactive Toggle */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="hide-inactive"
                    checked={hideInactive}
                    onCheckedChange={setHideInactive}
                  />
                  <Label htmlFor="hide-inactive" className="text-sm cursor-pointer">
                    إخفاء الحسابات غير النشطة
                  </Label>
                </div>

                {/* Account Type Filter */}
                <div className="flex items-center gap-2">
                  <Label htmlFor="account-type" className="text-sm whitespace-nowrap">
                    نوع الحساب:
                  </Label>
                  <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
                    <SelectTrigger id="account-type" className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">الكل</SelectItem>
                      <SelectItem value="asset">أصول</SelectItem>
                      <SelectItem value="liability">خصوم</SelectItem>
                      <SelectItem value="equity">حقوق الملكية</SelectItem>
                      <SelectItem value="revenue">إيرادات</SelectItem>
                      <SelectItem value="expense">مصروفات</SelectItem>
                      <SelectItem value="cogs">تكلفة البضاعة المباعة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Right Side - Tree View (40%) */}
              <div className="lg:col-span-2 border-l border-border">
                <AccountsTreeView
                  accounts={filteredTreeData}
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
          </>
        )}
      </Card>
    </div>
  );
}
