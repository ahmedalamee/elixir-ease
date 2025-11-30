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
