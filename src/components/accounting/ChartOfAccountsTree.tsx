import { useState } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { AccountNode } from "@/data/chart-of-accounts";
import { cn } from "@/lib/utils";

interface ChartOfAccountsTreeProps {
  data: AccountNode[];
  onSelect: (node: AccountNode) => void;
  selectedId?: string;
}

export const ChartOfAccountsTree = ({
  data,
  onSelect,
  selectedId,
}: ChartOfAccountsTreeProps) => {
  return (
    <div className="border rounded-lg bg-card h-[600px] overflow-hidden flex flex-col" dir="rtl">
      <div className="p-3 border-b bg-muted/30">
        <h3 className="text-sm font-semibold text-foreground">شجرة الحسابات</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {data.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            onSelect={onSelect}
            selectedId={selectedId}
            level={0}
          />
        ))}
      </div>
    </div>
  );
};

interface TreeNodeProps {
  node: AccountNode;
  onSelect: (node: AccountNode) => void;
  selectedId?: string;
  level: number;
}

const TreeNode = ({ node, onSelect, selectedId, level }: TreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleClick = () => {
    onSelect(node);
  };

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-2 py-2.5 px-3 rounded-md cursor-pointer transition-all duration-200",
          "hover:bg-accent/50",
          isSelected && "bg-primary/15 border-r-2 border-primary font-medium shadow-sm"
        )}
        style={{ paddingRight: `${level * 20 + 12}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        <span className={cn(
          "text-sm flex-1",
          isSelected ? "text-primary font-medium" : "text-foreground"
        )}>
          <span className="font-mono text-muted-foreground ml-2">{node.code}</span>
          <span className="mr-1">-</span>
          <span>{node.name}</span>
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          {node.children?.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              onSelect={onSelect}
              selectedId={selectedId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
