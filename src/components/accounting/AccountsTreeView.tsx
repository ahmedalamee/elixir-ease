import { useState } from "react";
import { AccountTreeNode } from "./AccountTreeNode";
import { AccountNode } from "@/data/chart-of-accounts";

interface AccountsTreeViewProps {
  accounts: AccountNode[];
  onSelect: (account: AccountNode) => void;
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
        {/* TODO: replace with data from backend */}
        {accounts.map((account) => (
          <AccountTreeNode
            key={account.id}
            node={account}
            depth={0}
            onSelect={onSelect}
            selectedId={selectedId}
          />
        ))}
      </div>
    </div>
  );
};
