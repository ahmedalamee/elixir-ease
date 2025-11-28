import { AccountTreeNode } from "./AccountTreeNode";
import type { GlAccountTreeNode } from "@/types/accounting";

interface AccountsTreeViewProps {
  accounts: GlAccountTreeNode[];
  onSelect: (account: GlAccountTreeNode) => void;
  selectedId?: string;
}

export const AccountsTreeView = ({
  accounts,
  onSelect,
  selectedId,
}: AccountsTreeViewProps) => {
  return (
    <div className="h-[calc(100vh-16rem)] overflow-hidden flex flex-col bg-card">
      {/* Tree Header */}
      <div className="p-4 border-b bg-muted/30 flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground">شجرة الحسابات</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {accounts.length} حساب رئيسي
        </p>
      </div>

      {/* Tree Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-3">
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm text-muted-foreground">
              لا توجد حسابات في الدليل المحاسبي
            </p>
          </div>
        ) : (
          accounts.map((account) => (
            <AccountTreeNode
              key={account.id}
              node={account}
              depth={0}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))
        )}
      </div>
    </div>
  );
};
