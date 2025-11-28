import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TreeMenuItem } from "@/types/tree-menu";

interface TreeNodeProps {
  item: TreeMenuItem;
  level: number;
  expandedNodes: string[];
  onToggle: (nodeId: string) => void;
  onSelect: (nodeId: string) => void;
}

export const TreeNode = ({
  item,
  level,
  expandedNodes,
  onToggle,
  onSelect,
}: TreeNodeProps) => {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(
    expandedNodes.includes(item.id) || false
  );

  const isActive = item.route && location.pathname === item.route;
  const hasChildren = item.children && item.children.length > 0;

  useEffect(() => {
    setIsExpanded(expandedNodes.includes(item.id));
  }, [expandedNodes, item.id]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasChildren) {
      setIsExpanded(!isExpanded);
      onToggle(item.id);
    }
  };

  const handleClick = () => {
    onSelect(item.id);
    if (!hasChildren && item.route) {
      // Navigation will happen via Link component
    }
  };

  const paddingRight = `${level * 1.25}rem`; // 20px per level in RTL

  const content = (
    <div
      className={cn(
        "group flex items-center justify-between gap-2 py-2.5 px-3 rounded-lg transition-all duration-200 cursor-pointer",
        "hover:bg-sidebar-accent",
        isActive && "bg-primary/10 text-primary font-semibold border-r-4 border-primary"
      )}
      style={{ paddingRight }}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {item.icon && (
          <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive && "text-primary")} />
        )}
        <span className={cn("text-sm truncate", isActive && "font-semibold")}>
          {item.label}
        </span>
      </div>

      {hasChildren && (
        <button
          onClick={handleToggle}
          className="p-1 hover:bg-sidebar-accent rounded transition-colors flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="select-none">
      {item.route && !hasChildren ? (
        <Link to={item.route}>{content}</Link>
      ) : (
        content
      )}

      {hasChildren && isExpanded && (
        <div className="mt-1 space-y-1">
          {item.children?.map((child) => (
            <TreeNode
              key={child.id}
              item={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};
