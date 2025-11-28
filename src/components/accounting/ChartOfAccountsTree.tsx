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
    <div className="border rounded-lg bg-card p-4 h-[600px] overflow-y-auto" dir="rtl">
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
          "flex items-center gap-2 py-2 px-2 rounded cursor-pointer hover:bg-accent transition-colors",
          isSelected && "bg-primary/10 border-r-4 border-primary font-semibold"
        )}
        style={{ paddingRight: `${level * 24 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-5 h-5 flex items-center justify-center border border-border rounded hover:bg-accent"
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        <span className="text-sm">
          {node.code} - {node.name}
        </span>
      </div>

      {hasChildren && isExpanded && (
        <div>
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
