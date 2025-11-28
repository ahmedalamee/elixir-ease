import { useState, useEffect } from "react";
import { Package, Menu, X } from "lucide-react";
import { TreeNode } from "./TreeNode";
import { TreeMenuItem, TreeMenuState } from "@/types/tree-menu";
import { cn } from "@/lib/utils";

interface TreeSidebarProps {
  menuData: TreeMenuItem[];
  className?: string;
}

const STORAGE_KEY = "pharmacy-erp-tree-menu-state";

export const TreeSidebar = ({ menuData, className }: TreeSidebarProps) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [menuState, setMenuState] = useState<TreeMenuState>(() => {
    // Load state from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { expandedNodes: [], selectedNode: null };
      }
    }
    return { expandedNodes: [], selectedNode: null };
  });

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(menuState));
  }, [menuState]);

  const handleToggle = (nodeId: string) => {
    setMenuState((prev) => {
      const isExpanded = prev.expandedNodes.includes(nodeId);
      const newExpandedNodes = isExpanded
        ? prev.expandedNodes.filter((id) => id !== nodeId)
        : [...prev.expandedNodes, nodeId];

      return {
        ...prev,
        expandedNodes: newExpandedNodes,
      };
    });
  };

  const handleSelect = (nodeId: string) => {
    setMenuState((prev) => ({
      ...prev,
      selectedNode: nodeId,
    }));
    // Close mobile menu on selection
    if (isMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 right-4 z-50 p-2 bg-sidebar rounded-lg shadow-lg border border-sidebar-border"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6 text-sidebar-foreground" />
        ) : (
          <Menu className="w-6 h-6 text-sidebar-foreground" />
        )}
      </button>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 right-0 h-screen bg-sidebar border-l border-sidebar-border overflow-y-auto z-40 transition-transform duration-300",
          "w-72 lg:w-64",
          isMobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          className
        )}
        dir="rtl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-sidebar z-10 border-b border-sidebar-border">
          <div className="flex items-center justify-center gap-3 p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-sidebar-foreground">
                نظام الصيدلية
              </h2>
              <p className="text-xs text-sidebar-foreground/60">
                Pharmacy ERP
              </p>
            </div>
          </div>
        </div>

        {/* Menu Tree */}
        <nav className="p-4 space-y-1">
          {menuData.map((item) => (
            <TreeNode
              key={item.id}
              item={item}
              level={0}
              expandedNodes={menuState.expandedNodes}
              onToggle={handleToggle}
              onSelect={handleSelect}
            />
          ))}
        </nav>

        {/* Footer */}
        <div className="sticky bottom-0 bg-sidebar border-t border-sidebar-border p-4 text-center">
          <p className="text-xs text-sidebar-foreground/50">
            © 2024 نظام إدارة الصيدليات
          </p>
        </div>
      </aside>
    </>
  );
};
