import { supabase } from "@/integrations/supabase/client";
import type { GlAccount, GlAccountTreeNode, GlAccountInsert, GlAccountUpdate } from "@/types/accounting";

/**
 * Fetch all GL accounts from database
 * TODO: Replace this with actual API call when Chart of Accounts UI is connected
 */
export async function fetchGlAccounts(): Promise<GlAccount[]> {
  const { data, error } = await supabase
    .from("gl_accounts")
    .select("*")
    .order("account_code", { ascending: true });

  if (error) {
    console.error("Error fetching GL accounts:", error);
    throw error;
  }

  // Map database snake_case to camelCase
  return (data || []).map(mapDbAccountToGlAccount);
}

/**
 * Fetch GL accounts and build hierarchical tree structure
 * TODO: This will be used by AccountsTreeView component in Phase 2
 */
export async function fetchGlAccountsTree(): Promise<GlAccountTreeNode[]> {
  const accounts = await fetchGlAccounts();
  return buildAccountTree(accounts);
}

/**
 * Fetch single GL account by ID
 */
export async function fetchGlAccountById(id: string): Promise<GlAccount | null> {
  const { data, error } = await supabase
    .from("gl_accounts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching GL account:", error);
    throw error;
  }

  return data ? mapDbAccountToGlAccount(data) : null;
}

/**
 * Create new GL account
 * TODO: This will be called from Add Account dialog in Phase 2
 */
export async function createGlAccount(account: GlAccountInsert): Promise<GlAccount> {
  const { data, error } = await supabase
    .from("gl_accounts")
    .insert({
      account_code: account.accountCode,
      account_name: account.accountName,
      account_name_en: account.accountNameEn,
      account_type: account.accountType,
      parent_account_id: account.parentAccountId,
      is_active: account.isActive ?? true,
      is_header: account.isHeader ?? false,
      currency: account.currency ?? "YER",
      description: account.description,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating GL account:", error);
    throw error;
  }

  return mapDbAccountToGlAccount(data);
}

/**
 * Update existing GL account
 * TODO: This will be called from Edit Account dialog in Phase 2
 */
export async function updateGlAccount(id: string, updates: GlAccountUpdate): Promise<GlAccount> {
  const dbUpdates: Record<string, any> = {};
  
  if (updates.accountCode !== undefined) dbUpdates.account_code = updates.accountCode;
  if (updates.accountName !== undefined) dbUpdates.account_name = updates.accountName;
  if (updates.accountNameEn !== undefined) dbUpdates.account_name_en = updates.accountNameEn;
  if (updates.accountType !== undefined) dbUpdates.account_type = updates.accountType;
  if (updates.parentAccountId !== undefined) dbUpdates.parent_account_id = updates.parentAccountId;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.isHeader !== undefined) dbUpdates.is_header = updates.isHeader;
  if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
  if (updates.description !== undefined) dbUpdates.description = updates.description;

  const { data, error } = await supabase
    .from("gl_accounts")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating GL account:", error);
    throw error;
  }

  return mapDbAccountToGlAccount(data);
}

/**
 * Deactivate GL account (soft delete)
 * TODO: This will be called from Delete Account action in Phase 2
 */
export async function deactivateGlAccount(id: string): Promise<void> {
  const { error } = await supabase
    .from("gl_accounts")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating GL account:", error);
    throw error;
  }
}

/**
 * Helper: Map database record (snake_case) to TypeScript interface (camelCase)
 */
function mapDbAccountToGlAccount(dbAccount: any): GlAccount {
  return {
    id: dbAccount.id,
    accountCode: dbAccount.account_code,
    accountName: dbAccount.account_name,
    accountNameEn: dbAccount.account_name_en,
    accountType: dbAccount.account_type,
    parentAccountId: dbAccount.parent_account_id,
    isActive: dbAccount.is_active,
    isHeader: dbAccount.is_header,
    currency: dbAccount.currency,
    description: dbAccount.description,
    createdAt: dbAccount.created_at,
    updatedAt: dbAccount.updated_at,
  };
}

