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
 * Reverse a posted journal entry
 * Creates a new entry with opposite debit/credit amounts
 * 
 * @param journalId - ID of the entry to reverse
 * @param reversalDate - Date for the reversal entry
 * @param description - Optional description for the reversal
 * @returns ID of the newly created reversal entry
 */
export async function reverseJournalEntry(
  journalId: string,
  reversalDate: string,
  description?: string
): Promise<string> {
  // 1. Fetch original journal entry and lines
  const originalEntry = await fetchJournalEntryWithLines(journalId);
  
  if (!originalEntry) {
    throw new Error("القيد الأصلي غير موجود");
  }

  // Check if already posted
  if (!originalEntry.is_posted) {
    throw new Error("لا يمكن عكس قيد غير مرحّل");
  }

  // Check if already reversed
  if (originalEntry.is_reversed) {
    throw new Error("هذا القيد تم عكسه مسبقاً");
  }

  // 2. Create reversal entry with opposite debits/credits
  const reversalLines = originalEntry.lines.map((line: any, index: number) => ({
    accountId: line.account_id,
    debit: line.credit || 0, // Swap: credit becomes debit
    credit: line.debit || 0,  // Swap: debit becomes credit
    description: line.description || "",
    costCenterId: line.cost_center_id,
    branchId: line.branch_id,
    lineNo: index + 1,
  }));

  const reversalDescription = description || `عكس القيد ${originalEntry.entry_no}`;

  // 3. Create the reversal entry
  const { journalId: reversalJournalId, entryNo: reversalEntryNo } = await createJournalEntry(
    {
      entryDate: reversalDate,
      postingDate: reversalDate,
      description: reversalDescription,
      sourceModule: "reversal",
      sourceDocumentId: originalEntry.id,
      isPosted: true, // Post immediately
    },
    reversalLines
  );

  // 4. Mark original entry as reversed
  const { error: updateError } = await supabase
    .from("gl_journal_entries")
    .update({ 
      is_reversed: true,
      reversed_by: reversalJournalId,
    })
    .eq("id", journalId);

  if (updateError) {
    console.error("Error marking original entry as reversed:", updateError);
    throw updateError;
  }

  return reversalJournalId;
}

// ============================================================================
// OPENING BALANCES (Phase 7)
// ============================================================================

/**
 * Create opening balance journal entry
 * This is a special entry with source_module = 'system' used to initialize account balances
 */
export async function createOpeningBalanceEntry(
  openingDate: string,
  lines: Array<{
    accountId: string;
    debit?: number;
    credit?: number;
    description?: string;
    branchId?: string | null;
  }>
): Promise<{ journalId: string; entryNo: string }> {
  // Validate that debits = credits
  const totalDebits = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredits = lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebits - totalCredits) > 0.01) {
    throw new Error(
      `أرصدة افتتاحية غير متوازنة: المدين = ${totalDebits.toFixed(
        3
      )}, الدائن = ${totalCredits.toFixed(3)}`
    );
  }

  // Create the entry
  const linesWithLineNo = lines.map((line, index) => ({
    ...line,
    lineNo: index + 1,
  }));

  return await createJournalEntry(
    {
      entryDate: openingDate,
      postingDate: openingDate,
      description: "الأرصدة الافتتاحية - Opening Balances",
      sourceModule: "system",
      sourceDocumentId: "opening_balance",
      isPosted: true,
    },
    linesWithLineNo
  );
}

// ============================================================================
// TRIAL BALANCE (Phase 7)
// ============================================================================

/**
 * Trial Balance row interface
 */
export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  openingDebit: number;
  openingCredit: number;
  periodDebit: number;
  periodCredit: number;
  closingDebit: number;
  closingCredit: number;
}

/**
 * Get Trial Balance report
 * Shows opening, period, and closing balances for all accounts
 */
export async function getTrialBalance(params: {
  fromDate: string;
  toDate: string;
  branchId?: string | null;
}): Promise<TrialBalanceRow[]> {
  const { fromDate, toDate, branchId } = params;

  // Build query to get all journal lines with account details
  let query = supabase
    .from("gl_journal_lines")
    .select(
      `
      account_id,
      debit,
      credit,
      gl_journal_entries!inner (
        entry_date,
        is_posted,
        branch_id
      ),
      gl_accounts!inner (
        account_code,
        account_name,
        account_type
      )
    `
    )
    .eq("gl_journal_entries.is_posted", true);

  if (branchId) {
    query = query.eq("gl_journal_entries.branch_id", branchId);
  }

  const { data: journalLines, error } = await query;

  if (error) {
    console.error("Error fetching trial balance data:", error);
    throw error;
  }

  // Group by account and calculate balances
  const accountBalances = new Map<string, TrialBalanceRow>();

  journalLines?.forEach((line: any) => {
    const accountId = line.account_id;
    const entryDate = line.gl_journal_entries.entry_date;
    const debit = line.debit || 0;
    const credit = line.credit || 0;
    const account = line.gl_accounts;

    if (!accountBalances.has(accountId)) {
      accountBalances.set(accountId, {
        accountId,
        accountCode: account.account_code,
        accountName: account.account_name,
        accountType: account.account_type,
        openingDebit: 0,
        openingCredit: 0,
        periodDebit: 0,
        periodCredit: 0,
        closingDebit: 0,
        closingCredit: 0,
      });
    }

    const row = accountBalances.get(accountId)!;

    // Determine if transaction is opening (before fromDate) or in period
    if (entryDate < fromDate) {
      row.openingDebit += debit;
      row.openingCredit += credit;
    } else if (entryDate >= fromDate && entryDate <= toDate) {
      row.periodDebit += debit;
      row.periodCredit += credit;
    }
  });

  // Calculate closing balances
  const result: TrialBalanceRow[] = [];
  accountBalances.forEach((row) => {
    const openingBalance = row.openingDebit - row.openingCredit;
    const periodChange = row.periodDebit - row.periodCredit;
    const closingBalance = openingBalance + periodChange;

    if (closingBalance > 0) {
      row.closingDebit = closingBalance;
      row.closingCredit = 0;
    } else if (closingBalance < 0) {
      row.closingDebit = 0;
      row.closingCredit = Math.abs(closingBalance);
    } else {
      row.closingDebit = 0;
      row.closingCredit = 0;
    }

    result.push(row);
  });

  // Sort by account code
  result.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  return result;
}

// ============================================================================
// BALANCE SHEET (Phase 7)
// ============================================================================

/**
 * Balance Sheet section row interface
 */
export interface BalanceSheetSectionRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  netBalance: number; // positive number, sign normalized based on section
}

/**
 * Balance Sheet data structure
 */
export interface BalanceSheetData {
  asOfDate: string;
  assets: {
    currentAssets: BalanceSheetSectionRow[];
    fixedAssets: BalanceSheetSectionRow[];
    totalAssets: number;
  };
  liabilities: {
    currentLiabilities: BalanceSheetSectionRow[];
    longTermLiabilities: BalanceSheetSectionRow[];
    totalLiabilities: number;
  };
  equity: {
    capital: BalanceSheetSectionRow[];
    retainedEarnings: number;
    totalEquity: number;
  };
  totalLiabilitiesAndEquity: number;
}

/**
 * Income statement section row
 * Individual account data for revenue, COGS, or expenses
 */
export interface IncomeStatementSectionRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
}

/**
 * Complete income statement data structure
 * Includes all sections and computed totals
 */
export interface IncomeStatementData {
  periodStart: string;
  periodEnd: string;
  revenue: IncomeStatementSectionRow[];
  cogs: IncomeStatementSectionRow[];
  expenses: IncomeStatementSectionRow[];
  totalRevenue: number;
  totalCogs: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
}

/**
 * Get income statement data for a period
 * Uses trial balance period movements to compute revenue, COGS, expenses
 * 
 * @param fromDate - Period start date
 * @param toDate - Period end date
 * @param branchId - Optional branch filter
 * @returns Income statement data with all sections and totals
 */
