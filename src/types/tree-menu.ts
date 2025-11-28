import { LucideIcon } from "lucide-react";

export interface TreeMenuItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  route?: string;
  children?: TreeMenuItem[];
  isExpanded?: boolean;
}

export interface TreeMenuState {
  expandedNodes: string[];
  selectedNode: string | null;
}