/**
 * Helper: Build hierarchical tree from flat account list
 * Computes level based on parent relationships (level 1 = root)
 */
function buildAccountTree(accounts: GlAccount[]): GlAccountTreeNode[] {
  const accountMap = new Map<string, GlAccountTreeNode>();
  const rootAccounts: GlAccountTreeNode[] = [];

  // First pass: create tree nodes with level 1 (root level)
  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [], level: 1 });
  });

  // Second pass: build parent-child relationships and compute levels
  accounts.forEach(account => {
    const node = accountMap.get(account.id)!;
    
    if (account.parentAccountId) {
      const parent = accountMap.get(account.parentAccountId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        node.level = (parent.level || 1) + 1;
      } else {
        // Parent not found, treat as root
        rootAccounts.push(node);
      }
    } else {
      // No parent, this is a root account
      rootAccounts.push(node);
    }
  });

  // Sort children by account code at each level
  const sortChildren = (nodes: GlAccountTreeNode[]) => {
    nodes.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    nodes.forEach(node => {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children);
      }
    });
  };

  sortChildren(rootAccounts);

  return rootAccounts;
}

// ============================================================================
// JOURNAL ENTRIES FUNCTIONS (Phase 4)
// ============================================================================

/**
 * Generate next journal entry number
 * Calls database function to get sequential entry number (JE-YYYY-NNNN)
 */
export async function generateJournalEntryNumber(): Promise<string> {
  const { data, error } = await supabase
    .rpc("generate_journal_entry_number");

  if (error) {
    console.error("Error generating journal entry number:", error);
    throw error;
  }

  return data;
}

/**
 * Validate journal entry lines before posting
 * Client-side validation (server also validates via trigger)
 */