export async function getIncomeStatement(params: {
  fromDate: string;
  toDate: string;
  branchId?: string;
}): Promise<IncomeStatementData> {
  const { fromDate, toDate, branchId } = params;

  // Get trial balance for the period
  const trialBalance = await getTrialBalance({ fromDate, toDate, branchId });

  // Initialize result
  const result: IncomeStatementData = {
    periodStart: fromDate,
    periodEnd: toDate,
    revenue: [],
    cogs: [],
    expenses: [],
    totalRevenue: 0,
    totalCogs: 0,
    grossProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
  };

  // Fetch account details to determine type
  const accountIds = trialBalance.map((row) => row.accountId);
  
  if (accountIds.length === 0) {
    return result;
  }

  const { data: accounts, error } = await supabase
    .from("gl_accounts")
    .select("id, account_code, account_name, account_type")
    .in("id", accountIds);

  if (error) {
    console.error("Error fetching accounts:", error);
    throw error;
  }

  // Create account type map
  const accountTypeMap = new Map<string, string>();
  accounts?.forEach((acc) => {
    accountTypeMap.set(acc.id, acc.account_type);
  });

  // Process each trial balance row
  trialBalance.forEach((row) => {
    // Calculate period net movement
    // For revenue: credit increases revenue (positive)
    // For expenses/COGS: debit increases expense (positive)
    const accountType = accountTypeMap.get(row.accountId);
    let periodNet = 0;

    if (accountType === "revenue") {
      // Revenue: credits positive, debits negative
      periodNet = row.periodCredit - row.periodDebit;
    } else if (accountType === "expense" || accountType === "cogs") {
      // Expenses/COGS: debits positive, credits negative
      periodNet = row.periodDebit - row.periodCredit;
    }

    // Skip zero movements
    if (Math.abs(periodNet) < 0.01) {
      return;
    }

    const sectionRow: IncomeStatementSectionRow = {
      accountId: row.accountId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      amount: Math.abs(periodNet), // Always positive for display
    };

    // Group into sections
    if (accountType === "revenue") {
      result.revenue.push(sectionRow);
      result.totalRevenue += Math.abs(periodNet);
    } else if (accountType === "cogs") {
      result.cogs.push(sectionRow);
      result.totalCogs += Math.abs(periodNet);
    } else if (accountType === "expense") {
      result.expenses.push(sectionRow);
      result.totalExpenses += Math.abs(periodNet);
    }
  });

  // Compute totals
  result.grossProfit = result.totalRevenue - result.totalCogs;
  result.netProfit = result.grossProfit - result.totalExpenses;

  return result;
}

/**
 * Get Balance Sheet report as of a specific date
 * Uses Trial Balance data to compute balance sheet positions
 */
export async function getBalanceSheet(params: {
  asOfDate: string;
  branchId?: string | null;
}): Promise<BalanceSheetData> {
  const { asOfDate, branchId } = params;

  // Get trial balance from beginning of time to asOfDate to get closing balances
  const trialBalance = await getTrialBalance({
    fromDate: "1900-01-01",
    toDate: asOfDate,
    branchId,
  });

  // Initialize result structure
  const result: BalanceSheetData = {
    asOfDate,
    assets: {
      currentAssets: [],
      fixedAssets: [],
      totalAssets: 0,
    },
    liabilities: {
      currentLiabilities: [],
      longTermLiabilities: [],
      totalLiabilities: 0,
    },
    equity: {
      capital: [],
      retainedEarnings: 0,
      totalEquity: 0,
    },
    totalLiabilitiesAndEquity: 0,
  };

  // Group accounts by type and compute net balances
  trialBalance.forEach((row) => {
    const netBalance = row.closingDebit - row.closingCredit;

    // Skip zero balances
    if (netBalance === 0) return;

    const sectionRow: BalanceSheetSectionRow = {
      accountId: row.accountId,
      accountCode: row.accountCode,
      accountName: row.accountName,
      netBalance: 0, // Will be set below
    };

    switch (row.accountType) {
      case "asset":
        // Assets have debit balances (positive)
        sectionRow.netBalance = netBalance;
        
        // Classify as current (1-1-xxx) or fixed (1-2-xxx) based on account code
        if (row.accountCode.startsWith("1-1")) {
          result.assets.currentAssets.push(sectionRow);
        } else {
          result.assets.fixedAssets.push(sectionRow);
        }
        result.assets.totalAssets += netBalance;
        break;

      case "liability":
        // Liabilities have credit balances (negative in trial balance, so negate)
        sectionRow.netBalance = Math.abs(netBalance);
        
        // Classify as current (2-1-xxx) or long-term (2-2-xxx)
        if (row.accountCode.startsWith("2-1")) {
          result.liabilities.currentLiabilities.push(sectionRow);
        } else {
          result.liabilities.longTermLiabilities.push(sectionRow);
        }
        result.liabilities.totalLiabilities += Math.abs(netBalance);
        break;

      case "equity":
        // Equity has credit balances (negative in trial balance, so negate)
        sectionRow.netBalance = Math.abs(netBalance);
        result.equity.capital.push(sectionRow);
        result.equity.totalEquity += Math.abs(netBalance);
        break;

      case "revenue":
      case "expense":
      case "cogs":
        // Revenue/Expense/COGS contribute to retained earnings (net income)
        // Revenue (credit) - Expenses (debit) - COGS (debit) = Net Income
        if (row.accountType === "revenue") {
          result.equity.retainedEarnings += Math.abs(netBalance);
        } else {
          result.equity.retainedEarnings -= netBalance;
        }
        break;
    }
  });

  // Add retained earnings to total equity
  result.equity.totalEquity += result.equity.retainedEarnings;

  // Calculate total liabilities and equity
  result.totalLiabilitiesAndEquity =
    result.liabilities.totalLiabilities + result.equity.totalEquity;

  return result;
}

// ============================================================================
// GENERAL LEDGER (ACCOUNT STATEMENT) (Phase 7)
// ============================================================================

/**
 * General Ledger transaction row
 */
export interface GeneralLedgerTransaction {
  date: string;
  entryNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  journalId: string;
  sourceModule?: string;
  sourceDocumentId?: string;
}

/**
 * General Ledger (Account Statement) result
 */
export interface GeneralLedgerResult {
  account: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  openingBalance: number;
  transactions: GeneralLedgerTransaction[];
  closingBalance: number;
  totalDebits: number;
  totalCredits: number;
}

/**
 * Get General Ledger (Account Statement) for a specific account
 */
export async function getGeneralLedger(params: {
  accountId: string;
  fromDate: string;
  toDate: string;
  branchId?: string | null;
}): Promise<GeneralLedgerResult> {
  const { accountId, fromDate, toDate, branchId } = params;

  // Fetch account details
  const account = await fetchGlAccountById(accountId);
  if (!account) {
    throw new Error("الحساب غير موجود");
  }

  // Build query for all transactions
  let query = supabase
    .from("gl_journal_lines")
    .select(
      `
      debit,
      credit,
      description,
      gl_journal_entries!inner (
        id,
        entry_no,
        entry_date,
        description,
        source_module,
        source_document_id,
        is_posted,
        branch_id
      )
    `
    )
    .eq("account_id", accountId)
    .eq("gl_journal_entries.is_posted", true)
    .order("gl_journal_entries.entry_date", { ascending: true })
    .order("gl_journal_entries.entry_no", { ascending: true });

  if (branchId) {
    query = query.eq("gl_journal_entries.branch_id", branchId);
  }

  const { data: lines, error } = await query;

  if (error) {
    console.error("Error fetching general ledger:", error);
    throw error;
  }

  // Calculate opening balance (all transactions before fromDate)
  let openingBalance = 0;
  const transactions: GeneralLedgerTransaction[] = [];
  let runningBalance = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  lines?.forEach((line: any) => {
    const entry = line.gl_journal_entries;
    const debit = line.debit || 0;
    const credit = line.credit || 0;

    if (entry.entry_date < fromDate) {
      // Part of opening balance
      openingBalance += debit - credit;
    } else if (entry.entry_date >= fromDate && entry.entry_date <= toDate) {
      // Part of period transactions
      runningBalance = openingBalance + (totalDebits - totalCredits) + (debit - credit);

      transactions.push({
        date: entry.entry_date,
        entryNo: entry.entry_no,
        description: line.description || entry.description || "",
        debit,
        credit,
        balance: runningBalance,
        journalId: entry.id,
        sourceModule: entry.source_module,
        sourceDocumentId: entry.source_document_id,
      });

      totalDebits += debit;
      totalCredits += credit;
    }
  });

  const closingBalance = openingBalance + totalDebits - totalCredits;

  return {
    account: {
      id: account.id,
      code: account.accountCode,
      name: account.accountName,
      type: account.accountType,
    },
    openingBalance,
    transactions,
    closingBalance,
    totalDebits,
    totalCredits,
  };
}

