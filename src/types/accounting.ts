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

// ============================================================================
// JOURNAL ENTRIES TYPES (Phase 4)
// ============================================================================

/**
 * Source modules that can create journal entries
 */
export type JournalSourceModule = 
  | "sales" 
  | "purchases" 
  | "inventory" 
  | "pos" 
  | "manual"
  | "returns"
  | "adjustments";

/**
 * GL Journal Entry Header
 * Maps to public.gl_journal_entries table
 */
export interface GlJournalEntry {
  id: string;
  entryNo: string;              // Maps to entry_no
  entryDate: string;            // Maps to entry_date (ISO date string)
  postingDate: string;          // Maps to posting_date (ISO date string)
  description?: string;
  sourceModule?: JournalSourceModule; // Maps to source_module
  sourceDocumentId?: string;    // Maps to source_document_id
  branchId?: string | null;     // Maps to branch_id
  isPosted: boolean;            // Maps to is_posted
  isReversed: boolean;          // Maps to is_reversed
  reversedBy?: string | null;   // Maps to reversed_by (ID of reversing entry)
  createdBy?: string;           // Maps to created_by (auth user id)
  createdAt: string;            // Maps to created_at (ISO timestamp)
  updatedAt: string;            // Maps to updated_at (ISO timestamp)
}

/**
 * GL Journal Entry Line (Detail)
 * Maps to public.gl_journal_lines table
 */
export interface GlJournalLine {
  id: string;
  journalId: string;            // Maps to journal_id
  accountId: string;            // Maps to account_id
  debit: number;
  credit: number;
  description?: string;
  costCenterId?: string | null; // Maps to cost_center_id
  branchId?: string | null;     // Maps to branch_id
  lineNo: number;               // Maps to line_no
  createdAt: string;            // Maps to created_at (ISO timestamp)
}

/**
 * Insert type for creating new journal entries
 * Used when posting from various modules
 */
export interface GlJournalEntryInsert {
  entryNo?: string;             // If not provided, auto-generated
  entryDate: string;            // ISO date string
  postingDate?: string;         // ISO date string, defaults to today
  description?: string;
  sourceModule?: JournalSourceModule;
  sourceDocumentId?: string;
  branchId?: string | null;
  isPosted?: boolean;           // Default: true
  lines: GlJournalLineInsert[]; // Must have at least 2 lines
}

/**
 * Insert type for journal entry lines
 */
export interface GlJournalLineInsert {
  accountId: string;            // GL account ID (must exist and be active)
  debit?: number;               // Either debit OR credit must be > 0
  credit?: number;              // Either debit OR credit must be > 0
  description?: string;
  costCenterId?: string | null;
  branchId?: string | null;
  lineNo: number;               // Line ordering (1, 2, 3, ...)
}

/**
 * Full journal entry with its lines (joined data)
 * Used for display and reporting
 */
export interface GlJournalEntryWithLines extends GlJournalEntry {
  lines: GlJournalLine[];
  totalDebit?: number;          // Computed sum of debit lines
  totalCredit?: number;         // Computed sum of credit lines
}

/**
 * Journal entry validation result
 */
export interface JournalValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Helper type for building journal entries programmatically
 */
export interface JournalEntryBuilder {
  date: string;
  description: string;
  sourceModule?: JournalSourceModule;
  sourceDocumentId?: string;
  lines: Array<{
    accountCode: string;        // Will be resolved to accountId
    debit?: number;
    credit?: number;
    description?: string;
  }>;
}

// ============================================================================
// ACCOUNT MAPPING TYPES (Phase 5)
// ============================================================================

/**
 * ERP Account Mapping
 * Maps ERP modules/operations to GL accounts for automatic posting
 */
export interface ErpAccountMapping {
  id: string;
  module: string;              // 'sales', 'purchases', 'inventory', 'cash', 'pos'
  operation: string;           // 'invoice_cash', 'invoice_credit', 'purchase_invoice', etc.
  branchId?: string | null;    // Branch-specific mapping (optional)
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  notes?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Insert type for creating new account mappings
 */
export interface ErpAccountMappingInsert {
  module: string;
  operation: string;
  branchId?: string | null;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  notes?: string;
  isActive?: boolean;
}

/**
 * Update type for modifying account mappings
 */
export interface ErpAccountMappingUpdate {
  module?: string;
  operation?: string;
  branchId?: string | null;
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  notes?: string;
  isActive?: boolean;
}

/**
 * Account mapping lookup result
 */
export interface AccountMappingResult {
  debitAccountId?: string | null;
  creditAccountId?: string | null;
  notes?: string;
}
