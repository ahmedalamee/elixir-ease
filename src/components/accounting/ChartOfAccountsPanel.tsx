import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ChartOfAccountsTree } from "./ChartOfAccountsTree";
import { AccountDetailsForm } from "./AccountDetailsForm";
import { chartOfAccountsData, AccountNode } from "@/data/chart-of-accounts";

export const ChartOfAccountsPanel = () => {
  const [selectedAccount, setSelectedAccount] = useState<AccountNode | null>(null);

  return (
    <div dir="rtl">
      <h2 className="text-xl font-bold mb-4">ترميز الدليل المحاسبي</h2>
      <Card className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
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
