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
 * Computes level based on parent relationships
 */
function buildAccountTree(accounts: GlAccount[]): GlAccountTreeNode[] {
  const accountMap = new Map<string, GlAccountTreeNode>();
  const rootAccounts: GlAccountTreeNode[] = [];

  // First pass: create tree nodes with level 0
  accounts.forEach(account => {
    accountMap.set(account.id, { ...account, children: [], level: 0 });
  });

  // Second pass: build parent-child relationships and compute levels
  accounts.forEach(account => {
    const node = accountMap.get(account.id)!;
    
    if (account.parentAccountId) {
      const parent = accountMap.get(account.parentAccountId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        node.level = (parent.level || 0) + 1;
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
