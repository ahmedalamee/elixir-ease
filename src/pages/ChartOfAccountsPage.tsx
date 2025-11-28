import { useState } from "react";
import { Card } from "@/components/ui/card";
import { AccountsTreeView } from "@/components/accounting/AccountsTreeView";
import { SelectedAccountInfo } from "@/components/accounting/SelectedAccountInfo";
import { chartOfAccountsData, AccountNode } from "@/data/chart-of-accounts";

export default function ChartOfAccountsPage() {
  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);

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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
          {/* Right Side - Tree View (40%) */}
          <div className="lg:col-span-2 border-l border-border">
            <AccountsTreeView
              accounts={chartOfAccountsData}
              onSelect={setSelectedAccount}
              selectedId={selectedAccount?.id}
            />
          </div>

          {/* Left Side - Selected Account Info (60%) */}
          <div className="lg:col-span-3">
            <SelectedAccountInfo 
              account={selectedAccount}
              onAddChild={() => console.log("TODO: Add child account")}
              onEdit={() => console.log("TODO: Edit account", selectedAccount)}
              onDelete={() => console.log("TODO: Delete account", selectedAccount)}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