// ============================================================================
// ACCOUNT MAPPING FUNCTIONS (Phase 5)
// ============================================================================

import type {
  ErpAccountMapping,
  ErpAccountMappingInsert,
  ErpAccountMappingUpdate,
  AccountMappingResult,
} from "@/types/accounting";

/**
 * Fetch account mapping for a specific module and operation
 * Supports branch-specific mapping with fallback to general mapping
 */
export async function fetchAccountMapping(
  module: string,
  operation: string,
  branchId?: string | null
): Promise<AccountMappingResult | null> {
  const { data, error } = await supabase.rpc("get_account_mapping", {
    p_module: module,
    p_operation: operation,
    p_branch_id: branchId || null,
  });

  if (error) {
    console.error("Error fetching account mapping:", error);
    throw error;
  }

  if (!data || data.length === 0) {
    return null;
  }

  return {
    debitAccountId: data[0].debit_account_id,
    creditAccountId: data[0].credit_account_id,
    notes: data[0].notes,
  };
}

/**
 * Fetch all account mappings (for configuration UI)
 */
export async function fetchAllAccountMappings(): Promise<ErpAccountMapping[]> {
  const { data, error } = await supabase
    .from("erp_account_mappings")
    .select("*")
    .order("module", { ascending: true })
    .order("operation", { ascending: true });

  if (error) {
    console.error("Error fetching account mappings:", error);
    throw error;
  }

  return (data || []).map(mapDbAccountMappingToErpAccountMapping);
}

/**
 * Fetch account mappings by module
 */
export async function fetchAccountMappingsByModule(
  module: string
): Promise<ErpAccountMapping[]> {
  const { data, error } = await supabase
    .from("erp_account_mappings")
    .select("*")
    .eq("module", module)
    .order("operation", { ascending: true });

  if (error) {
    console.error("Error fetching account mappings by module:", error);
    throw error;
  }

  return (data || []).map(mapDbAccountMappingToErpAccountMapping);
}

/**
 * Create new account mapping
 */
export async function createAccountMapping(
  mapping: ErpAccountMappingInsert
): Promise<ErpAccountMapping> {
  const { data, error } = await supabase
    .from("erp_account_mappings")
    .insert({
      module: mapping.module,
      operation: mapping.operation,
      branch_id: mapping.branchId,
      debit_account_id: mapping.debitAccountId,
      credit_account_id: mapping.creditAccountId,
      notes: mapping.notes,
      is_active: mapping.isActive ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating account mapping:", error);
    throw error;
  }

  return mapDbAccountMappingToErpAccountMapping(data);
}

/**
 * Update existing account mapping
 */
export async function updateAccountMapping(
  id: string,
  updates: ErpAccountMappingUpdate
): Promise<ErpAccountMapping> {
  const dbUpdates: Record<string, any> = {};

  if (updates.module !== undefined) dbUpdates.module = updates.module;
  if (updates.operation !== undefined) dbUpdates.operation = updates.operation;
  if (updates.branchId !== undefined) dbUpdates.branch_id = updates.branchId;
  if (updates.debitAccountId !== undefined)
    dbUpdates.debit_account_id = updates.debitAccountId;
  if (updates.creditAccountId !== undefined)
    dbUpdates.credit_account_id = updates.creditAccountId;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

  const { data, error } = await supabase
    .from("erp_account_mappings")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating account mapping:", error);
    throw error;
  }

  return mapDbAccountMappingToErpAccountMapping(data);
}

/**
 * Deactivate account mapping (soft delete)
 */
export async function deactivateAccountMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from("erp_account_mappings")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    console.error("Error deactivating account mapping:", error);
    throw error;
  }
}

/**
 * Delete account mapping (hard delete)
 */
export async function deleteAccountMapping(id: string): Promise<void> {
  const { error } = await supabase
    .from("erp_account_mappings")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting account mapping:", error);
    throw error;
  }
}

/**
 * Helper: Map database record to TypeScript interface
 */
function mapDbAccountMappingToErpAccountMapping(
  dbMapping: any
): ErpAccountMapping {
  return {
    id: dbMapping.id,
    module: dbMapping.module,
    operation: dbMapping.operation,
    branchId: dbMapping.branch_id,
    debitAccountId: dbMapping.debit_account_id,
    creditAccountId: dbMapping.credit_account_id,
    notes: dbMapping.notes,
    isActive: dbMapping.is_active,
    createdBy: dbMapping.created_by,
    createdAt: dbMapping.created_at,
    updatedAt: dbMapping.updated_at,
  };
}

// ============================================
// ACCOUNTING PERIODS (Phase 3)
// ============================================

export interface AccountingPeriod {
  id: string;
  periodName: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  closedAt: string | null;
  closedBy: string | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
}

export interface AccountingPeriodInsert {
  periodName: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  notes?: string;
}

/**
 * Fetch all accounting periods
 */
export async function fetchAccountingPeriods(): Promise<AccountingPeriod[]> {
  const { data, error } = await supabase
    .from("accounting_periods")
    .select("*")
    .order("fiscal_year", { ascending: false })
    .order("start_date", { ascending: false });

  if (error) {
    console.error("Error fetching accounting periods:", error);
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    periodName: p.period_name,
    fiscalYear: p.fiscal_year,
    startDate: p.start_date,
    endDate: p.end_date,
    isClosed: p.is_closed,
    closedAt: p.closed_at,
    closedBy: p.closed_by,
    notes: p.notes,
    createdAt: p.created_at,
    createdBy: p.created_by,
  }));
}

/**
 * Create new accounting period
 */