export function validateJournalEntry(
  lines: Array<{ debit: number; credit: number }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have at least 2 lines
  if (lines.length < 2) {
    errors.push("القيد يجب أن يحتوي على سطرين على الأقل (مدين ودائن)");
  }

  // Calculate totals
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  // Must balance (allow tiny rounding differences)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    errors.push(
      `القيد غير متوازن: المدين = ${totalDebit.toFixed(3)}, الدائن = ${totalCredit.toFixed(3)}`
    );
  }

  // Each line must have either debit OR credit (not both, not neither)
  lines.forEach((line, index) => {
    const hasDebit = line.debit > 0;
    const hasCredit = line.credit > 0;

    if (!hasDebit && !hasCredit) {
      errors.push(`السطر ${index + 1}: يجب إدخال مبلغ مدين أو دائن`);
    }

    if (hasDebit && hasCredit) {
      errors.push(`السطر ${index + 1}: لا يمكن إدخال مدين ودائن معاً`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create journal entry with lines in a single transaction
 * This is the main function for posting journal entries
 * 
 * @param entry - Journal entry header data
 * @param lines - Array of journal lines (debits and credits)
 * @returns Created journal entry with ID
 */
export async function createJournalEntry(
  entry: {
    entryDate: string;
    postingDate?: string;
    description?: string;
    sourceModule?: string;
    sourceDocumentId?: string;
    branchId?: string | null;
    isPosted?: boolean;
  },
  lines: Array<{
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
    costCenterId?: string | null;
    branchId?: string | null;
    lineNo: number;
  }>
): Promise<{ journalId: string; entryNo: string }> {
  // Client-side validation
  const validation = validateJournalEntry(
    lines.map((l) => ({ debit: l.debit || 0, credit: l.credit || 0 }))
  );

  if (!validation.isValid) {
    throw new Error(
      "فشل التحقق من القيد:\n" + validation.errors.join("\n")
    );
  }

  // Generate entry number if not provided
  const entryNo = await generateJournalEntryNumber();

  // Insert journal entry header
  const { data: journalData, error: journalError } = await supabase
    .from("gl_journal_entries")
    .insert({
      entry_no: entryNo,
      entry_date: entry.entryDate,
      posting_date: entry.postingDate || new Date().toISOString().split("T")[0],
      description: entry.description,
      source_module: entry.sourceModule,
      source_document_id: entry.sourceDocumentId,
      branch_id: entry.branchId,
      is_posted: entry.isPosted ?? false, // Start as draft by default
      is_reversed: false,
    })
    .select()
    .single();

  if (journalError) {
    console.error("Error creating journal entry:", journalError);
    throw journalError;
  }

  // Insert journal lines
  const linesToInsert = lines.map((line) => ({
    journal_id: journalData.id,
    account_id: line.accountId,
    debit: line.debit || 0,
    credit: line.credit || 0,
    description: line.description,
    cost_center_id: line.costCenterId,
    branch_id: line.branchId,
    line_no: line.lineNo,
  }));

  const { error: linesError } = await supabase
    .from("gl_journal_lines")
    .insert(linesToInsert);

  if (linesError) {
    console.error("Error creating journal lines:", linesError);
    // Cleanup: delete the header if lines failed
    await supabase
      .from("gl_journal_entries")
      .delete()
      .eq("id", journalData.id);
    throw linesError;
  }

  return {
    journalId: journalData.id,
    entryNo: journalData.entry_no,
  };
}

/**
 * Fetch journal entry with its lines
 * Used for viewing journal entry details
 */
export async function fetchJournalEntryWithLines(
  journalId: string
): Promise<any> {
  // Fetch journal header
  const { data: journal, error: journalError } = await supabase
    .from("gl_journal_entries")
    .select("*")
    .eq("id", journalId)
    .single();

  if (journalError) {
    console.error("Error fetching journal entry:", journalError);
    throw journalError;
  }

  // Fetch journal lines
  const { data: lines, error: linesError } = await supabase
    .from("gl_journal_lines")
    .select(`
      *,
      gl_accounts(account_code, account_name)
    `)
    .eq("journal_id", journalId)
    .order("line_no");

  if (linesError) {
    console.error("Error fetching journal lines:", linesError);
    throw linesError;
  }

  return {
    ...journal,
    lines: lines || [],
  };
}

/**
 * Fetch all journal entries with optional filters
 * Used for journal entry list/report pages
 */
export async function fetchJournalEntries(filters?: {
  startDate?: string;
  endDate?: string;
  sourceModule?: string;
  isPosted?: boolean;
}): Promise<any[]> {
  let query = supabase
    .from("gl_journal_entries")
    .select("*")
    .order("entry_date", { ascending: false })
    .order("entry_no", { ascending: false });

  if (filters?.startDate) {
    query = query.gte("entry_date", filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte("entry_date", filters.endDate);
  }

  if (filters?.sourceModule) {
    query = query.eq("source_module", filters.sourceModule);
  }

  if (filters?.isPosted !== undefined) {
    query = query.eq("is_posted", filters.isPosted);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching journal entries:", error);
    throw error;
  }

  return data || [];
}

/**
 * Post (approve) a draft journal entry
 * Triggers balance validation on the database side
 */
export async function postJournalEntry(journalId: string): Promise<void> {
  const { error } = await supabase
    .from("gl_journal_entries")
    .update({ is_posted: true, posting_date: new Date().toISOString().split("T")[0] })
    .eq("id", journalId)
    .eq("is_posted", false); // Only post if currently draft

  if (error) {
    console.error("Error posting journal entry:", error);
    throw error;
  }
}

/**
 * TODO (Phase 5): Implement journal entry reversal
 * Creates a reversing entry with opposite debit/credit amounts
 */
export async function reverseJournalEntry(
  journalId: string,
  reversalDate: string,
  description?: string
): Promise<string> {
  // TODO: Implement reversal logic
  // 1. Fetch original journal entry and lines
  // 2. Create new entry with opposite debits/credits
  // 3. Mark both entries with reversed_by relationship
  // 4. Return new journal entry ID
  throw new Error("Journal entry reversal not yet implemented");
}
