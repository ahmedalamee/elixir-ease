import { useState } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { AccountNode } from "@/data/chart-of-accounts";
import { cn } from "@/lib/utils";

interface AccountTreeNodeProps {
  node: AccountNode;
  depth: number;
  onSelect: (node: AccountNode) => void;
  selectedId?: string;
}

export const AccountTreeNode = ({
  node,
  depth,
  onSelect,
  selectedId,
}: AccountTreeNodeProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleSelect = () => {
    onSelect(node);
  };

  // Calculate indentation based on depth (RTL: padding-right)
  const indentation = depth * 20 + 12;

  return (
    <div className="select-none">
      {/* Node Row */}
      <div
        className={cn(
          "flex items-center gap-2 py-2.5 px-3 rounded-md cursor-pointer transition-all duration-200",
          "hover:bg-accent/60",
          isSelected && "bg-primary/15 border-r-2 border-primary shadow-sm"
        )}
        style={{ paddingRight: `${indentation}px` }}
        onClick={handleSelect}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <button
            onClick={handleToggle}
            className="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
            aria-label={isExpanded ? "طي" : "توسيع"}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-4 flex-shrink-0" />
        )}

        {/* Account Code and Name */}
        <span
          className={cn(
            "text-sm flex-1 min-w-0",
            isSelected ? "text-primary font-medium" : "text-foreground"
          )}
        >
          <span className="font-mono text-muted-foreground ml-2 inline-block min-w-[4rem]">
            {node.code}
          </span>
          <span className="mr-1">-</span>
          <span className="break-words">{node.name}</span>
        </span>
      </div>

      {/* Children (Recursive) */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5 space-y-0.5">
          {node.children?.map((child) => (
            <AccountTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedId={selectedId}
            />
          ))}
        </div>
      )}
    </div>
  );
};
