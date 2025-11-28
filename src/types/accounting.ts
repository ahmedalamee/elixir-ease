// TypeScript types matching existing gl_accounts table structure in Supabase

export type AccountType = 
  | "asset" 
  | "liability" 
  | "equity" 
  | "revenue" 
  | "expense" 
  | "cogs";

/**
 * GL Account interface matching existing database schema
 * Maps to public.gl_accounts table
 */
export interface GlAccount {
  id: string;
  accountCode: string;        // Maps to account_code
  accountName: string;         // Maps to account_name
  accountNameEn: string | null; // Maps to account_name_en
  accountType: AccountType;    // Maps to account_type
  parentAccountId: string | null; // Maps to parent_account_id
  isActive: boolean;
  isHeader: boolean;           // If true, this is a parent/header account (no direct postings)
  currency: string;            // Default: 'SAR'
  description: string | null;
  createdAt: string;          // Maps to created_at
  updatedAt: string;          // Maps to updated_at
}

/**
 * Insert type for creating new GL accounts
 */
export interface GlAccountInsert {
  accountCode: string;
  accountName: string;
  accountNameEn?: string | null;
  accountType: AccountType;
  parentAccountId?: string | null;
  isActive?: boolean;
  isHeader?: boolean;
  currency?: string;
  description?: string | null;
}

/**
 * Update type for modifying GL accounts
 */
export interface GlAccountUpdate {
  accountCode?: string;
  accountName?: string;
  accountNameEn?: string | null;
  accountType?: AccountType;
  parentAccountId?: string | null;
  isActive?: boolean;
  isHeader?: boolean;
  currency?: string;
  description?: string | null;
}

/**
 * Tree node structure for hierarchical display
 * Used by the Chart of Accounts UI components
 */
export interface GlAccountTreeNode extends GlAccount {
  children?: GlAccountTreeNode[];
  level?: number; // Computed during tree building
}
