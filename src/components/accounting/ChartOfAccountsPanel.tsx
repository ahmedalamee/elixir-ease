import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChartOfAccountsTree } from "./ChartOfAccountsTree";
import { AccountDetailsForm } from "./AccountDetailsForm";
import { chartOfAccountsData, AccountNode } from "@/data/chart-of-accounts";

export const ChartOfAccountsPanel = () => {
  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);

  return (
    <div dir="rtl" className="space-y-6">
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">ترميز الدليل المحاسبي</h1>
        <p className="text-muted-foreground">إدارة وتنظيم الحسابات المالية للمؤسسة</p>
      </div>

      {/* Main Content Card */}
      <Card className="shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 p-6">
          {/* Left Side - Tree View (35-40%) */}
          <div className="lg:col-span-2">
            <ChartOfAccountsTree
              data={chartOfAccountsData}
              onSelect={setSelectedAccount}
              selectedId={selectedAccount?.id}
            />
          </div>

          {/* Right Side - Details Form (60-65%) */}
          <div className="lg:col-span-3">
            <AccountDetailsForm account={selectedAccount} />
          </div>
        </div>
      </Card>
    </div>
  );
};