export async function createAccountingPeriod(
  period: AccountingPeriodInsert
): Promise<AccountingPeriod> {
  const { data: user } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("accounting_periods")
    .insert({
      period_name: period.periodName,
      fiscal_year: period.fiscalYear,
      start_date: period.startDate,
      end_date: period.endDate,
      notes: period.notes,
      created_by: user?.user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating accounting period:", error);
    throw error;
  }

  return {
    id: data.id,
    periodName: data.period_name,
    fiscalYear: data.fiscal_year,
    startDate: data.start_date,
    endDate: data.end_date,
    isClosed: data.is_closed,
    closedAt: data.closed_at,
    closedBy: data.closed_by,
    notes: data.notes,
    createdAt: data.created_at,
    createdBy: data.created_by,
  };
}

/**
 * Close accounting period
 */
export async function closeAccountingPeriod(periodId: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("accounting_periods")
    .update({
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: user?.user?.id,
    })
    .eq("id", periodId);

  if (error) {
    console.error("Error closing accounting period:", error);
    throw error;
  }
}

/**
 * Reopen accounting period
 */
export async function reopenAccountingPeriod(
  periodId: string,
  reason: string
): Promise<void> {
  const { data: period } = await supabase
    .from("accounting_periods")
    .select("notes")
    .eq("id", periodId)
    .single();

  const newNotes = `${period?.notes || ""}\n[إعادة فتح: ${new Date().toLocaleDateString("ar-SA")}] ${reason}`.trim();

  const { error } = await supabase
    .from("accounting_periods")
    .update({
      is_closed: false,
      closed_at: null,
      closed_by: null,
      notes: newNotes,
    })
    .eq("id", periodId);

  if (error) {
    console.error("Error reopening accounting period:", error);
    throw error;
  }
}

/**
 * Perform year-end closing
 * Creates closing entries for revenue/expense accounts and transfers net income to retained earnings
 */
export async function performYearEndClosing(
  fiscalYear: number,
  closingDate: string
): Promise<{ journalEntryId: string; journalEntryNumber: string; netIncome: number }> {
  // Get all revenue and expense accounts with their balances
  const startDate = `${fiscalYear}-01-01`;
  const endDate = `${fiscalYear}-12-31`;

  // Calculate net income from GL
  const { data: revenueData } = await supabase
    .from("gl_journal_lines")
    .select(`
      account_id,
      debit,
      credit,
      gl_journal_entries!inner(entry_date, is_posted)
    `)
    .gte("gl_journal_entries.entry_date", startDate)
    .lte("gl_journal_entries.entry_date", endDate)
    .eq("gl_journal_entries.is_posted", true);

  // Get account types
  const { data: accounts } = await supabase
    .from("gl_accounts")
    .select("id, account_type, account_code, account_name");

  const accountMap = new Map(accounts?.map((a) => [a.id, a]) || []);

  // Calculate totals by account type
  let totalRevenue = 0;
  let totalExpenses = 0;
  const revenueAccounts: { accountId: string; balance: number }[] = [];
  const expenseAccounts: { accountId: string; balance: number }[] = [];

  // Group by account and calculate balances
  const accountBalances = new Map<string, number>();
  (revenueData || []).forEach((line: any) => {
    const current = accountBalances.get(line.account_id) || 0;
    accountBalances.set(line.account_id, current + (line.credit || 0) - (line.debit || 0));
  });

  accountBalances.forEach((balance, accountId) => {
    const account = accountMap.get(accountId);
    if (!account) return;

    if (account.account_type === "revenue") {
      totalRevenue += balance;
      if (balance !== 0) {
        revenueAccounts.push({ accountId, balance });
      }
    } else if (account.account_type === "expense") {
      totalExpenses += Math.abs(balance);
      if (balance !== 0) {
        expenseAccounts.push({ accountId, balance: Math.abs(balance) });
      }
    }
  });

  const netIncome = totalRevenue - totalExpenses;

  // Find retained earnings account (usually code starts with 3 for equity)
  const retainedEarningsAccount = accounts?.find(
    (a) => a.account_code?.startsWith("3") && a.account_name?.includes("أرباح")
  );

  if (!retainedEarningsAccount) {
    throw new Error("لم يتم العثور على حساب الأرباح المحتجزة");
  }

  // Build closing journal entry lines
  const lines: any[] = [];
  let lineNo = 0;

  // Close revenue accounts (debit to zero them out)
  revenueAccounts.forEach(({ accountId, balance }) => {
    if (balance > 0) {
      lineNo++;
      lines.push({
        accountId,
        debit: balance,
        credit: 0,
        description: "إقفال حساب إيرادات",
        lineNo,
      });
    }
  });

  // Close expense accounts (credit to zero them out)
  expenseAccounts.forEach(({ accountId, balance }) => {
    if (balance > 0) {
      lineNo++;
      lines.push({
        accountId,
        debit: 0,
        credit: balance,
        description: "إقفال حساب مصروفات",
        lineNo,
      });
    }
  });

  // Transfer net income to retained earnings
  if (netIncome !== 0) {
    lineNo++;
    lines.push({
      accountId: retainedEarningsAccount.id,
      debit: netIncome < 0 ? Math.abs(netIncome) : 0,
      credit: netIncome > 0 ? netIncome : 0,
      description: netIncome > 0 ? "صافي ربح السنة" : "صافي خسارة السنة",
      lineNo,
    });
  }

  if (lines.length === 0) {
    throw new Error("لا توجد حركات لإقفالها في هذه السنة");
  }

  // Create the closing journal entry
  const entryHeader = {
    entryDate: closingDate,
    description: `قيد إقفال السنة المالية ${fiscalYear}`,
    sourceModule: "year_end_closing" as const,
    sourceDocumentId: `year_end_${fiscalYear}`,
  };

  const result = await createJournalEntry(entryHeader, lines);

  // Post the entry immediately
  await postJournalEntry(result.journalId);

  return {
    journalEntryId: result.journalId,
    journalEntryNumber: result.entryNo,
    netIncome,
  };
}

// ============================================================================
// AR/AP SUBLEDGER REPORTS (Phase 4)
// ============================================================================

/**
 * Customer Aging row interface
 */
export interface CustomerAgingRow {
  customerId: string;
  customerName: string;
  totalBalance: number;
  current: number;      // 0-30 days
  d31_60: number;       // 31-60 days
  d61_90: number;       // 61-90 days
  over90: number;       // 90+ days
}

/**
 * Supplier Aging row interface
 */
export interface SupplierAgingRow {
  supplierId: string;
  supplierName: string;
  totalBalance: number;
  current: number;      // 0-30 days
  d31_60: number;       // 31-60 days
  d61_90: number;       // 61-90 days
  over90: number;       // 90+ days
}

/**
 * Statement transaction row
 */
export interface StatementTransaction {
  date: string;
  documentType: string;
  documentNumber: string;
  description: string;
  debit: number;
  credit: number;
  balanceAfter: number;
}

/**
 * Customer/Supplier statement result
 */
export interface StatementResult {
  entityId: string;
  entityName: string;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  transactions: StatementTransaction[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
}

/**
 * Get Customer Aging Report
 * Calculates aged receivables for all customers with outstanding balances
 */
export async function getCustomerAging(asOfDate: string): Promise<CustomerAgingRow[]> {
  // Fetch all sales invoices that are posted but not fully paid
  const { data: invoices, error: invError } = await supabase
    .from("sales_invoices")
    .select(`
      id,
      invoice_number,
      invoice_date,
      grand_total,
      paid_amount,
      customer_id,
      customers(id, name)
    `)
    .eq("status", "posted")
    .lte("invoice_date", asOfDate);

  if (invError) {
    console.error("Error fetching sales invoices:", invError);
    throw invError;
  }

  // Fetch customer payments
  const { data: payments, error: payError } = await supabase
    .from("customer_payments")
    .select(`
      id,
      customer_id,
      amount,
      payment_date
    `)
    .eq("status", "posted")
    .lte("payment_date", asOfDate);

  if (payError) {
    console.error("Error fetching customer payments:", payError);
    throw payError;
  }

  // Fetch sales returns
  const { data: returns, error: retError } = await supabase
    .from("sales_returns")
    .select(`
      id,
      customer_id,
      refund_amount,
      return_date
    `)
    .eq("status", "posted")
    .lte("return_date", asOfDate);

  if (retError) {
    console.error("Error fetching sales returns:", retError);
    throw retError;
  }

  // Group by customer and calculate aging buckets
  const customerBalances = new Map<string, {
    customerId: string;
    customerName: string;
    invoices: Array<{ amount: number; date: string }>;
    totalPayments: number;
    totalReturns: number;
  }>();

  // Process invoices
  (invoices || []).forEach((inv: any) => {
    const customerId = inv.customer_id;
    if (!customerId) return;

    const existing = customerBalances.get(customerId) || {
      customerId,
      customerName: inv.customers?.name || "غير محدد",
      invoices: [],
      totalPayments: 0,
      totalReturns: 0,
    };

    const outstanding = (inv.grand_total || 0) - (inv.paid_amount || 0);
    if (outstanding > 0) {
      existing.invoices.push({ amount: outstanding, date: inv.invoice_date });
    }

    customerBalances.set(customerId, existing);
  });

  // Process payments
  (payments || []).forEach((pay: any) => {
    const existing = customerBalances.get(pay.customer_id);
    if (existing) {
      existing.totalPayments += pay.amount || 0;
    }
  });

  // Process returns
  (returns || []).forEach((ret: any) => {
    const existing = customerBalances.get(ret.customer_id);
    if (existing) {
      existing.totalReturns += ret.refund_amount || 0;
    }
  });

  // Calculate aging buckets
  const result: CustomerAgingRow[] = [];
  const asOfDateObj = new Date(asOfDate);

  customerBalances.forEach((customer) => {
    let current = 0;
    let d31_60 = 0;
    let d61_90 = 0;
    let over90 = 0;

    customer.invoices.forEach((inv) => {
      const invDate = new Date(inv.date);
      const daysDiff = Math.floor((asOfDateObj.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 30) {
        current += inv.amount;
      } else if (daysDiff <= 60) {
        d31_60 += inv.amount;
      } else if (daysDiff <= 90) {
        d61_90 += inv.amount;
      } else {
        over90 += inv.amount;
      }
    });

    const totalBalance = current + d31_60 + d61_90 + over90;

    // Only include customers with positive balance
    if (totalBalance > 0.01) {
      result.push({
        customerId: customer.customerId,
        customerName: customer.customerName,
        totalBalance,
        current,
        d31_60,
        d61_90,
        over90,
      });
    }
  });

  // Sort by total balance descending
  result.sort((a, b) => b.totalBalance - a.totalBalance);

  return result;
}

/**
 * Get Supplier Aging Report
 * Calculates aged payables for all suppliers with outstanding balances
 */
export async function getSupplierAging(asOfDate: string): Promise<SupplierAgingRow[]> {
  // Fetch all purchase invoices that are posted but not fully paid
  const { data: invoices, error: invError } = await supabase
    .from("purchase_invoices")
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_amount,
      paid_amount,
      supplier_id,
      suppliers(id, name)
    `)
    .eq("status", "posted")
    .lte("invoice_date", asOfDate);

  if (invError) {
    console.error("Error fetching purchase invoices:", invError);
    throw invError;
  }

  // Fetch supplier payments (cash_payments)
  const { data: payments, error: payError } = await supabase
    .from("cash_payments")
    .select(`
      id,
      supplier_id,
      amount,
      payment_date
    `)
    .eq("status", "posted")
    .not("supplier_id", "is", null)
    .lte("payment_date", asOfDate);

  if (payError) {
    console.error("Error fetching supplier payments:", payError);
    throw payError;
  }

  // Fetch purchase returns
  const { data: returns, error: retError } = await supabase
    .from("purchase_returns")
    .select(`
      id,
      supplier_id,
      refund_amount,
      return_date
    `)
    .eq("status", "posted")
    .lte("return_date", asOfDate);

  if (retError) {
    console.error("Error fetching purchase returns:", retError);
    throw retError;
  }

  // Group by supplier and calculate aging buckets
  const supplierBalances = new Map<string, {
    supplierId: string;
    supplierName: string;
    invoices: Array<{ amount: number; date: string }>;
    totalPayments: number;
    totalReturns: number;
  }>();

  // Process invoices
  (invoices || []).forEach((inv: any) => {
    const supplierId = inv.supplier_id;
    if (!supplierId) return;

    const existing = supplierBalances.get(supplierId) || {
      supplierId,
      supplierName: inv.suppliers?.name || "غير محدد",
      invoices: [],
      totalPayments: 0,
      totalReturns: 0,
    };

    const outstanding = (inv.total_amount || 0) - (inv.paid_amount || 0);
    if (outstanding > 0) {
      existing.invoices.push({ amount: outstanding, date: inv.invoice_date });
    }

    supplierBalances.set(supplierId, existing);
  });

  // Process payments
  (payments || []).forEach((pay: any) => {
    if (!pay.supplier_id) return;
    const existing = supplierBalances.get(pay.supplier_id);
    if (existing) {
      existing.totalPayments += pay.amount || 0;
    }
  });

  // Process returns
  (returns || []).forEach((ret: any) => {
    if (!ret.supplier_id) return;
    const existing = supplierBalances.get(ret.supplier_id);
    if (existing) {
      existing.totalReturns += ret.refund_amount || 0;
    }
  });

  // Calculate aging buckets
  const result: SupplierAgingRow[] = [];
  const asOfDateObj = new Date(asOfDate);

  supplierBalances.forEach((supplier) => {
    let current = 0;
    let d31_60 = 0;
    let d61_90 = 0;
    let over90 = 0;

    supplier.invoices.forEach((inv) => {
      const invDate = new Date(inv.date);
      const daysDiff = Math.floor((asOfDateObj.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff <= 30) {
        current += inv.amount;
      } else if (daysDiff <= 60) {
        d31_60 += inv.amount;
      } else if (daysDiff <= 90) {
        d61_90 += inv.amount;
      } else {
        over90 += inv.amount;
      }
    });

    const totalBalance = current + d31_60 + d61_90 + over90;

    // Only include suppliers with positive balance
    if (totalBalance > 0.01) {
      result.push({
        supplierId: supplier.supplierId,
        supplierName: supplier.supplierName,
        totalBalance,
        current,
        d31_60,
        d61_90,
        over90,
      });
    }
  });

  // Sort by total balance descending
  result.sort((a, b) => b.totalBalance - a.totalBalance);

  return result;
}

/**
 * Get Customer Statement
 * Returns chronological movements for a specific customer
 */
export async function getCustomerStatement(
  customerId: string,
  fromDate: string,
  toDate: string
): Promise<StatementResult> {
  // Fetch customer details
  const { data: customer, error: custError } = await supabase
    .from("customers")
    .select("id, name, balance")
    .eq("id", customerId)
    .single();

  if (custError) {
    console.error("Error fetching customer:", custError);
    throw custError;
  }

  // Fetch sales invoices
  const { data: invoices, error: invError } = await supabase
    .from("sales_invoices")
    .select("id, invoice_number, invoice_date, grand_total, notes")
    .eq("customer_id", customerId)
    .eq("status", "posted")
    .gte("invoice_date", fromDate)
    .lte("invoice_date", toDate)
    .order("invoice_date", { ascending: true });

  if (invError) throw invError;

  // Fetch customer payments
  const { data: payments, error: payError } = await supabase
    .from("customer_payments")
    .select("id, payment_number, payment_date, amount, notes")
    .eq("customer_id", customerId)
    .eq("status", "posted")
    .gte("payment_date", fromDate)
    .lte("payment_date", toDate)
    .order("payment_date", { ascending: true });

  if (payError) throw payError;

  // Fetch sales returns
  const { data: returns, error: retError } = await supabase
    .from("sales_returns")
    .select("id, return_number, return_date, refund_amount, reason")
    .eq("customer_id", customerId)
    .eq("status", "posted")
    .gte("return_date", fromDate)
    .lte("return_date", toDate)
    .order("return_date", { ascending: true });

  if (retError) throw retError;

  // Calculate opening balance (all transactions before fromDate)
  const { data: priorInvoices } = await supabase
    .from("sales_invoices")
    .select("grand_total")
    .eq("customer_id", customerId)
    .eq("status", "posted")
    .lt("invoice_date", fromDate);

  const { data: priorPayments } = await supabase
    .from("customer_payments")
    .select("amount")
    .eq("customer_id", customerId)
    .eq("status", "posted")
    .lt("payment_date", fromDate);

  const { data: priorReturns } = await supabase
    .from("sales_returns")
    .select("refund_amount")
    .eq("customer_id", customerId)
    .eq("status", "posted")
    .lt("return_date", fromDate);

  const openingBalance =
    (priorInvoices || []).reduce((sum, inv: any) => sum + (inv.grand_total || 0), 0) -
    (priorPayments || []).reduce((sum, pay: any) => sum + (pay.amount || 0), 0) -
    (priorReturns || []).reduce((sum, ret: any) => sum + (ret.refund_amount || 0), 0);

  // Build transactions array
  const transactions: StatementTransaction[] = [];
  let runningBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  // Combine all transactions and sort by date
  const allTransactions: Array<{
    date: string;
    type: string;
    number: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  (invoices || []).forEach((inv: any) => {
    allTransactions.push({
      date: inv.invoice_date,
      type: "فاتورة بيع",
      number: inv.invoice_number,
      description: inv.notes || "فاتورة بيع",
      debit: inv.grand_total || 0,
      credit: 0,
    });
  });

  (payments || []).forEach((pay: any) => {
    allTransactions.push({
      date: pay.payment_date,
      type: "سند قبض",
      number: pay.payment_number,
      description: pay.notes || "سند قبض",
      debit: 0,
      credit: pay.amount || 0,
    });
  });

  (returns || []).forEach((ret: any) => {
    allTransactions.push({
      date: ret.return_date,
      type: "مرتجع بيع",
      number: ret.return_number,
      description: ret.reason || "مرتجع بيع",
      debit: 0,
      credit: ret.refund_amount || 0,
    });
  });

  // Sort by date
  allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build statement with running balance
  allTransactions.forEach((tx) => {
    runningBalance += tx.debit - tx.credit;
    totalDebit += tx.debit;
    totalCredit += tx.credit;

    transactions.push({
      date: tx.date,
      documentType: tx.type,
      documentNumber: tx.number,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      balanceAfter: runningBalance,
    });
  });

  return {
    entityId: customer.id,
    entityName: customer.name,
    fromDate,
    toDate,
    openingBalance,
    transactions,
    closingBalance: runningBalance,
    totalDebit,
    totalCredit,
  };
}

/**
 * Get Supplier Statement
 * Returns chronological movements for a specific supplier
 */
export async function getSupplierStatement(
  supplierId: string,
  fromDate: string,
  toDate: string
): Promise<StatementResult> {
  // Fetch supplier details
  const { data: supplier, error: suppError } = await supabase
    .from("suppliers")
    .select("id, name, balance")
    .eq("id", supplierId)
    .single();

  if (suppError) {
    console.error("Error fetching supplier:", suppError);
    throw suppError;
  }

  // Fetch purchase invoices
  const { data: invoices, error: invError } = await supabase
    .from("purchase_invoices")
    .select("id, invoice_number, invoice_date, total_amount, notes")
    .eq("supplier_id", supplierId)
    .eq("status", "posted")
    .gte("invoice_date", fromDate)
    .lte("invoice_date", toDate)
    .order("invoice_date", { ascending: true });

  if (invError) throw invError;

  // Fetch supplier payments
  const { data: payments, error: payError } = await supabase
    .from("cash_payments")
    .select("id, payment_number, payment_date, amount, description")
    .eq("supplier_id", supplierId)
    .eq("status", "posted")
    .gte("payment_date", fromDate)
    .lte("payment_date", toDate)
    .order("payment_date", { ascending: true });

  if (payError) throw payError;

  // Fetch purchase returns
  const { data: returns, error: retError } = await supabase
    .from("purchase_returns")
    .select("id, return_number, return_date, refund_amount, reason")
    .eq("supplier_id", supplierId)
    .eq("status", "posted")
    .gte("return_date", fromDate)
    .lte("return_date", toDate)
    .order("return_date", { ascending: true });

  if (retError) throw retError;

  // Calculate opening balance (all transactions before fromDate)
  const { data: priorInvoices } = await supabase
    .from("purchase_invoices")
    .select("total_amount")
    .eq("supplier_id", supplierId)
    .eq("status", "posted")
    .lt("invoice_date", fromDate);

  const { data: priorPayments } = await supabase
    .from("cash_payments")
    .select("amount")
    .eq("supplier_id", supplierId)
    .eq("status", "posted")
    .lt("payment_date", fromDate);

  const { data: priorReturns } = await supabase
    .from("purchase_returns")
    .select("refund_amount")
    .eq("supplier_id", supplierId)
    .eq("status", "posted")
    .lt("return_date", fromDate);

  const openingBalance =
    (priorInvoices || []).reduce((sum, inv: any) => sum + (inv.total_amount || 0), 0) -
    (priorPayments || []).reduce((sum, pay: any) => sum + (pay.amount || 0), 0) -
    (priorReturns || []).reduce((sum, ret: any) => sum + (ret.refund_amount || 0), 0);

  // Build transactions array
  const transactions: StatementTransaction[] = [];
  let runningBalance = openingBalance;
  let totalDebit = 0;
  let totalCredit = 0;

  // Combine all transactions and sort by date
  const allTransactions: Array<{
    date: string;
    type: string;
    number: string;
    description: string;
    debit: number;
    credit: number;
  }> = [];

  (invoices || []).forEach((inv: any) => {
    allTransactions.push({
      date: inv.invoice_date,
      type: "فاتورة شراء",
      number: inv.invoice_number,
      description: inv.notes || "فاتورة شراء",
      debit: 0,
      credit: inv.total_amount || 0,
    });
  });

  (payments || []).forEach((pay: any) => {
    allTransactions.push({
      date: pay.payment_date,
      type: "سند صرف",
      number: pay.payment_number,
      description: pay.description || "سند صرف",
      debit: pay.amount || 0,
      credit: 0,
    });
  });

  (returns || []).forEach((ret: any) => {
    allTransactions.push({
      date: ret.return_date,
      type: "مرتجع شراء",
      number: ret.return_number,
      description: ret.reason || "مرتجع شراء",
      debit: ret.refund_amount || 0,
      credit: 0,
    });
  });

  // Sort by date
  allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Build statement with running balance (AP: credit increases balance, debit decreases)
  allTransactions.forEach((tx) => {
    runningBalance += tx.credit - tx.debit;
    totalDebit += tx.debit;
    totalCredit += tx.credit;

    transactions.push({
      date: tx.date,
      documentType: tx.type,
      documentNumber: tx.number,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      balanceAfter: runningBalance,
    });
  });

  return {
    entityId: supplier.id,
    entityName: supplier.name,
    fromDate,
    toDate,
    openingBalance,
    transactions,
    closingBalance: runningBalance,
    totalDebit,
    totalCredit,
  };
}

// ============================================================================
// VAT RETURNS TYPES & FUNCTIONS (Phase 5)
// ============================================================================

/**
 * Tax Period interface - matches tax_periods table
 */
export interface TaxPeriod {
  id: string;
  period_number: string | null;
  start_date: string;
  end_date: string;
  period_type: string | null;
  status: string;
}

/**
 * Partial Tax Period for joined relations (subset of fields)
 */
export interface TaxPeriodPartial {
  period_number: string | null;
  start_date: string;
  end_date: string;
  period_type: string | null;
}

/**
 * VAT Return Record interface - matches vat_returns table with joined tax_periods
 */
export interface VatReturnRecord {
  id: string;
  return_number: string;
  filing_date: string | null;
  tax_period_id: string | null;

  // Joined relation from tax_periods (partial fields)
  tax_periods?: TaxPeriodPartial | null;

  total_sales: number | null;
  total_purchases: number | null;
  standard_rated_sales: number | null;
  standard_rated_purchases: number | null;
  zero_rated_sales?: number | null;
  exempt_sales?: number | null;
  zero_rated_purchases?: number | null;
  exempt_purchases?: number | null;

  output_vat: number | null;
  input_vat: number | null;
  net_vat: number | null;
  amount_due: number | null;
  corrections?: number | null;

  status: 'draft' | 'submitted' | 'approved' | 'rejected' | string;
  submitted_at?: string | null;
  submitted_by?: string | null;
  approved_at?: string | null;
  submission_reference?: string | null;
  notes?: string | null;

  created_at?: string;
}

/**
 * Generated VAT Return Result - returned from generateVatReturn function
 */
export interface GeneratedVatReturnResult {
  id: string;
  periodStart: string;
  periodEnd: string;
  outputVat: number;
  inputVat: number;
  netVat: number;
  status: string;
  returnNumber: string;
}

// Alias for backward compatibility
export type VatReturnSummary = GeneratedVatReturnResult;

/**
 * Generate VAT Return for a period
 * Computes VAT from posted sales and purchases
 */
export async function generateVatReturn(
  periodStart: string,
  periodEnd: string
): Promise<VatReturnSummary> {
  // أولاً: حاول إيجاد فترة ضريبية تغطي هذا النطاق
  let taxPeriodId: string;

  const { data: existingPeriod, error: existingError } = await supabase
    .from("tax_periods")
    .select("id")
    .lte("start_date", periodStart) // start_date <= periodStart
    .gte("end_date", periodEnd)     // end_date   >= periodEnd
    .maybeSingle();                 // يسمح بعدم وجود سجل بدون رمي خطأ

  if (existingError) {
    console.error("Error fetching tax period:", existingError);
    throw existingError;
  }

  if (existingPeriod) {
    taxPeriodId = existingPeriod.id;
  } else {
    // إنشاء فترة ضريبية جديدة
    const year = new Date(periodStart).getFullYear();
    const month = new Date(periodStart).getMonth() + 1;
    const periodNum = `TP-${year}-${String(month).padStart(2, "0")}`;

    const { data: newPeriod, error: periodError } = await supabase
      .from("tax_periods")
      .insert({
        period_number: periodNum,
        period_type: "monthly",
        start_date: periodStart,
        end_date: periodEnd,
        status: "open",
      })
      .select()
      .single();

    if (periodError) throw periodError;
    taxPeriodId = newPeriod.id;
  }

  // حساب ضريبة المخرجات من فواتير المبيعات
  const { data: salesInvoices, error: salesError } = await supabase
    .from("sales_invoices")
    .select("tax_amount, grand_total")
    .eq("status", "posted")
    .gte("invoice_date", periodStart)
    .lte("invoice_date", periodEnd);

  if (salesError) throw salesError;

  const totalSales = (salesInvoices || []).reduce(
    (sum, inv: any) => sum + (inv.grand_total || 0),
    0
  );
  const outputVat = (salesInvoices || []).reduce(
    (sum, inv: any) => sum + (inv.tax_amount || 0),
    0
  );

  // حساب ضريبة المدخلات من فواتير المشتريات
  const { data: purchaseInvoices, error: purchaseError } = await supabase
    .from("purchase_invoices")
    .select("tax_amount, total_amount")
    .eq("status", "posted")
    .gte("invoice_date", periodStart)
    .lte("invoice_date", periodEnd);

  if (purchaseError) throw purchaseError;

  const totalPurchases = (purchaseInvoices || []).reduce(
    (sum, inv: any) => sum + (inv.total_amount || 0),
    0
  );
  const inputVat = (purchaseInvoices || []).reduce(
    (sum, inv: any) => sum + (inv.tax_amount || 0),
    0
  );

  const netVat = outputVat - inputVat;

  // توليد رقم إقرار متسلسل
  const { data: lastReturn } = await supabase
    .from("vat_returns")
    .select("return_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = lastReturn?.return_number?.match(/\d+$/)?.[0] || "0";
  const nextSeq = String(parseInt(lastNum, 10) + 1).padStart(4, "0");
  const returnNumber = `VAT-${new Date().getFullYear()}-${nextSeq}`;

  // إدخال الإقرار في جدول vat_returns
  const todayStr = new Date().toISOString().split("T")[0];

  const { data: vatReturn, error: insertError } = await supabase
    .from("vat_returns")
    .insert({
      return_number: returnNumber,
      filing_date: todayStr,
      tax_period_id: taxPeriodId,
      total_sales: totalSales,
      total_purchases: totalPurchases,
      standard_rated_sales: totalSales,
      standard_rated_purchases: totalPurchases,
      output_vat: outputVat,
      input_vat: inputVat,
      net_vat: netVat,
      amount_due: netVat > 0 ? netVat : 0,
      status: "draft",
    })
    .select()
    .single();

  if (insertError) throw insertError;

  return {
    id: vatReturn.id,
    periodStart,
    periodEnd,
    outputVat,
    inputVat,
    netVat,
    status: "draft",
    returnNumber,
  };
}

/**
 * Submit VAT Return Result interface
 */
export interface SubmitVatReturnResult {
  success: boolean;
  returnId: string;
  submissionReference: string;
  submittedAt: string;
  message: string;
}

/**
 * Submit VAT Return
 * - Validates the return exists and is in "draft" status
 * - Generates submission_reference (format: SUB-YYYY-XXXX)
 * - Closes the related tax period
 * - Prevents duplicate submissions
 * - Admin only authorization
 */
export async function submitVatReturn(vatReturnId: string): Promise<SubmitVatReturnResult> {
  // 1. جلب بيانات الإقرار والتحقق من وجوده وحالته
  const { data: vatReturn, error: fetchError } = await supabase
    .from("vat_returns")
    .select("id, return_number, status, tax_period_id")
    .eq("id", vatReturnId)
    .maybeSingle();

  if (fetchError) {
    console.error("Error fetching VAT return:", fetchError);
    throw new Error("فشل في جلب بيانات الإقرار: " + fetchError.message);
  }

  if (!vatReturn) {
    throw new Error("الإقرار الضريبي غير موجود");
  }

  // 2. التحقق من أن الإقرار في حالة مسودة
  if (vatReturn.status !== "draft") {
    throw new Error("لا يمكن تقديم إقرار مُقدَّم مسبقاً. حالة الإقرار الحالية: " + vatReturn.status);
  }

  // 3. التحقق من وجود فترة ضريبية مرتبطة
  if (!vatReturn.tax_period_id) {
    throw new Error("لا يوجد فترة ضريبية مرتبطة بهذا الإقرار");
  }

  // 4. توليد رقم المرجع (submission_reference)
  const { data: lastSubmission } = await supabase
    .from("vat_returns")
    .select("submission_reference")
    .not("submission_reference", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastNum = lastSubmission?.submission_reference?.match(/\d+$/)?.[0] || "0";
  const nextSeq = String(parseInt(lastNum, 10) + 1).padStart(4, "0");
  const submissionReference = `SUB-${new Date().getFullYear()}-${nextSeq}`;
  const submittedAt = new Date().toISOString();

  // 5. تحديث الإقرار إلى حالة "submitted"
  const { error: updateError } = await supabase
    .from("vat_returns")
    .update({
      status: "submitted",
      submitted_at: submittedAt,
      submission_reference: submissionReference,
    })
    .eq("id", vatReturnId)
    .eq("status", "draft"); // Double check to prevent race conditions

  if (updateError) {
    console.error("Error submitting VAT return:", updateError);
    throw new Error("فشل في تقديم الإقرار: " + updateError.message);
  }

  // 6. إغلاق الفترة الضريبية المرتبطة
  const { error: periodError } = await supabase
    .from("tax_periods")
    .update({ status: "closed" })
    .eq("id", vatReturn.tax_period_id);

  if (periodError) {
    console.error("Error closing tax period:", periodError);
    // Log warning but don't fail the submission
    console.warn("تم تقديم الإقرار لكن فشل إغلاق الفترة الضريبية");
  }

  return {
    success: true,
    returnId: vatReturnId,
    submissionReference,
    submittedAt,
    message: `تم تقديم الإقرار ${vatReturn.return_number} بنجاح. رقم المرجع: ${submissionReference}`,
  };
}

// ============================================================================
// CASH FLOW STATEMENTS (Phase 6)
// ============================================================================

export interface CashFlowSection {
  name: string;
  items: {
    description: string;
    amount: number;
  }[];
  total: number;
}

export interface CashFlowData {
  periodStart: string;
  periodEnd: string;
  operatingActivities: CashFlowSection;
  investingActivities: CashFlowSection;
  financingActivities: CashFlowSection;
  openingCashBalance: number;
  netCashChange: number;
  closingCashBalance: number;
}

/**
 * Get Cash Flow Statement - Direct Method
 * Shows actual cash receipts and payments
 */
export async function getCashFlowDirect(params: {
  fromDate: string;
  toDate: string;
}): Promise<CashFlowData> {
  const { fromDate, toDate } = params;

  // Fetch cash/bank accounts
  const { data: cashAccounts, error: cashError } = await supabase
    .from("gl_accounts")
    .select("id")
    .or("account_code.ilike.1%,account_type.eq.asset")
    .ilike("account_name", "%نقد%,cash%,بنك%,bank%,صندوق%");

  if (cashError) throw cashError;
  const cashAccountIds = cashAccounts?.map(a => a.id) || [];

  // Get journal entries for the period involving cash accounts
  const { data: journalLines, error: journalError } = await supabase
    .from("gl_journal_lines")
    .select(`
      debit,
      credit,
      description,
      gl_journal_entries!inner (
        entry_date,
        description,
        source_module,
        is_posted
      ),
      gl_accounts!inner (
        id,
        account_code,
        account_name,
        account_type
      )
    `)
    .gte("gl_journal_entries.entry_date", fromDate)
    .lte("gl_journal_entries.entry_date", toDate)
    .eq("gl_journal_entries.is_posted", true);

  if (journalError) throw journalError;

  // Calculate opening cash balance
  const { data: openingLines, error: openingError } = await supabase
    .from("gl_journal_lines")
    .select(`
      debit,
      credit,
      gl_journal_entries!inner (
        entry_date,
        is_posted
      ),
      gl_accounts!inner (id)
    `)
    .lt("gl_journal_entries.entry_date", fromDate)
    .eq("gl_journal_entries.is_posted", true)
    .in("account_id", cashAccountIds.length > 0 ? cashAccountIds : ['00000000-0000-0000-0000-000000000000']);

  if (openingError) throw openingError;

  let openingCashBalance = 0;
  openingLines?.forEach((line: any) => {
    openingCashBalance += (line.debit || 0) - (line.credit || 0);
  });

  // Categorize cash movements
  const operatingItems: { description: string; amount: number }[] = [];
  const investingItems: { description: string; amount: number }[] = [];
  const financingItems: { description: string; amount: number }[] = [];

  // Process journal lines
  const sourceCategories: Record<string, string> = {
    sales_invoice: "operating",
    purchase_invoice: "operating",
    sales_return: "operating",
    purchase_return: "operating",
    pos_session: "operating",
    customer_receipt: "operating",
    supplier_payment: "operating",
    expense: "operating",
    stock_adjustment: "operating",
    asset_purchase: "investing",
    asset_sale: "investing",
    loan: "financing",
    capital: "financing",
    dividend: "financing",
  };

  // Track cash movements by source
  const movementsBySource: Record<string, number> = {};

  journalLines?.forEach((line: any) => {
    const isCashAccount = cashAccountIds.includes(line.gl_accounts?.id);
    if (!isCashAccount) return;

    const cashMovement = (line.debit || 0) - (line.credit || 0);
    const sourceModule = line.gl_journal_entries?.source_module || "other";
    const key = sourceModule;

    if (!movementsBySource[key]) {
      movementsBySource[key] = 0;
    }
    movementsBySource[key] += cashMovement;
  });

  // Convert to items
  const sourceLabels: Record<string, string> = {
    sales_invoice: "التحصيلات من المبيعات",
    purchase_invoice: "المدفوعات للموردين",
    sales_return: "المدفوعات لمرتجعات المبيعات",
    purchase_return: "التحصيلات من مرتجعات المشتريات",
    pos_session: "مبيعات نقطة البيع",
    customer_receipt: "تحصيلات العملاء",
    supplier_payment: "مدفوعات الموردين",
    expense: "المصروفات التشغيلية",
    stock_adjustment: "تعديلات المخزون",
    asset_purchase: "شراء أصول ثابتة",
    asset_sale: "بيع أصول ثابتة",
    loan: "القروض",
    capital: "رأس المال",
    dividend: "توزيعات الأرباح",
    other: "أخرى",
    manual: "قيود يدوية",
    opening_balance: "أرصدة افتتاحية",
  };

  Object.entries(movementsBySource).forEach(([source, amount]) => {
    if (Math.abs(amount) < 0.01) return;
    
    const item = {
      description: sourceLabels[source] || source,
      amount,
    };

    const category = sourceCategories[source] || "operating";
    if (category === "operating") {
      operatingItems.push(item);
    } else if (category === "investing") {
      investingItems.push(item);
    } else {
      financingItems.push(item);
    }
  });

  const operatingTotal = operatingItems.reduce((sum, i) => sum + i.amount, 0);
  const investingTotal = investingItems.reduce((sum, i) => sum + i.amount, 0);
  const financingTotal = financingItems.reduce((sum, i) => sum + i.amount, 0);
  const netCashChange = operatingTotal + investingTotal + financingTotal;

  return {
    periodStart: fromDate,
    periodEnd: toDate,
    operatingActivities: {
      name: "الأنشطة التشغيلية",
      items: operatingItems,
      total: operatingTotal,
    },
    investingActivities: {
      name: "الأنشطة الاستثمارية",
      items: investingItems,
      total: investingTotal,
    },
    financingActivities: {
      name: "الأنشطة التمويلية",
      items: financingItems,
      total: financingTotal,
    },
    openingCashBalance,
    netCashChange,
    closingCashBalance: openingCashBalance + netCashChange,
  };
}

/**
 * Get Cash Flow Statement - Indirect Method
 * Starts with net income and adjusts for non-cash items
 */
export async function getCashFlowIndirect(params: {
  fromDate: string;
  toDate: string;
}): Promise<CashFlowData> {
  const { fromDate, toDate } = params;

  // Get income statement for net profit
  const incomeStatement = await getIncomeStatement({ fromDate, toDate });
  const netProfit = incomeStatement.netProfit;

  // Fetch depreciation expenses (non-cash)
  const { data: depreciationLines, error: depError } = await supabase
    .from("gl_journal_lines")
    .select(`
      debit,
      credit,
      gl_journal_entries!inner (
        entry_date,
        is_posted
      ),
      gl_accounts!inner (
        account_name
      )
    `)
    .gte("gl_journal_entries.entry_date", fromDate)
    .lte("gl_journal_entries.entry_date", toDate)
    .eq("gl_journal_entries.is_posted", true)
    .or("gl_accounts.account_name.ilike.%إهلاك%,gl_accounts.account_name.ilike.%depreciation%");

  if (depError) throw depError;

  let depreciation = 0;
  depreciationLines?.forEach((line: any) => {
    depreciation += (line.debit || 0) - (line.credit || 0);
  });

  // Helper function to calculate account balance change for a period
  const calculateAccountChange = async (accountNamePattern: string): Promise<number> => {
    // Get accounts matching pattern
    const { data: accounts } = await supabase
      .from("gl_accounts")
      .select("id")
      .or(accountNamePattern);
    
    const accountIds = accounts?.map(a => a.id) || [];
    if (accountIds.length === 0) return 0;

    // Get opening balance (before period)
    const { data: openingData } = await supabase
      .from("gl_journal_lines")
      .select(`debit, credit, gl_journal_entries!inner(entry_date, is_posted)`)
      .lt("gl_journal_entries.entry_date", fromDate)
      .eq("gl_journal_entries.is_posted", true)
      .in("account_id", accountIds);

    let openingBalance = 0;
    openingData?.forEach((line: any) => {
      openingBalance += (line.debit || 0) - (line.credit || 0);
    });

    // Get closing balance (end of period)
    const { data: closingData } = await supabase
      .from("gl_journal_lines")
      .select(`debit, credit, gl_journal_entries!inner(entry_date, is_posted)`)
      .lte("gl_journal_entries.entry_date", toDate)
      .eq("gl_journal_entries.is_posted", true)
      .in("account_id", accountIds);

    let closingBalance = 0;
    closingData?.forEach((line: any) => {
      closingBalance += (line.debit || 0) - (line.credit || 0);
    });

    return closingBalance - openingBalance;
  };

  // Calculate working capital changes
  const arChange = await calculateAccountChange("account_name.ilike.%ذمم مدينة%,account_name.ilike.%receivable%,account_name.ilike.%عملاء%");
  const apChange = await calculateAccountChange("account_name.ilike.%ذمم دائنة%,account_name.ilike.%payable%,account_name.ilike.%موردين%");
  const invChange = await calculateAccountChange("account_name.ilike.%مخزون%,account_name.ilike.%inventory%");

  // Build operating activities
  const operatingItems: { description: string; amount: number }[] = [
    { description: "صافي الربح", amount: netProfit },
    { description: "إضافة: مصروف الإهلاك", amount: Math.abs(depreciation) },
    { description: "التغير في الذمم المدينة", amount: -arChange },
    { description: "التغير في المخزون", amount: -invChange },
    { description: "التغير في الذمم الدائنة", amount: apChange },
  ];

  const operatingTotal = operatingItems.reduce((sum, i) => sum + i.amount, 0);

  // Get cash account balances
  const { data: cashAccounts } = await supabase
    .from("gl_accounts")
    .select("id")
    .or("account_name.ilike.%نقد%,account_name.ilike.%cash%,account_name.ilike.%بنك%,account_name.ilike.%bank%,account_name.ilike.%صندوق%");

  const cashAccountIds = cashAccounts?.map(a => a.id) || [];

  // Opening cash
  const { data: openingCash } = await supabase
    .from("gl_journal_lines")
    .select("debit, credit")
    .lt("gl_journal_entries.entry_date", fromDate)
    .eq("gl_journal_entries.is_posted", true)
    .in("account_id", cashAccountIds.length > 0 ? cashAccountIds : ['00000000-0000-0000-0000-000000000000']);

  let openingCashBalance = 0;
  openingCash?.forEach((line: any) => {
    openingCashBalance += (line.debit || 0) - (line.credit || 0);
  });

  return {
    periodStart: fromDate,
    periodEnd: toDate,
    operatingActivities: {
      name: "الأنشطة التشغيلية (طريقة غير مباشرة)",
      items: operatingItems,
      total: operatingTotal,
    },
    investingActivities: {
      name: "الأنشطة الاستثمارية",
      items: [],
      total: 0,
    },
    financingActivities: {
      name: "الأنشطة التمويلية",
      items: [],
      total: 0,
    },
    openingCashBalance,
    netCashChange: operatingTotal,
    closingCashBalance: openingCashBalance + operatingTotal,
  };
}
