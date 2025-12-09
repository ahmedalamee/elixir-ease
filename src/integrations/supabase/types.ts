export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      accounting_integration_log: {
        Row: {
          created_at: string | null
          document_id: string
          document_number: string
          document_type: string
          error_message: string | null
          id: string
          journal_entry_id: string | null
          processed_at: string | null
          retry_count: number | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          created_at?: string | null
          document_id: string
          document_number: string
          document_type: string
          error_message?: string | null
          id?: string
          journal_entry_id?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          created_at?: string | null
          document_id?: string
          document_number?: string
          document_type?: string
          error_message?: string | null
          id?: string
          journal_entry_id?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_integration_log_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          fiscal_year: number
          id: string
          is_closed: boolean
          notes: string | null
          period_name: string
          start_date: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date: string
          fiscal_year: number
          id?: string
          is_closed?: boolean
          notes?: string | null
          period_name: string
          start_date: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          fiscal_year?: number
          id?: string
          is_closed?: boolean
          notes?: string | null
          period_name?: string
          start_date?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation: string
          record_id: string
          table_name: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          operation?: string
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          currency: string | null
          current_balance: number | null
          gl_account_id: string | null
          iban: string | null
          id: string
          is_active: boolean | null
          opening_balance: number | null
          swift_code: string | null
          updated_at: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          gl_account_id?: string | null
          iban?: string | null
          id?: string
          is_active?: boolean | null
          opening_balance?: number | null
          swift_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliation_items: {
        Row: {
          cleared_date: string | null
          created_at: string | null
          credit_amount: number | null
          debit_amount: number | null
          description: string
          id: string
          is_cleared: boolean | null
          item_type: string | null
          notes: string | null
          reconciliation_id: string
          reference_number: string | null
          transaction_date: string
        }
        Insert: {
          cleared_date?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description: string
          id?: string
          is_cleared?: boolean | null
          item_type?: string | null
          notes?: string | null
          reconciliation_id: string
          reference_number?: string | null
          transaction_date: string
        }
        Update: {
          cleared_date?: string | null
          created_at?: string | null
          credit_amount?: number | null
          debit_amount?: number | null
          description?: string
          id?: string
          is_cleared?: boolean | null
          item_type?: string | null
          notes?: string | null
          reconciliation_id?: string
          reference_number?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliation_items_reconciliation_id_fkey"
            columns: ["reconciliation_id"]
            isOneToOne: false
            referencedRelation: "bank_reconciliations"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_reconciliations: {
        Row: {
          adjusted_balance: number | null
          bank_account_id: string
          book_balance: number
          created_at: string | null
          id: string
          notes: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reconciliation_date: string
          reconciliation_number: string
          statement_balance: number
          status: string | null
          updated_at: string | null
        }
        Insert: {
          adjusted_balance?: number | null
          bank_account_id: string
          book_balance: number
          created_at?: string | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date: string
          reconciliation_number: string
          statement_balance: number
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          adjusted_balance?: number | null
          bank_account_id?: string
          book_balance?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reconciliation_date?: string
          reconciliation_number?: string
          statement_balance?: number
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_reconciliations_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_lines: {
        Row: {
          account_id: string
          actual_amount: number | null
          budget_id: string
          budgeted_amount: number
          cost_center_id: string | null
          created_at: string | null
          id: string
          notes: string | null
          variance: number | null
          variance_percentage: number | null
        }
        Insert: {
          account_id: string
          actual_amount?: number | null
          budget_id: string
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Update: {
          account_id?: string
          actual_amount?: number | null
          budget_id?: string
          budgeted_amount?: number
          cost_center_id?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          variance?: number | null
          variance_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_lines_cost_center_id_fkey"
            columns: ["cost_center_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          budget_number: string
          created_at: string | null
          created_by: string | null
          end_date: string
          fiscal_year: number
          id: string
          notes: string | null
          period_type: string
          start_date: string
          status: string | null
          total_expense_budget: number | null
          total_revenue_budget: number | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          budget_number: string
          created_at?: string | null
          created_by?: string | null
          end_date: string
          fiscal_year: number
          id?: string
          notes?: string | null
          period_type: string
          start_date: string
          status?: string | null
          total_expense_budget?: number | null
          total_revenue_budget?: number | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          budget_number?: string
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          fiscal_year?: number
          id?: string
          notes?: string | null
          period_type?: string
          start_date?: string
          status?: string | null
          total_expense_budget?: number | null
          total_revenue_budget?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaign_customers: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          converted_at: string | null
          created_at: string | null
          customer_id: string
          id: string
          opened_at: string | null
          revenue: number | null
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          customer_id: string
          id?: string
          opened_at?: string | null
          revenue?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string | null
          customer_id?: string
          id?: string
          opened_at?: string | null
          revenue?: number | null
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_customers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_customers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_box_exchanges: {
        Row: {
          created_at: string | null
          created_by: string | null
          exchange_date: string
          exchange_number: string
          exchange_rate: number
          from_amount: number
          from_cash_box_id: string
          from_currency: string
          id: string
          journal_entry_id: string | null
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          status: string | null
          to_amount: number
          to_cash_box_id: string
          to_currency: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          exchange_date?: string
          exchange_number: string
          exchange_rate: number
          from_amount: number
          from_cash_box_id: string
          from_currency: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          to_amount: number
          to_cash_box_id: string
          to_currency: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          exchange_date?: string
          exchange_number?: string
          exchange_rate?: number
          from_amount?: number
          from_cash_box_id?: string
          from_currency?: string
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          to_amount?: number
          to_cash_box_id?: string
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_box_exchanges_from_cash_box_id_fkey"
            columns: ["from_cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_box_exchanges_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cash_box_exchanges_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_box_exchanges_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "vw_document_gl_links"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "cash_box_exchanges_to_cash_box_id_fkey"
            columns: ["to_cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_box_exchanges_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      cash_boxes: {
        Row: {
          box_code: string
          box_name: string
          box_name_en: string | null
          box_type: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          current_balance: number | null
          daily_limit: number | null
          gl_account_id: string | null
          id: string
          is_active: boolean | null
          is_main: boolean | null
          location: string | null
          notes: string | null
          opening_balance: number | null
          responsible_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          box_code: string
          box_name: string
          box_name_en?: string | null
          box_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          current_balance?: number | null
          daily_limit?: number | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          location?: string | null
          notes?: string | null
          opening_balance?: number | null
          responsible_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          box_code?: string
          box_name?: string
          box_name_en?: string | null
          box_type?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          current_balance?: number | null
          daily_limit?: number | null
          gl_account_id?: string | null
          id?: string
          is_active?: boolean | null
          is_main?: boolean | null
          location?: string | null
          notes?: string | null
          opening_balance?: number | null
          responsible_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_boxes_gl_account_id_fkey"
            columns: ["gl_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_payments: {
        Row: {
          amount: number
          bank_name: string | null
          cash_box_id: string
          check_date: string | null
          check_number: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          description: string
          id: string
          notes: string | null
          paid_to: string
          payment_date: string
          payment_method: string | null
          payment_number: string
          posted_at: string | null
          posted_by: string | null
          status: string | null
          supplier_id: string | null
        }
        Insert: {
          amount: number
          bank_name?: string | null
          cash_box_id: string
          check_date?: string | null
          check_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description: string
          id?: string
          notes?: string | null
          paid_to: string
          payment_date?: string
          payment_method?: string | null
          payment_number: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          cash_box_id?: string
          check_date?: string | null
          check_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string
          id?: string
          notes?: string | null
          paid_to?: string
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_payments_cash_box_id_fkey"
            columns: ["cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_receipts: {
        Row: {
          amount: number
          bank_name: string | null
          cash_box_id: string
          check_date: string | null
          check_number: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customer_id: string | null
          description: string
          id: string
          notes: string | null
          payment_method: string | null
          posted_at: string | null
          posted_by: string | null
          receipt_date: string
          receipt_number: string
          received_from: string
          status: string | null
        }
        Insert: {
          amount: number
          bank_name?: string | null
          cash_box_id: string
          check_date?: string | null
          check_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          description: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          posted_at?: string | null
          posted_by?: string | null
          receipt_date?: string
          receipt_number: string
          received_from: string
          status?: string | null
        }
        Update: {
          amount?: number
          bank_name?: string | null
          cash_box_id?: string
          check_date?: string | null
          check_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string | null
          description?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          posted_at?: string | null
          posted_by?: string | null
          receipt_date?: string
          receipt_number?: string
          received_from?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cash_receipts_cash_box_id_fkey"
            columns: ["cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_receipts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transactions: {
        Row: {
          amount: number
          amount_bc: number | null
          amount_fc: number | null
          approved_at: string | null
          approved_by: string | null
          cash_box_id: string
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          description: string | null
          exchange_rate: number | null
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_number: string | null
          reference_type: string | null
          status: string | null
          transaction_date: string
          transaction_number: string
          transaction_type: string
        }
        Insert: {
          amount: number
          amount_bc?: number | null
          amount_fc?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cash_box_id: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number: string
          transaction_type: string
        }
        Update: {
          amount?: number
          amount_bc?: number | null
          amount_fc?: number | null
          approved_at?: string | null
          approved_by?: string | null
          cash_box_id?: string
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_number?: string | null
          reference_type?: string | null
          status?: string | null
          transaction_date?: string
          transaction_number?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transactions_cash_box_id_fkey"
            columns: ["cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_transfers: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          description: string | null
          from_cash_box_id: string
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          status: string | null
          to_cash_box_id: string
          transfer_date: string
          transfer_number: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          from_cash_box_id: string
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          to_cash_box_id: string
          transfer_date?: string
          transfer_number: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          from_cash_box_id?: string
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          to_cash_box_id?: string
          transfer_date?: string
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_transfers_from_cash_box_id_fkey"
            columns: ["from_cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_transfers_to_cash_box_id_fkey"
            columns: ["to_cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      company_branding: {
        Row: {
          commercial_register: string | null
          company_address: string | null
          company_address_en: string | null
          company_email: string | null
          company_logo_url: string | null
          company_name: string
          company_name_en: string | null
          company_phone: string | null
          company_phone_2: string | null
          created_at: string | null
          id: string
          invoice_footer_note: string | null
          invoice_footer_note_en: string | null
          tax_number: string | null
          theme_color: string | null
          updated_at: string | null
          updated_by: string | null
          website: string | null
        }
        Insert: {
          commercial_register?: string | null
          company_address?: string | null
          company_address_en?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_name_en?: string | null
          company_phone?: string | null
          company_phone_2?: string | null
          created_at?: string | null
          id?: string
          invoice_footer_note?: string | null
          invoice_footer_note_en?: string | null
          tax_number?: string | null
          theme_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Update: {
          commercial_register?: string | null
          company_address?: string | null
          company_address_en?: string | null
          company_email?: string | null
          company_logo_url?: string | null
          company_name?: string
          company_name_en?: string | null
          company_phone?: string | null
          company_phone_2?: string | null
          created_at?: string | null
          id?: string
          invoice_footer_note?: string | null
          invoice_footer_note_en?: string | null
          tax_number?: string | null
          theme_color?: string | null
          updated_at?: string | null
          updated_by?: string | null
          website?: string | null
        }
        Relationships: []
      }
      cost_centers: {
        Row: {
          actual_amount: number | null
          budget_amount: number | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          manager_id: string | null
          name: string
          name_en: string | null
          parent_id: string | null
          updated_at: string | null
        }
        Insert: {
          actual_amount?: number | null
          budget_amount?: number | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_amount?: number | null
          budget_amount?: number | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          manager_id?: string | null
          name?: string
          name_en?: string | null
          parent_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_centers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_centers_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "cost_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string | null
          is_active: boolean | null
          is_base: boolean | null
          name: string
          name_en: string | null
          precision: number | null
          symbol: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          is_active?: boolean | null
          is_base?: boolean | null
          name: string
          name_en?: string | null
          precision?: number | null
          symbol?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          is_active?: boolean | null
          is_base?: boolean | null
          name?: string
          name_en?: string | null
          precision?: number | null
          symbol?: string | null
        }
        Relationships: []
      }
      customer_access_log: {
        Row: {
          accessed_at: string | null
          action: string
          customer_id: string | null
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          action: string
          customer_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          action?: string
          customer_id?: string | null
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_access_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_access_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_analytics: {
        Row: {
          average_purchase_value: number | null
          churn_risk_score: number | null
          customer_id: string
          days_since_last_purchase: number | null
          id: string
          last_interaction_date: string | null
          last_purchase_date: string | null
          lifetime_value: number | null
          predicted_next_purchase_date: string | null
          preferred_products: Json | null
          purchase_frequency: number | null
          satisfaction_score: number | null
          total_purchase_count: number | null
          total_purchases: number | null
          updated_at: string | null
        }
        Insert: {
          average_purchase_value?: number | null
          churn_risk_score?: number | null
          customer_id: string
          days_since_last_purchase?: number | null
          id?: string
          last_interaction_date?: string | null
          last_purchase_date?: string | null
          lifetime_value?: number | null
          predicted_next_purchase_date?: string | null
          preferred_products?: Json | null
          purchase_frequency?: number | null
          satisfaction_score?: number | null
          total_purchase_count?: number | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Update: {
          average_purchase_value?: number | null
          churn_risk_score?: number | null
          customer_id?: string
          days_since_last_purchase?: number | null
          id?: string
          last_interaction_date?: string | null
          last_purchase_date?: string | null
          lifetime_value?: number | null
          predicted_next_purchase_date?: string | null
          preferred_products?: Json | null
          purchase_frequency?: number | null
          satisfaction_score?: number | null
          total_purchase_count?: number | null
          total_purchases?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_analytics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_analytics_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_complaints: {
        Row: {
          assigned_to: string | null
          complaint_date: string | null
          complaint_number: string
          complaint_type: string
          created_at: string | null
          customer_id: string
          description: string
          id: string
          priority: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          satisfaction_rating: number | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          complaint_date?: string | null
          complaint_number: string
          complaint_type: string
          created_at?: string | null
          customer_id: string
          description: string
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          complaint_date?: string | null
          complaint_number?: string
          complaint_type?: string
          created_at?: string | null
          customer_id?: string
          description?: string
          id?: string
          priority?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          satisfaction_rating?: number | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          created_at: string | null
          customer_id: string
          event_date: string
          event_name: string
          event_type: string
          id: string
          notes: string | null
          recurring: boolean | null
          reminder_days_before: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          event_date: string
          event_name: string
          event_type: string
          id?: string
          notes?: string | null
          recurring?: boolean | null
          reminder_days_before?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          event_date?: string
          event_name?: string
          event_type?: string
          id?: string
          notes?: string | null
          recurring?: boolean | null
          reminder_days_before?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_follow_ups: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          follow_up_type: string
          id: string
          notes: string | null
          scheduled_date: string
          status: string | null
          subject: string
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          follow_up_type: string
          id?: string
          notes?: string | null
          scheduled_date: string
          status?: string | null
          subject: string
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          follow_up_type?: string
          id?: string
          notes?: string | null
          scheduled_date?: string
          status?: string | null
          subject?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_health_records: {
        Row: {
          allergies: string[] | null
          blood_type: string | null
          chronic_diseases: string[] | null
          created_at: string | null
          created_by: string | null
          current_medications: string[] | null
          customer_id: string
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          id: string
          medical_history: string | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_diseases?: string[] | null
          created_at?: string | null
          created_by?: string | null
          current_medications?: string[] | null
          customer_id: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          allergies?: string[] | null
          blood_type?: string | null
          chronic_diseases?: string[] | null
          created_at?: string | null
          created_by?: string | null
          current_medications?: string[] | null
          customer_id?: string
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_health_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_health_records_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_insurance: {
        Row: {
          coverage_percentage: number | null
          created_at: string | null
          customer_id: string
          id: string
          insurance_company_id: string
          is_active: boolean | null
          notes: string | null
          policy_number: string
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          coverage_percentage?: number | null
          created_at?: string | null
          customer_id: string
          id?: string
          insurance_company_id: string
          is_active?: boolean | null
          notes?: string | null
          policy_number: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          coverage_percentage?: number | null
          created_at?: string | null
          customer_id?: string
          id?: string
          insurance_company_id?: string
          is_active?: boolean | null
          notes?: string | null
          policy_number?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_insurance_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_insurance_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_insurance_insurance_company_id_fkey"
            columns: ["insurance_company_id"]
            isOneToOne: false
            referencedRelation: "insurance_companies"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_interactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string | null
          employee_id: string | null
          follow_up_date: string | null
          id: string
          interaction_date: string | null
          interaction_type: string
          priority: string | null
          resolution: string | null
          status: string | null
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description?: string | null
          employee_id?: string | null
          follow_up_date?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type: string
          priority?: string | null
          resolution?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string | null
          employee_id?: string | null
          follow_up_date?: string | null
          id?: string
          interaction_date?: string | null
          interaction_type?: string
          priority?: string | null
          resolution?: string | null
          status?: string | null
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_interactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string | null
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          allocated_amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          allocated_amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "customer_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          payment_date: string
          payment_method_id: string | null
          payment_number: string
          reference_number: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_number: string
          reference_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method_id?: string | null
          payment_number?: string
          reference_number?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_segments: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          discount_percentage: number | null
          id: string
          is_active: boolean | null
          max_purchase_amount: number | null
          min_purchase_amount: number | null
          name: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_purchase_amount?: number | null
          min_purchase_amount?: number | null
          name: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          discount_percentage?: number | null
          id?: string
          is_active?: boolean | null
          max_purchase_amount?: number | null
          min_purchase_amount?: number | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          balance: number | null
          created_at: string | null
          credit_limit: number | null
          currency_code: string | null
          email: string | null
          id: string
          is_active: boolean | null
          last_transaction_date: string | null
          loyalty_points: number | null
          name: string
          payment_terms: string | null
          phone: string | null
          price_list_id: string | null
          segment: string | null
          tax_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_transaction_date?: string | null
          loyalty_points?: number | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          price_list_id?: string | null
          segment?: string | null
          tax_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          last_transaction_date?: string | null
          loyalty_points?: number | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          price_list_id?: string | null
          segment?: string | null
          tax_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "customers_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          created_at: string | null
          doctor_code: string
          email: string | null
          employee_id: string | null
          full_name: string
          full_name_en: string | null
          hospital_clinic: string | null
          id: string
          is_active: boolean | null
          license_number: string
          notes: string | null
          phone: string | null
          specialization: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_code: string
          email?: string | null
          employee_id?: string | null
          full_name: string
          full_name_en?: string | null
          hospital_clinic?: string | null
          id?: string
          is_active?: boolean | null
          license_number: string
          notes?: string | null
          phone?: string | null
          specialization: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_code?: string
          email?: string | null
          employee_id?: string | null
          full_name?: string
          full_name_en?: string | null
          hospital_clinic?: string | null
          id?: string
          is_active?: boolean | null
          license_number?: string
          notes?: string | null
          phone?: string | null
          specialization?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      document_gl_entries: {
        Row: {
          created_at: string | null
          document_amount: number
          document_id: string
          document_number: string
          document_type: string
          error_message: string | null
          id: string
          journal_entry_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          document_amount: number
          document_id: string
          document_number: string
          document_type: string
          error_message?: string | null
          id?: string
          journal_entry_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          document_amount?: number
          document_id?: string
          document_number?: string
          document_type?: string
          error_message?: string | null
          id?: string
          journal_entry_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_gl_entries_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      document_numbering_rules: {
        Row: {
          created_at: string | null
          description: string | null
          document_type: string
          id: string
          is_active: boolean | null
          next_number: number | null
          number_length: number | null
          prefix: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          next_number?: number | null
          number_length?: number | null
          prefix: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          next_number?: number | null
          number_length?: number | null
          prefix?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dosage_guidelines: {
        Row: {
          age_group: string
          created_at: string | null
          frequency: string
          id: string
          is_active: boolean | null
          max_age: number | null
          max_dose: number
          min_age: number | null
          min_dose: number
          product_id: string
          recommended_dose: number | null
          route: string | null
          special_instructions: string | null
          updated_at: string | null
          weight_range: string | null
        }
        Insert: {
          age_group: string
          created_at?: string | null
          frequency: string
          id?: string
          is_active?: boolean | null
          max_age?: number | null
          max_dose: number
          min_age?: number | null
          min_dose: number
          product_id: string
          recommended_dose?: number | null
          route?: string | null
          special_instructions?: string | null
          updated_at?: string | null
          weight_range?: string | null
        }
        Update: {
          age_group?: string
          created_at?: string | null
          frequency?: string
          id?: string
          is_active?: boolean | null
          max_age?: number | null
          max_dose?: number
          min_age?: number | null
          min_dose?: number
          product_id?: string
          recommended_dose?: number | null
          route?: string | null
          special_instructions?: string | null
          updated_at?: string | null
          weight_range?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dosage_guidelines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dosage_guidelines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      drug_interactions: {
        Row: {
          clinical_effects: string | null
          created_at: string | null
          description: string
          drug1_id: string
          drug2_id: string
          id: string
          interaction_type: string
          is_active: boolean | null
          management: string | null
          severity: string
          updated_at: string | null
        }
        Insert: {
          clinical_effects?: string | null
          created_at?: string | null
          description: string
          drug1_id: string
          drug2_id: string
          id?: string
          interaction_type: string
          is_active?: boolean | null
          management?: string | null
          severity: string
          updated_at?: string | null
        }
        Update: {
          clinical_effects?: string | null
          created_at?: string | null
          description?: string
          drug1_id?: string
          drug2_id?: string
          id?: string
          interaction_type?: string
          is_active?: boolean | null
          management?: string | null
          severity?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drug_interactions_drug1_id_fkey"
            columns: ["drug1_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interactions_drug1_id_fkey"
            columns: ["drug1_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "drug_interactions_drug2_id_fkey"
            columns: ["drug2_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_interactions_drug2_id_fkey"
            columns: ["drug2_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      drug_warnings: {
        Row: {
          contraindications: string | null
          created_at: string | null
          description: string
          id: string
          is_active: boolean | null
          precautions: string | null
          product_id: string
          severity: string
          target_population: string | null
          updated_at: string | null
          warning_type: string
        }
        Insert: {
          contraindications?: string | null
          created_at?: string | null
          description: string
          id?: string
          is_active?: boolean | null
          precautions?: string | null
          product_id: string
          severity: string
          target_population?: string | null
          updated_at?: string | null
          warning_type: string
        }
        Update: {
          contraindications?: string | null
          created_at?: string | null
          description?: string
          id?: string
          is_active?: boolean | null
          precautions?: string | null
          product_id?: string
          severity?: string
          target_population?: string | null
          updated_at?: string | null
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "drug_warnings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drug_warnings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      e_invoices: {
        Row: {
          approved_at: string | null
          counter_value: number | null
          created_at: string | null
          id: string
          invoice_hash: string | null
          invoice_number: string
          invoice_type: string
          pdf_url: string | null
          previous_invoice_hash: string | null
          qr_code: string | null
          reference_id: string
          submitted_at: string | null
          updated_at: string | null
          uuid: string
          xml_content: string | null
          zatca_reference: string | null
          zatca_response: Json | null
          zatca_status: string
        }
        Insert: {
          approved_at?: string | null
          counter_value?: number | null
          created_at?: string | null
          id?: string
          invoice_hash?: string | null
          invoice_number: string
          invoice_type: string
          pdf_url?: string | null
          previous_invoice_hash?: string | null
          qr_code?: string | null
          reference_id: string
          submitted_at?: string | null
          updated_at?: string | null
          uuid: string
          xml_content?: string | null
          zatca_reference?: string | null
          zatca_response?: Json | null
          zatca_status?: string
        }
        Update: {
          approved_at?: string | null
          counter_value?: number | null
          created_at?: string | null
          id?: string
          invoice_hash?: string | null
          invoice_number?: string
          invoice_type?: string
          pdf_url?: string | null
          previous_invoice_hash?: string | null
          qr_code?: string | null
          reference_id?: string
          submitted_at?: string | null
          updated_at?: string | null
          uuid?: string
          xml_content?: string | null
          zatca_reference?: string | null
          zatca_response?: Json | null
          zatca_status?: string
        }
        Relationships: []
      }
      employee_attendance: {
        Row: {
          check_in: string
          check_out: string | null
          created_at: string | null
          created_by: string | null
          employee_id: string
          id: string
          notes: string | null
          status: string | null
          updated_at: string | null
          work_hours: number | null
        }
        Insert: {
          check_in: string
          check_out?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          work_hours?: number | null
        }
        Update: {
          check_in?: string
          check_out?: string | null
          created_at?: string | null
          created_by?: string | null
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string | null
          updated_at?: string | null
          work_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_attendance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          days_count: number
          employee_id: string
          end_date: string
          id: string
          leave_type: string
          notes: string | null
          reason: string | null
          start_date: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          days_count: number
          employee_id: string
          end_date: string
          id?: string
          leave_type: string
          notes?: string | null
          reason?: string | null
          start_date: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          days_count?: number
          employee_id?: string
          end_date?: string
          id?: string
          leave_type?: string
          notes?: string | null
          reason?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_leaves_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_performance: {
        Row: {
          attendance_score: number | null
          comments: string | null
          created_at: string | null
          employee_id: string
          evaluated_by: string | null
          evaluation_date: string
          id: string
          overall_rating: number | null
          productivity_score: number | null
          quality_score: number | null
          teamwork_score: number | null
          updated_at: string | null
        }
        Insert: {
          attendance_score?: number | null
          comments?: string | null
          created_at?: string | null
          employee_id: string
          evaluated_by?: string | null
          evaluation_date: string
          id?: string
          overall_rating?: number | null
          productivity_score?: number | null
          quality_score?: number | null
          teamwork_score?: number | null
          updated_at?: string | null
        }
        Update: {
          attendance_score?: number | null
          comments?: string | null
          created_at?: string | null
          employee_id?: string
          evaluated_by?: string | null
          evaluation_date?: string
          id?: string
          overall_rating?: number | null
          productivity_score?: number | null
          quality_score?: number | null
          teamwork_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_performance_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_tasks: {
        Row: {
          assigned_by: string | null
          completed_at: string | null
          created_at: string | null
          due_date: string | null
          employee_id: string
          id: string
          priority: string | null
          status: string | null
          task_description: string | null
          task_title: string
          updated_at: string | null
        }
        Insert: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          employee_id: string
          id?: string
          priority?: string | null
          status?: string | null
          task_description?: string | null
          task_title: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string | null
          completed_at?: string | null
          created_at?: string | null
          due_date?: string | null
          employee_id?: string
          id?: string
          priority?: string | null
          status?: string | null
          task_description?: string | null
          task_title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string | null
          department: string | null
          email: string | null
          employee_code: string
          full_name: string
          full_name_en: string | null
          hire_date: string | null
          id: string
          is_active: boolean | null
          job_title: string | null
          national_id: string | null
          notes: string | null
          phone: string | null
          salary: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code: string
          full_name: string
          full_name_en?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          department?: string | null
          email?: string | null
          employee_code?: string
          full_name?: string
          full_name_en?: string | null
          hire_date?: string | null
          id?: string
          is_active?: boolean | null
          job_title?: string | null
          national_id?: string | null
          notes?: string | null
          phone?: string | null
          salary?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      erp_account_mappings: {
        Row: {
          branch_id: string | null
          created_at: string
          created_by: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          id: string
          is_active: boolean
          module: string
          notes: string | null
          operation: string
          updated_at: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          id?: string
          is_active?: boolean
          module: string
          notes?: string | null
          operation: string
          updated_at?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          id?: string
          is_active?: boolean
          module?: string
          notes?: string | null
          operation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "erp_account_mappings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "erp_account_mappings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          effective_date: string
          from_currency: string
          id: string
          is_active: boolean | null
          notes: string | null
          rate: number
          to_currency: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          from_currency: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          rate: number
          to_currency: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          effective_date?: string
          from_currency?: string
          id?: string
          is_active?: boolean | null
          notes?: string | null
          rate?: number
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      expense_items: {
        Row: {
          account_code: string | null
          created_at: string | null
          description: string
          expense_id: string
          id: string
          line_no: number
          line_total: number
          notes: string | null
          quantity: number
          tax_amount: number | null
          tax_code: string | null
          tax_percentage: number | null
          unit_price: number
        }
        Insert: {
          account_code?: string | null
          created_at?: string | null
          description: string
          expense_id: string
          id?: string
          line_no: number
          line_total?: number
          notes?: string | null
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_percentage?: number | null
          unit_price?: number
        }
        Update: {
          account_code?: string | null
          created_at?: string | null
          description?: string
          expense_id?: string
          id?: string
          line_no?: number
          line_total?: number
          notes?: string | null
          quantity?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_percentage?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "expense_items_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          expense_date: string
          expense_number: string
          expense_type: string
          id: string
          notes: string | null
          paid_amount: number
          payment_method: string | null
          payment_status: string
          posted_at: string | null
          posted_by: string | null
          reference_number: string | null
          status: string
          supplier_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_number: string
          expense_type: string
          id?: string
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          payment_status?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          status?: string
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_number?: string
          expense_type?: string
          id?: string
          notes?: string | null
          paid_amount?: number
          payment_method?: string | null
          payment_status?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          status?: string
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "expenses_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_accounts: {
        Row: {
          account_code: string
          account_name: string
          account_name_en: string | null
          account_type: string
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_header: boolean | null
          parent_account_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_code: string
          account_name: string
          account_name_en?: string | null
          account_type: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_header?: boolean | null
          parent_account_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_code?: string
          account_name?: string
          account_name_en?: string | null
          account_type?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_header?: boolean | null
          parent_account_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gl_accounts_parent_account_id_fkey"
            columns: ["parent_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_journal_entries: {
        Row: {
          accounting_period_id: string | null
          branch_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_no: string
          id: string
          is_posted: boolean
          is_reversed: boolean
          posting_date: string
          reversed_by: string | null
          source_document_id: string | null
          source_module: string | null
          updated_at: string
        }
        Insert: {
          accounting_period_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date: string
          entry_no: string
          id?: string
          is_posted?: boolean
          is_reversed?: boolean
          posting_date?: string
          reversed_by?: string | null
          source_document_id?: string | null
          source_module?: string | null
          updated_at?: string
        }
        Update: {
          accounting_period_id?: string | null
          branch_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_no?: string
          id?: string
          is_posted?: boolean
          is_reversed?: boolean
          posting_date?: string
          reversed_by?: string | null
          source_document_id?: string | null
          source_module?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_journal_entries_accounting_period_id_fkey"
            columns: ["accounting_period_id"]
            isOneToOne: false
            referencedRelation: "accounting_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_journal_lines: {
        Row: {
          account_id: string
          branch_id: string | null
          cost_center_id: string | null
          created_at: string
          credit: number
          credit_bc: number | null
          credit_fc: number | null
          currency_code: string | null
          debit: number
          debit_bc: number | null
          debit_fc: number | null
          description: string | null
          exchange_rate: number | null
          id: string
          journal_id: string
          line_no: number
        }
        Insert: {
          account_id: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          credit_bc?: number | null
          credit_fc?: number | null
          currency_code?: string | null
          debit?: number
          debit_bc?: number | null
          debit_fc?: number | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_id: string
          line_no: number
        }
        Update: {
          account_id?: string
          branch_id?: string | null
          cost_center_id?: string | null
          created_at?: string
          credit?: number
          credit_bc?: number | null
          credit_fc?: number | null
          currency_code?: string | null
          debit?: number
          debit_bc?: number | null
          debit_fc?: number | null
          description?: string | null
          exchange_rate?: number | null
          id?: string
          journal_id?: string
          line_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "gl_journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "vw_document_gl_links"
            referencedColumns: ["journal_entry_id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          documents: Json | null
          exchange_rate: number | null
          grn_number: string
          id: string
          notes: string | null
          po_id: string | null
          posted_at: string | null
          posted_by: string | null
          received_at: string | null
          status: string | null
          supplier_id: string | null
          total_amount_bc: number | null
          total_amount_fc: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          documents?: Json | null
          exchange_rate?: number | null
          grn_number: string
          id?: string
          notes?: string | null
          po_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          received_at?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          documents?: Json | null
          exchange_rate?: number | null
          grn_number?: string
          id?: string
          notes?: string | null
          po_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          received_at?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      grn_items: {
        Row: {
          created_at: string | null
          expiry_date: string
          grn_id: string | null
          id: string
          item_id: string | null
          line_total_bc: number | null
          line_total_fc: number | null
          lot_no: string
          notes: string | null
          po_item_id: string | null
          qty_received: number
          unit_cost: number | null
          unit_cost_bc: number | null
          unit_cost_fc: number | null
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date: string
          grn_id?: string | null
          id?: string
          item_id?: string | null
          line_total_bc?: number | null
          line_total_fc?: number | null
          lot_no: string
          notes?: string | null
          po_item_id?: string | null
          qty_received: number
          unit_cost?: number | null
          unit_cost_bc?: number | null
          unit_cost_fc?: number | null
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string
          grn_id?: string | null
          id?: string
          item_id?: string | null
          line_total_bc?: number | null
          line_total_fc?: number | null
          lot_no?: string
          notes?: string | null
          po_item_id?: string | null
          qty_received?: number
          unit_cost?: number | null
          unit_cost_bc?: number | null
          unit_cost_fc?: number | null
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grn_items_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "grn_items_po_item_id_fkey"
            columns: ["po_item_id"]
            isOneToOne: false
            referencedRelation: "po_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grn_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      health_record_audit: {
        Row: {
          accessed_at: string
          action: string
          customer_id: string
          id: string
          ip_address: string | null
          prescription_id: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          accessed_at?: string
          action: string
          customer_id: string
          id?: string
          ip_address?: string | null
          prescription_id?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          accessed_at?: string
          action?: string
          customer_id?: string
          id?: string
          ip_address?: string | null
          prescription_id?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "health_record_audit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_record_audit_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_record_audit_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_companies: {
        Row: {
          address: string | null
          code: string
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          discount_percentage: number | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          code: string
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          discount_percentage?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          discount_percentage?: number | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      inventory_cost_layers: {
        Row: {
          batch_number: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          exchange_rate_at_receipt: number | null
          expiry_date: string | null
          id: string
          product_id: string
          quantity_original: number
          quantity_remaining: number
          received_date: string
          source_document_id: string | null
          source_document_number: string | null
          source_document_type: string
          unit_cost: number
          unit_cost_fc: number | null
          warehouse_id: string
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate_at_receipt?: number | null
          expiry_date?: string | null
          id?: string
          product_id: string
          quantity_original?: number
          quantity_remaining?: number
          received_date?: string
          source_document_id?: string | null
          source_document_number?: string | null
          source_document_type: string
          unit_cost?: number
          unit_cost_fc?: number | null
          warehouse_id: string
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate_at_receipt?: number | null
          expiry_date?: string | null
          id?: string
          product_id?: string
          quantity_original?: number
          quantity_remaining?: number
          received_date?: string
          source_document_id?: string | null
          source_document_number?: string | null
          source_document_type?: string
          unit_cost?: number
          unit_cost_fc?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_cost_layers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "inventory_cost_layers_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_tax_details: {
        Row: {
          created_at: string | null
          id: string
          invoice_id: string
          invoice_type: string
          item_id: string | null
          tax_amount: number
          tax_category: string
          tax_rate: number
          taxable_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          invoice_id: string
          invoice_type: string
          item_id?: string | null
          tax_amount: number
          tax_category: string
          tax_rate: number
          taxable_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          invoice_id?: string
          invoice_type?: string
          item_id?: string | null
          tax_amount?: number
          tax_category?: string
          tax_rate?: number
          taxable_amount?: number
        }
        Relationships: []
      }
      item_barcodes: {
        Row: {
          barcode: string
          created_at: string | null
          id: string
          is_default: boolean | null
          item_id: string
          uom_id: string | null
        }
        Insert: {
          barcode: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          item_id: string
          uom_id?: string | null
        }
        Update: {
          barcode?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          item_id?: string
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_barcodes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_barcodes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "item_barcodes_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      item_prices: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          item_id: string
          max_price: number | null
          min_price: number | null
          price: number
          price_list_id: string
          uom_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          item_id: string
          max_price?: number | null
          min_price?: number | null
          price: number
          price_list_id: string
          uom_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          item_id?: string
          max_price?: number | null
          min_price?: number | null
          price?: number
          price_list_id?: string
          uom_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_prices_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "item_prices_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_prices_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      item_substitutions: {
        Row: {
          alt_item_id: string
          created_at: string | null
          id: string
          item_id: string
          rationale: string | null
        }
        Insert: {
          alt_item_id: string
          created_at?: string | null
          id?: string
          item_id: string
          rationale?: string | null
        }
        Update: {
          alt_item_id?: string
          created_at?: string | null
          id?: string
          item_id?: string
          rationale?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "item_substitutions_alt_item_id_fkey"
            columns: ["alt_item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_substitutions_alt_item_id_fkey"
            columns: ["alt_item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "item_substitutions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_substitutions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      item_uoms: {
        Row: {
          barcode: string | null
          conversion_factor: number
          created_at: string | null
          id: string
          is_base: boolean | null
          item_id: string
          uom_id: string
        }
        Insert: {
          barcode?: string | null
          conversion_factor?: number
          created_at?: string | null
          id?: string
          is_base?: boolean | null
          item_id: string
          uom_id: string
        }
        Update: {
          barcode?: string | null
          conversion_factor?: number
          created_at?: string | null
          id?: string
          is_base?: boolean | null
          item_id?: string
          uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_uoms_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "item_uoms_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "item_uoms_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          id: string
          posted_at: string | null
          posted_by: string | null
          posting_date: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          total_credit: number | null
          total_debit: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          posting_date?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          total_credit?: number | null
          total_debit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string | null
          credit_amount: number | null
          currency: string | null
          debit_amount: number | null
          description: string | null
          entry_id: string
          id: string
          line_no: number
        }
        Insert: {
          account_id: string
          created_at?: string | null
          credit_amount?: number | null
          currency?: string | null
          debit_amount?: number | null
          description?: string | null
          entry_id: string
          id?: string
          line_no: number
        }
        Update: {
          account_id?: string
          created_at?: string | null
          credit_amount?: number | null
          currency?: string | null
          debit_amount?: number | null
          description?: string | null
          entry_id?: string
          id?: string
          line_no?: number
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_tests: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          interpretation: string | null
          notes: string | null
          ordered_by: string | null
          reference_range: string | null
          results: string | null
          test_date: string
          test_name: string
          test_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          interpretation?: string | null
          notes?: string | null
          ordered_by?: string | null
          reference_range?: string | null
          results?: string | null
          test_date: string
          test_name: string
          test_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          interpretation?: string | null
          notes?: string | null
          ordered_by?: string | null
          reference_range?: string | null
          results?: string | null
          test_date?: string
          test_name?: string
          test_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_tests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_tests_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          created_at: string | null
          customer_id: string | null
          id: string
          lifetime_points: number | null
          points_balance: number | null
          rules: Json | null
          tier: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          lifetime_points?: number | null
          points_balance?: number | null
          rules?: Json | null
          tier?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          id?: string
          lifetime_points?: number | null
          points_balance?: number | null
          rules?: Json | null
          tier?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_accounts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: true
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          account_id: string | null
          created_at: string | null
          description: string | null
          id: string
          points: number
          ref_id: string | null
          ref_type: string | null
          transaction_type: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points: number
          ref_id?: string | null
          ref_type?: string | null
          transaction_type: string
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          points?: number
          ref_id?: string | null
          ref_type?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "loyalty_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          contact_info: Json | null
          country: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          contact_info?: Json | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          contact_info?: Json | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      marketing_campaigns: {
        Row: {
          actual_cost: number | null
          budget: number | null
          campaign_number: string
          campaign_type: string
          conversion_count: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          discount_amount: number | null
          discount_percentage: number | null
          end_date: string | null
          id: string
          name: string
          name_en: string | null
          reached_customers_count: number | null
          revenue_generated: number | null
          start_date: string
          status: string | null
          target_customers_count: number | null
          target_segment: string | null
          updated_at: string | null
        }
        Insert: {
          actual_cost?: number | null
          budget?: number | null
          campaign_number: string
          campaign_type: string
          conversion_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          name: string
          name_en?: string | null
          reached_customers_count?: number | null
          revenue_generated?: number | null
          start_date: string
          status?: string | null
          target_customers_count?: number | null
          target_segment?: string | null
          updated_at?: string | null
        }
        Update: {
          actual_cost?: number | null
          budget?: number | null
          campaign_number?: string
          campaign_type?: string
          conversion_count?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          end_date?: string | null
          id?: string
          name?: string
          name_en?: string | null
          reached_customers_count?: number | null
          revenue_generated?: number | null
          start_date?: string
          status?: string | null
          target_customers_count?: number | null
          target_segment?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      medication_history: {
        Row: {
          created_at: string | null
          customer_id: string
          dosage: string
          effectiveness: string | null
          end_date: string | null
          frequency: string | null
          id: string
          notes: string | null
          prescription_id: string | null
          product_id: string
          reason: string | null
          side_effects: string | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id: string
          dosage: string
          effectiveness?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          prescription_id?: string | null
          product_id: string
          reason?: string | null
          side_effects?: string | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string
          dosage?: string
          effectiveness?: string | null
          end_date?: string | null
          frequency?: string | null
          id?: string
          notes?: string | null
          prescription_id?: string | null
          product_id?: string
          reason?: string | null
          side_effects?: string | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_history_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_history_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medication_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          allocated_amount: number
          created_at: string | null
          id: string
          invoice_id: string
          invoice_type: string
          payment_id: string | null
        }
        Insert: {
          allocated_amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          invoice_type: string
          payment_id?: string | null
        }
        Update: {
          allocated_amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          invoice_type?: string
          payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          account_id: string | null
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          max_transaction_amount: number | null
          method_type: string
          name: string
          name_en: string | null
          requires_reference: boolean | null
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_transaction_amount?: number | null
          method_type: string
          name: string
          name_en?: string | null
          requires_reference?: boolean | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          max_transaction_amount?: number | null
          method_type?: string
          name?: string
          name_en?: string | null
          requires_reference?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          currency: string | null
          entity_id: string
          entity_type: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string
          payment_number: string
          posted_at: string | null
          reference: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          entity_id: string
          entity_type: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method: string
          payment_number: string
          posted_at?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string
          payment_number?: string
          posted_at?: string | null
          reference?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          permission_key: string
          permission_name: string
          permission_name_en: string | null
          sort_order: number | null
          subcategory: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permission_key: string
          permission_name: string
          permission_name_en?: string | null
          sort_order?: number | null
          subcategory?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          permission_key?: string
          permission_name?: string
          permission_name_en?: string | null
          sort_order?: number | null
          subcategory?: string | null
        }
        Relationships: []
      }
      pi_items: {
        Row: {
          created_at: string | null
          discount: number | null
          grn_item_id: string | null
          id: string
          item_id: string | null
          line_total: number | null
          line_total_bc: number | null
          line_total_fc: number | null
          pi_id: string | null
          price: number
          price_bc: number | null
          price_fc: number | null
          qty: number
          tax_amount: number | null
          tax_code: string | null
          tax_rate: number | null
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          grn_item_id?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          line_total_bc?: number | null
          line_total_fc?: number | null
          pi_id?: string | null
          price: number
          price_bc?: number | null
          price_fc?: number | null
          qty: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          grn_item_id?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          line_total_bc?: number | null
          line_total_fc?: number | null
          pi_id?: string | null
          price?: number
          price_bc?: number | null
          price_fc?: number | null
          qty?: number
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pi_items_grn_item_id_fkey"
            columns: ["grn_item_id"]
            isOneToOne: false
            referencedRelation: "grn_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pi_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pi_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "pi_items_pi_id_fkey"
            columns: ["pi_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pi_items_tax_code_fkey"
            columns: ["tax_code"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["tax_code"]
          },
          {
            foreignKeyName: "pi_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      po_items: {
        Row: {
          created_at: string | null
          discount: number | null
          expected_date: string | null
          id: string
          item_id: string
          line_no: number
          line_total: number | null
          net_amount: number | null
          net_amount_bc: number | null
          net_amount_fc: number | null
          notes: string | null
          po_id: string | null
          price: number
          price_bc: number | null
          price_fc: number | null
          qty_ordered: number
          qty_received: number | null
          tax_amount: number | null
          tax_code: string | null
          tax_rate: number | null
          uom_id: string
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          expected_date?: string | null
          id?: string
          item_id: string
          line_no: number
          line_total?: number | null
          net_amount?: number | null
          net_amount_bc?: number | null
          net_amount_fc?: number | null
          notes?: string | null
          po_id?: string | null
          price: number
          price_bc?: number | null
          price_fc?: number | null
          qty_ordered: number
          qty_received?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          uom_id: string
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          expected_date?: string | null
          id?: string
          item_id?: string
          line_no?: number
          line_total?: number | null
          net_amount?: number | null
          net_amount_bc?: number | null
          net_amount_fc?: number | null
          notes?: string | null
          po_id?: string | null
          price?: number
          price_bc?: number | null
          price_fc?: number | null
          qty_ordered?: number
          qty_received?: number | null
          tax_amount?: number | null
          tax_code?: string | null
          tax_rate?: number | null
          uom_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_items_tax_code_fkey"
            columns: ["tax_code"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["tax_code"]
          },
          {
            foreignKeyName: "po_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_devices: {
        Row: {
          branch: string | null
          created_at: string | null
          created_by: string | null
          device_code: string
          device_name: string
          device_type: string
          floor_section: string | null
          id: string
          ip_address: string | null
          last_activity: string | null
          location: string | null
          operating_system: string | null
          permissions: Json | null
          port: number | null
          printer_settings: Json | null
          serial_number: string | null
          status: string
          updated_at: string | null
          version: string | null
        }
        Insert: {
          branch?: string | null
          created_at?: string | null
          created_by?: string | null
          device_code: string
          device_name: string
          device_type?: string
          floor_section?: string | null
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          location?: string | null
          operating_system?: string | null
          permissions?: Json | null
          port?: number | null
          printer_settings?: Json | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          branch?: string | null
          created_at?: string | null
          created_by?: string | null
          device_code?: string
          device_name?: string
          device_type?: string
          floor_section?: string | null
          id?: string
          ip_address?: string | null
          last_activity?: string | null
          location?: string | null
          operating_system?: string | null
          permissions?: Json | null
          port?: number | null
          printer_settings?: Json | null
          serial_number?: string | null
          status?: string
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      pos_sessions: {
        Row: {
          cash_difference: number | null
          closed_by: string | null
          closing_cash: number | null
          created_at: string | null
          device_id: string | null
          employee_id: string | null
          end_time: string | null
          expected_cash: number | null
          id: string
          is_posted: boolean | null
          journal_entry_id: string | null
          notes: string | null
          opening_cash: number
          session_date: string
          session_number: string
          shift_id: string | null
          start_time: string | null
          status: string
          total_sales: number | null
          total_transactions: number | null
          updated_at: string | null
          user_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          cash_difference?: number | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string | null
          device_id?: string | null
          employee_id?: string | null
          end_time?: string | null
          expected_cash?: number | null
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          notes?: string | null
          opening_cash?: number
          session_date?: string
          session_number: string
          shift_id?: string | null
          start_time?: string | null
          status?: string
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          cash_difference?: number | null
          closed_by?: string | null
          closing_cash?: number | null
          created_at?: string | null
          device_id?: string | null
          employee_id?: string | null
          end_time?: string | null
          expected_cash?: number | null
          id?: string
          is_posted?: boolean | null
          journal_entry_id?: string | null
          notes?: string | null
          opening_cash?: number
          session_date?: string
          session_number?: string
          shift_id?: string | null
          start_time?: string | null
          status?: string
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string | null
          user_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "pos_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employee_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "safe_employees_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "vw_document_gl_links"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "pos_sessions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "pos_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "pos_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_shifts: {
        Row: {
          active_days: string[] | null
          allow_credit_sales: boolean | null
          allowed_devices: string[] | null
          allowed_users: string[] | null
          created_at: string | null
          created_by: string | null
          credit_limit: number | null
          description: string | null
          end_time: string
          id: string
          is_active: boolean | null
          max_balance: number | null
          opening_balance: number | null
          shift_name: string
          shift_type: string
          start_time: string
          updated_at: string | null
        }
        Insert: {
          active_days?: string[] | null
          allow_credit_sales?: boolean | null
          allowed_devices?: string[] | null
          allowed_users?: string[] | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          description?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          max_balance?: number | null
          opening_balance?: number | null
          shift_name: string
          shift_type?: string
          start_time: string
          updated_at?: string | null
        }
        Update: {
          active_days?: string[] | null
          allow_credit_sales?: boolean | null
          allowed_devices?: string[] | null
          allowed_users?: string[] | null
          created_at?: string | null
          created_by?: string | null
          credit_limit?: number | null
          description?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          max_balance?: number | null
          opening_balance?: number | null
          shift_name?: string
          shift_type?: string
          start_time?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      posting_rules: {
        Row: {
          account_type: string | null
          created_at: string | null
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          document_type: string
          id: string
          is_active: boolean | null
          rule_name: string
          updated_at: string | null
        }
        Insert: {
          account_type?: string | null
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          document_type: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          updated_at?: string | null
        }
        Update: {
          account_type?: string | null
          created_at?: string | null
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posting_rules_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posting_rules_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "gl_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string | null
          dosage: string
          duration_days: number
          frequency: string
          id: string
          instructions: string | null
          prescription_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          created_at?: string | null
          dosage: string
          duration_days: number
          frequency: string
          id?: string
          instructions?: string | null
          prescription_id: string
          product_id: string
          quantity: number
        }
        Update: {
          created_at?: string | null
          dosage?: string
          duration_days?: number
          frequency?: string
          id?: string
          instructions?: string | null
          prescription_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          diagnosis: string | null
          dispensed_at: string | null
          dispensed_by: string | null
          doctor_id: string
          id: string
          notes: string | null
          prescription_date: string
          prescription_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          diagnosis?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          prescription_date?: string
          prescription_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          diagnosis?: string | null
          dispensed_at?: string | null
          dispensed_by?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          prescription_date?: string
          prescription_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          name_en: string | null
          updated_at: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          name_en?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          name_en?: string | null
          updated_at?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      product_batches: {
        Row: {
          batch_number: string
          cost_price: number
          created_at: string | null
          expiry_date: string
          id: string
          is_expired: boolean | null
          product_id: string
          quantity: number
          updated_at: string | null
        }
        Insert: {
          batch_number: string
          cost_price: number
          created_at?: string | null
          expiry_date: string
          id?: string
          is_expired?: boolean | null
          product_id: string
          quantity?: number
          updated_at?: string | null
        }
        Update: {
          batch_number?: string
          cost_price?: number
          created_at?: string | null
          expiry_date?: string
          id?: string
          is_expired?: boolean | null
          product_id?: string
          quantity?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      products: {
        Row: {
          allow_discount: boolean | null
          barcode: string | null
          base_uom_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string | null
          default_discount_percentage: number | null
          description: string | null
          expiry_date: string | null
          form: Database["public"]["Enums"]["product_form"] | null
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_controlled: boolean | null
          manufacturer_id: string | null
          max_discount_percentage: number | null
          min_quantity: number | null
          name: string
          name_en: string | null
          preferred_supplier_id: string | null
          price: number
          quantity: number
          reorder_level: number | null
          reorder_qty: number | null
          sellable: boolean | null
          sku: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          storage_conditions: Json | null
          strength: string | null
          therapeutic_class_id: string | null
          updated_at: string | null
        }
        Insert: {
          allow_discount?: boolean | null
          barcode?: string | null
          base_uom_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          default_discount_percentage?: number | null
          description?: string | null
          expiry_date?: string | null
          form?: Database["public"]["Enums"]["product_form"] | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_controlled?: boolean | null
          manufacturer_id?: string | null
          max_discount_percentage?: number | null
          min_quantity?: number | null
          name: string
          name_en?: string | null
          preferred_supplier_id?: string | null
          price?: number
          quantity?: number
          reorder_level?: number | null
          reorder_qty?: number | null
          sellable?: boolean | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          storage_conditions?: Json | null
          strength?: string | null
          therapeutic_class_id?: string | null
          updated_at?: string | null
        }
        Update: {
          allow_discount?: boolean | null
          barcode?: string | null
          base_uom_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          default_discount_percentage?: number | null
          description?: string | null
          expiry_date?: string | null
          form?: Database["public"]["Enums"]["product_form"] | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_controlled?: boolean | null
          manufacturer_id?: string | null
          max_discount_percentage?: number | null
          min_quantity?: number | null
          name?: string
          name_en?: string | null
          preferred_supplier_id?: string | null
          price?: number
          quantity?: number
          reorder_level?: number | null
          reorder_qty?: number | null
          sellable?: boolean | null
          sku?: string | null
          status?: Database["public"]["Enums"]["product_status"] | null
          storage_conditions?: Json | null
          strength?: string | null
          therapeutic_class_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_base_uom_id_fkey"
            columns: ["base_uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_therapeutic_class_id_fkey"
            columns: ["therapeutic_class_id"]
            isOneToOne: false
            referencedRelation: "therapeutic_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active_from: string | null
          active_to: string | null
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          priority: number | null
          rule: Json
          scope: string
          updated_at: string | null
        }
        Insert: {
          active_from?: string | null
          active_to?: string | null
          code: string
          created_at?: string | null
          discount_type: string
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          priority?: number | null
          rule: Json
          scope: string
          updated_at?: string | null
        }
        Update: {
          active_from?: string | null
          active_to?: string | null
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          priority?: number | null
          rule?: Json
          scope?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      purchase_invoices: {
        Row: {
          attachments: Json | null
          base_currency_total: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          currency_code: string | null
          discount_amount: number | null
          discount_amount_bc: number | null
          discount_amount_fc: number | null
          due_date: string | null
          exchange_rate: number | null
          grn_id: string | null
          id: string
          invoice_date: string
          invoice_type: string | null
          notes: string | null
          paid_amount: number | null
          paid_amount_bc: number | null
          paid_amount_fc: number | null
          payment_status: string | null
          pi_number: string
          po_id: string | null
          posted_at: string | null
          posted_by: string | null
          status: string | null
          subtotal: number | null
          subtotal_bc: number | null
          subtotal_fc: number | null
          supplier_id: string | null
          supplier_invoice_no: string
          tax_amount: number | null
          tax_amount_bc: number | null
          tax_amount_fc: number | null
          total_amount: number | null
          total_amount_bc: number | null
          total_amount_fc: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          attachments?: Json | null
          base_currency_total?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          currency_code?: string | null
          discount_amount?: number | null
          discount_amount_bc?: number | null
          discount_amount_fc?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          grn_id?: string | null
          id?: string
          invoice_date: string
          invoice_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_amount_bc?: number | null
          paid_amount_fc?: number | null
          payment_status?: string | null
          pi_number: string
          po_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          subtotal?: number | null
          subtotal_bc?: number | null
          subtotal_fc?: number | null
          supplier_id?: string | null
          supplier_invoice_no: string
          tax_amount?: number | null
          tax_amount_bc?: number | null
          tax_amount_fc?: number | null
          total_amount?: number | null
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          attachments?: Json | null
          base_currency_total?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          currency_code?: string | null
          discount_amount?: number | null
          discount_amount_bc?: number | null
          discount_amount_fc?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          grn_id?: string | null
          id?: string
          invoice_date?: string
          invoice_type?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_amount_bc?: number | null
          paid_amount_fc?: number | null
          payment_status?: string | null
          pi_number?: string
          po_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          subtotal?: number | null
          subtotal_bc?: number | null
          subtotal_fc?: number | null
          supplier_id?: string | null
          supplier_invoice_no?: string
          tax_amount?: number | null
          tax_amount_bc?: number | null
          tax_amount_fc?: number | null
          total_amount?: number | null
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "purchase_invoices_grn_id_fkey"
            columns: ["grn_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "purchase_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          attachments: Json | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          currency_code: string | null
          exchange_rate: number | null
          expected_date: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          po_number: string
          status: string | null
          subtotal: number | null
          subtotal_bc: number | null
          subtotal_fc: number | null
          supplier_id: string | null
          tax_amount: number | null
          tax_amount_bc: number | null
          tax_amount_fc: number | null
          total_amount: number | null
          total_amount_bc: number | null
          total_amount_fc: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          po_number: string
          status?: string | null
          subtotal?: number | null
          subtotal_bc?: number | null
          subtotal_fc?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          tax_amount_bc?: number | null
          tax_amount_fc?: number | null
          total_amount?: number | null
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          po_number?: string
          status?: string | null
          subtotal?: number | null
          subtotal_bc?: number | null
          subtotal_fc?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          tax_amount_bc?: number | null
          tax_amount_fc?: number | null
          total_amount?: number | null
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_return_items: {
        Row: {
          already_returned_qty: number | null
          batch_number: string | null
          condition: string | null
          created_at: string | null
          id: string
          invoice_item_id: string | null
          item_id: string
          line_total: number
          max_returnable_qty: number | null
          quantity: number
          return_id: string
          return_reason: string | null
          unit_cost: number
        }
        Insert: {
          already_returned_qty?: number | null
          batch_number?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          invoice_item_id?: string | null
          item_id: string
          line_total: number
          max_returnable_qty?: number | null
          quantity: number
          return_id: string
          return_reason?: string | null
          unit_cost: number
        }
        Update: {
          already_returned_qty?: number | null
          batch_number?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          invoice_item_id?: string | null
          item_id?: string
          line_total?: number
          max_returnable_qty?: number | null
          quantity?: number
          return_id?: string
          return_reason?: string | null
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_return_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "pi_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "purchase_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "purchase_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_returns: {
        Row: {
          created_at: string | null
          created_by: string | null
          debit_note_number: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          purchase_invoice_id: string | null
          reason: string
          refund_amount: number
          refund_method: string | null
          return_date: string
          return_number: string
          return_type: string
          status: string
          subtotal: number
          supplier_id: string
          tax_amount: number
          total_amount: number
          total_cost_reversed: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          debit_note_number?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          purchase_invoice_id?: string | null
          reason: string
          refund_amount?: number
          refund_method?: string | null
          return_date?: string
          return_number: string
          return_type: string
          status?: string
          subtotal?: number
          supplier_id: string
          tax_amount?: number
          total_amount?: number
          total_cost_reversed?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          debit_note_number?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          purchase_invoice_id?: string | null
          reason?: string
          refund_amount?: number
          refund_method?: string | null
          return_date?: string
          return_number?: string
          return_type?: string
          status?: string
          subtotal?: number
          supplier_id?: string
          tax_amount?: number
          total_amount?: number
          total_cost_reversed?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_returns_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "vw_document_gl_links"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "purchase_returns_purchase_invoice_id_fkey"
            columns: ["purchase_invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "purchase_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      reorder_rules: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          item_id: string | null
          min_qty: number
          reorder_point: number
          reorder_qty: number
          supplier_id: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          min_qty: number
          reorder_point: number
          reorder_qty: number
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          item_id?: string | null
          min_qty?: number
          reorder_point?: number
          reorder_qty?: number
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "reorder_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "reorder_rules_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          batch_id: string | null
          created_at: string | null
          disposition: string | null
          id: string
          item_id: string | null
          price: number | null
          qty: number
          reason: string | null
          return_id: string | null
          uom_id: string | null
        }
        Insert: {
          batch_id?: string | null
          created_at?: string | null
          disposition?: string | null
          id?: string
          item_id?: string | null
          price?: number | null
          qty: number
          reason?: string | null
          return_id?: string | null
          uom_id?: string | null
        }
        Update: {
          batch_id?: string | null
          created_at?: string | null
          disposition?: string | null
          id?: string
          item_id?: string | null
          price?: number | null
          qty?: number
          reason?: string | null
          return_id?: string | null
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "return_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "warehouse_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reason: string | null
          ref_invoice_id: string
          return_date: string | null
          return_number: string
          return_type: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reason?: string | null
          ref_invoice_id: string
          return_date?: string | null
          return_number: string
          return_type: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reason?: string | null
          ref_invoice_id?: string
          return_date?: string | null
          return_number?: string
          return_type?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          role_name: string
          role_name_en: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role_name: string
          role_name_en?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role_name?: string
          role_name_en?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string | null
          discount: number | null
          id: string
          product_id: string | null
          quantity: number
          sale_id: string | null
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity: number
          sale_id?: string | null
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string | null
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          created_at: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          final_amount: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string | null
          pos_session_id: string | null
          sale_date: string | null
          sale_number: string
          subtotal: number | null
          tax_amount: number | null
          total_amount: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          final_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pos_session_id?: string | null
          sale_date?: string | null
          sale_number: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          final_amount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string | null
          pos_session_id?: string | null
          sale_date?: string | null
          sale_number?: string
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoice_items: {
        Row: {
          batch_number: string | null
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          expiry_date: string | null
          id: string
          invoice_id: string
          item_id: string
          line_no: number | null
          line_total: number
          quantity: number
          tax_amount: number | null
          tax_percentage: number | null
          unit_price: number
          uom_id: string | null
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expiry_date?: string | null
          id?: string
          invoice_id: string
          item_id: string
          line_no?: number | null
          line_total: number
          quantity: number
          tax_amount?: number | null
          tax_percentage?: number | null
          unit_price: number
          uom_id?: string | null
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expiry_date?: string | null
          id?: string
          invoice_id?: string
          item_id?: string
          line_no?: number | null
          line_total?: number
          quantity?: number
          tax_amount?: number | null
          tax_percentage?: number | null
          unit_price?: number
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_invoice_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          base_currency_total: number | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          customer_id: string
          discount_amount: number
          discount_amount_bc: number | null
          discount_amount_fc: number | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number
          paid_amount_bc: number | null
          paid_amount_fc: number | null
          payment_method_id: string | null
          payment_status: string
          payment_terms: string | null
          pos_session_id: string | null
          posted_at: string | null
          posted_by: string | null
          status: string
          subtotal: number
          subtotal_bc: number | null
          subtotal_fc: number | null
          tax_amount: number
          tax_amount_bc: number | null
          tax_amount_fc: number | null
          total_amount: number
          total_amount_bc: number | null
          total_amount_fc: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          base_currency_total?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id: string
          discount_amount?: number
          discount_amount_bc?: number | null
          discount_amount_fc?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number
          paid_amount_bc?: number | null
          paid_amount_fc?: number | null
          payment_method_id?: string | null
          payment_status?: string
          payment_terms?: string | null
          pos_session_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string
          subtotal?: number
          subtotal_bc?: number | null
          subtotal_fc?: number | null
          tax_amount?: number
          tax_amount_bc?: number | null
          tax_amount_fc?: number | null
          total_amount?: number
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          base_currency_total?: number | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          customer_id?: string
          discount_amount?: number
          discount_amount_bc?: number | null
          discount_amount_fc?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number
          paid_amount_bc?: number | null
          paid_amount_fc?: number | null
          payment_method_id?: string | null
          payment_status?: string
          payment_terms?: string | null
          pos_session_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          status?: string
          subtotal?: number
          subtotal_bc?: number | null
          subtotal_fc?: number | null
          tax_amount?: number
          tax_amount_bc?: number | null
          tax_amount_fc?: number | null
          total_amount?: number
          total_amount_bc?: number | null
          total_amount_fc?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_invoices_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string | null
          customer_id: string | null
          discount_amount: number | null
          due_date: string | null
          id: string
          notes: string | null
          order_date: string | null
          so_number: string
          status: string | null
          subtotal: number | null
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          so_number: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          due_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string | null
          so_number?: string
          status?: string | null
          subtotal?: number | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_return_items: {
        Row: {
          already_returned_qty: number | null
          batch_number: string | null
          condition: string | null
          created_at: string | null
          discount_amount: number | null
          discount_percentage: number | null
          id: string
          invoice_item_id: string | null
          item_id: string
          line_total: number
          max_returnable_qty: number | null
          quantity: number
          return_id: string
          return_reason: string | null
          tax_amount: number | null
          tax_percentage: number | null
          unit_price: number
        }
        Insert: {
          already_returned_qty?: number | null
          batch_number?: string | null
          condition?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_item_id?: string | null
          item_id: string
          line_total: number
          max_returnable_qty?: number | null
          quantity: number
          return_id: string
          return_reason?: string | null
          tax_amount?: number | null
          tax_percentage?: number | null
          unit_price: number
        }
        Update: {
          already_returned_qty?: number | null
          batch_number?: string | null
          condition?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          id?: string
          invoice_item_id?: string | null
          item_id?: string
          line_total?: number
          max_returnable_qty?: number | null
          quantity?: number
          return_id?: string
          return_reason?: string | null
          tax_amount?: number | null
          tax_percentage?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_invoice_item_id_fkey"
            columns: ["invoice_item_id"]
            isOneToOne: false
            referencedRelation: "sales_invoice_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns_inventory_impact"
            referencedColumns: ["return_id"]
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns_processing_monitor"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "sales_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_returns: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          invoice_id: string | null
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reason: string
          refund_amount: number
          refund_method: string | null
          return_date: string
          return_number: string
          return_type: string
          sales_invoice_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reason: string
          refund_amount?: number
          refund_method?: string | null
          return_date?: string
          return_number: string
          return_type: string
          sales_invoice_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reason?: string
          refund_amount?: number
          refund_method?: string | null
          return_date?: string
          return_number?: string
          return_type?: string
          sales_invoice_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_sales_invoice_id_fkey"
            columns: ["sales_invoice_id"]
            isOneToOne: false
            referencedRelation: "sales_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      so_items: {
        Row: {
          created_at: string | null
          discount: number | null
          id: string
          item_id: string | null
          line_no: number
          line_total: number | null
          price: number
          qty_delivered: number | null
          qty_ordered: number
          so_id: string | null
          tax_code: string | null
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          id?: string
          item_id?: string | null
          line_no: number
          line_total?: number | null
          price: number
          qty_delivered?: number | null
          qty_ordered: number
          so_id?: string | null
          tax_code?: string | null
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          id?: string
          item_id?: string | null
          line_no?: number
          line_total?: number | null
          price?: number
          qty_delivered?: number | null
          qty_ordered?: number
          so_id?: string | null
          tax_code?: string | null
          uom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "so_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "so_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "so_items_so_id_fkey"
            columns: ["so_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "so_items_tax_code_fkey"
            columns: ["tax_code"]
            isOneToOne: false
            referencedRelation: "taxes"
            referencedColumns: ["tax_code"]
          },
          {
            foreignKeyName: "so_items_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustment_items: {
        Row: {
          adjustment_id: string
          batch_number: string | null
          created_at: string | null
          expiry_date: string | null
          id: string
          line_reason: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_diff: number
          total_cost_diff: number | null
          unit_cost: number | null
        }
        Insert: {
          adjustment_id: string
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          line_reason?: string | null
          product_id: string
          quantity_after?: number
          quantity_before?: number
          quantity_diff?: number
          total_cost_diff?: number | null
          unit_cost?: number | null
        }
        Update: {
          adjustment_id?: string
          batch_number?: string | null
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          line_reason?: string | null
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_diff?: number
          total_cost_diff?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustment_items_adjustment_id_fkey"
            columns: ["adjustment_id"]
            isOneToOne: false
            referencedRelation: "stock_adjustments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustment_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          adjustment_date: string
          adjustment_number: string
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string | null
          created_by: string | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          posted_at: string | null
          posted_by: string | null
          reason: string
          status: string
          total_difference_qty: number | null
          total_difference_value: number | null
          warehouse_id: string
        }
        Insert: {
          adjustment_date?: string
          adjustment_number: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reason: string
          status?: string
          total_difference_qty?: number | null
          total_difference_value?: number | null
          warehouse_id: string
        }
        Update: {
          adjustment_date?: string
          adjustment_number?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          posted_at?: string | null
          posted_by?: string | null
          reason?: string
          status?: string
          total_difference_qty?: number | null
          total_difference_value?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "vw_document_gl_links"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_adjustments_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_integration_log: {
        Row: {
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          product_id: string | null
          quantity_after: number | null
          quantity_before: number | null
          quantity_change: number
          reference_id: string
          reference_type: string
          status: string | null
          transaction_type: string
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          product_id?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          quantity_change: number
          reference_id: string
          reference_type: string
          status?: string | null
          transaction_type: string
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          product_id?: string | null
          quantity_after?: number | null
          quantity_before?: number | null
          quantity_change?: number
          reference_id?: string
          reference_type?: string
          status?: string | null
          transaction_type?: string
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_integration_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_integration_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_integration_log_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_integration_log_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_ledger: {
        Row: {
          balance_after: number | null
          batch_id: string | null
          batch_number: string | null
          cogs_amount: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          expiry_date: string | null
          id: string
          item_id: string | null
          note: string | null
          notes: string | null
          product_id: string | null
          qty_in: number | null
          qty_out: number | null
          quantity_change: number | null
          ref_id: string | null
          ref_type: string | null
          reference_id: string | null
          reference_type: string | null
          timestamp: string | null
          transaction_type: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          balance_after?: number | null
          batch_id?: string | null
          batch_number?: string | null
          cogs_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          notes?: string | null
          product_id?: string | null
          qty_in?: number | null
          qty_out?: number | null
          quantity_change?: number | null
          ref_id?: string | null
          ref_type?: string | null
          reference_id?: string | null
          reference_type?: string | null
          timestamp?: string | null
          transaction_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          balance_after?: number | null
          batch_id?: string | null
          batch_number?: string | null
          cogs_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          expiry_date?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          notes?: string | null
          product_id?: string | null
          qty_in?: number | null
          qty_out?: number | null
          quantity_change?: number | null
          ref_id?: string | null
          ref_type?: string | null
          reference_id?: string | null
          reference_type?: string | null
          timestamp?: string | null
          transaction_type?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_stock_ledger_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_stock_ledger_product"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_ledger_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "warehouse_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_ledger_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payment_allocations: {
        Row: {
          allocated_amount_bc: number
          allocated_amount_fc: number
          created_at: string | null
          id: string
          invoice_id: string
          payment_id: string
        }
        Insert: {
          allocated_amount_bc?: number
          allocated_amount_fc?: number
          created_at?: string | null
          id?: string
          invoice_id: string
          payment_id: string
        }
        Update: {
          allocated_amount_bc?: number
          allocated_amount_fc?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "purchase_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payment_allocations_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "supplier_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount_bc: number
          amount_fc: number
          bank_account_id: string | null
          cash_box_id: string | null
          created_at: string | null
          created_by: string | null
          currency_code: string | null
          exchange_rate: number | null
          id: string
          journal_entry_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string | null
          payment_number: string
          posted_at: string | null
          posted_by: string | null
          reference_number: string | null
          status: string | null
          supplier_id: string
        }
        Insert: {
          amount_bc?: number
          amount_fc?: number
          bank_account_id?: string | null
          cash_box_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number: string
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_id: string
        }
        Update: {
          amount_bc?: number
          amount_fc?: number
          bank_account_id?: string | null
          cash_box_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency_code?: string | null
          exchange_rate?: number | null
          id?: string
          journal_entry_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          payment_number?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_number?: string | null
          status?: string | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_cash_box_id_fkey"
            columns: ["cash_box_id"]
            isOneToOne: false
            referencedRelation: "cash_boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "gl_journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "vw_document_gl_links"
            referencedColumns: ["journal_entry_id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "safe_suppliers_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number | null
          code: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
          currency_code: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          notes: string | null
          payment_terms: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          credit_limit?: number | null
          currency_code?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_events: {
        Row: {
          error_message: string | null
          event_data: Json
          event_source: string
          event_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          triggered_at: string | null
          triggered_by: string | null
        }
        Insert: {
          error_message?: string | null
          event_data: Json
          event_source: string
          event_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          triggered_at?: string | null
          triggered_by?: string | null
        }
        Update: {
          error_message?: string | null
          event_data?: Json
          event_source?: string
          event_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          triggered_at?: string | null
          triggered_by?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tax_periods: {
        Row: {
          adjustments: number | null
          amount_due: number | null
          created_at: string | null
          end_date: string
          id: string
          input_vat: number | null
          net_vat: number | null
          notes: string | null
          output_vat: number | null
          period_number: string
          period_type: string
          start_date: string
          status: string
          submitted_at: string | null
          submitted_by: string | null
          total_purchases: number | null
          total_sales: number | null
          updated_at: string | null
        }
        Insert: {
          adjustments?: number | null
          amount_due?: number | null
          created_at?: string | null
          end_date: string
          id?: string
          input_vat?: number | null
          net_vat?: number | null
          notes?: string | null
          output_vat?: number | null
          period_number: string
          period_type: string
          start_date: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_purchases?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Update: {
          adjustments?: number | null
          amount_due?: number | null
          created_at?: string | null
          end_date?: string
          id?: string
          input_vat?: number | null
          net_vat?: number | null
          notes?: string | null
          output_vat?: number | null
          period_number?: string
          period_type?: string
          start_date?: string
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          total_purchases?: number | null
          total_sales?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      taxes: {
        Row: {
          created_at: string | null
          end_date: string | null
          is_active: boolean | null
          is_inclusive: boolean | null
          name: string
          name_en: string | null
          rate: number
          start_date: string | null
          tax_code: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          is_active?: boolean | null
          is_inclusive?: boolean | null
          name: string
          name_en?: string | null
          rate: number
          start_date?: string | null
          tax_code: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          is_active?: boolean | null
          is_inclusive?: boolean | null
          name?: string
          name_en?: string | null
          rate?: number
          start_date?: string | null
          tax_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      therapeutic_classes: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          name_en: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          name_en?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          name_en?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      uom_templates: {
        Row: {
          abbreviation: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          uom_type: string | null
          updated_at: string | null
        }
        Insert: {
          abbreviation: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          uom_type?: string | null
          updated_at?: string | null
        }
        Update: {
          abbreviation?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          uom_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      uoms: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          symbol: string | null
          uom_type: Database["public"]["Enums"]["uom_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          symbol?: string | null
          uom_type: Database["public"]["Enums"]["uom_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          symbol?: string | null
          uom_type?: Database["public"]["Enums"]["uom_type"]
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          action_type: string
          created_at: string | null
          id: string
          ip_address: unknown
          module: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          severity: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          module?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          severity?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown
          module?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          severity?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_custom_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_custom_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vaccinations: {
        Row: {
          administered_by: string | null
          adverse_reactions: string | null
          batch_number: string | null
          created_at: string | null
          customer_id: string
          dose_number: number | null
          id: string
          next_dose_date: string | null
          notes: string | null
          site_of_injection: string | null
          updated_at: string | null
          vaccination_date: string
          vaccine_name: string
          vaccine_type: string | null
        }
        Insert: {
          administered_by?: string | null
          adverse_reactions?: string | null
          batch_number?: string | null
          created_at?: string | null
          customer_id: string
          dose_number?: number | null
          id?: string
          next_dose_date?: string | null
          notes?: string | null
          site_of_injection?: string | null
          updated_at?: string | null
          vaccination_date: string
          vaccine_name: string
          vaccine_type?: string | null
        }
        Update: {
          administered_by?: string | null
          adverse_reactions?: string | null
          batch_number?: string | null
          created_at?: string | null
          customer_id?: string
          dose_number?: number | null
          id?: string
          next_dose_date?: string | null
          notes?: string | null
          site_of_injection?: string | null
          updated_at?: string | null
          vaccination_date?: string
          vaccine_name?: string
          vaccine_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vaccinations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vaccinations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "safe_customers_summary"
            referencedColumns: ["id"]
          },
        ]
      }
      vat_returns: {
        Row: {
          amount_due: number | null
          approved_at: string | null
          corrections: number | null
          created_at: string | null
          exempt_purchases: number | null
          exempt_sales: number | null
          filing_date: string
          id: string
          input_vat: number | null
          net_vat: number | null
          notes: string | null
          output_vat: number | null
          return_number: string
          standard_rated_purchases: number | null
          standard_rated_sales: number | null
          status: string
          submission_reference: string | null
          submitted_at: string | null
          submitted_by: string | null
          tax_period_id: string
          total_purchases: number | null
          total_sales: number | null
          updated_at: string | null
          zero_rated_purchases: number | null
          zero_rated_sales: number | null
        }
        Insert: {
          amount_due?: number | null
          approved_at?: string | null
          corrections?: number | null
          created_at?: string | null
          exempt_purchases?: number | null
          exempt_sales?: number | null
          filing_date: string
          id?: string
          input_vat?: number | null
          net_vat?: number | null
          notes?: string | null
          output_vat?: number | null
          return_number: string
          standard_rated_purchases?: number | null
          standard_rated_sales?: number | null
          status?: string
          submission_reference?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period_id: string
          total_purchases?: number | null
          total_sales?: number | null
          updated_at?: string | null
          zero_rated_purchases?: number | null
          zero_rated_sales?: number | null
        }
        Update: {
          amount_due?: number | null
          approved_at?: string | null
          corrections?: number | null
          created_at?: string | null
          exempt_purchases?: number | null
          exempt_sales?: number | null
          filing_date?: string
          id?: string
          input_vat?: number | null
          net_vat?: number | null
          notes?: string | null
          output_vat?: number | null
          return_number?: string
          standard_rated_purchases?: number | null
          standard_rated_sales?: number | null
          status?: string
          submission_reference?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
          tax_period_id?: string
          total_purchases?: number | null
          total_sales?: number | null
          updated_at?: string | null
          zero_rated_purchases?: number | null
          zero_rated_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vat_returns_tax_period_id_fkey"
            columns: ["tax_period_id"]
            isOneToOne: false
            referencedRelation: "tax_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_batches: {
        Row: {
          created_at: string | null
          expiry_date: string
          id: string
          item_id: string | null
          lot_no: string
          qty_on_hand: number | null
          qty_reserved: number | null
          status: string | null
          unit_cost: number | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date: string
          id?: string
          item_id?: string | null
          lot_no: string
          qty_on_hand?: number | null
          qty_reserved?: number | null
          status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string
          id?: string
          item_id?: string | null
          lot_no?: string
          qty_on_hand?: number | null
          qty_reserved?: number | null
          status?: string | null
          unit_cost?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_batches_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "warehouse_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "warehouse_batches_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_bins: {
        Row: {
          code: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          warehouse_id: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          warehouse_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_bins_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "warehouse_bins_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_stock: {
        Row: {
          item_id: string
          last_updated: string | null
          qty_inbound: number | null
          qty_on_hand: number | null
          qty_outbound: number | null
          qty_reserved: number | null
          uom_id: string | null
          warehouse_id: string
        }
        Insert: {
          item_id: string
          last_updated?: string | null
          qty_inbound?: number | null
          qty_on_hand?: number | null
          qty_outbound?: number | null
          qty_reserved?: number | null
          uom_id?: string | null
          warehouse_id: string
        }
        Update: {
          item_id?: string
          last_updated?: string | null
          qty_inbound?: number | null
          qty_on_hand?: number | null
          qty_outbound?: number | null
          qty_reserved?: number | null
          uom_id?: string | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "warehouse_stock_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "warehouse_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          capacity: number | null
          city: string | null
          code: string
          country: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          manager_name: string | null
          name: string
          name_en: string | null
          notes: string | null
          parent_warehouse_id: string | null
          phone: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          code: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          manager_name?: string | null
          name: string
          name_en?: string | null
          notes?: string | null
          parent_warehouse_id?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city?: string | null
          code?: string
          country?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          manager_name?: string | null
          name?: string
          name_en?: string | null
          notes?: string | null
          parent_warehouse_id?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_parent_warehouse_id_fkey"
            columns: ["parent_warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "warehouses_parent_warehouse_id_fkey"
            columns: ["parent_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_summary_view: {
        Row: {
          category_id: string | null
          cost_price: number | null
          id: string | null
          name: string | null
          price: number | null
          total_cost_value: number | null
          total_reserved: number | null
          total_retail_value: number | null
          total_stock: number | null
        }
        Relationships: []
      }
      posted_documents_audit: {
        Row: {
          document_date: string | null
          document_number: string | null
          document_type: string | null
          id: string | null
          party_id: string | null
          posted_at: string | null
          posted_by: string | null
          status: string | null
          total_amount: number | null
          warehouse_id: string | null
        }
        Relationships: []
      }
      public_company_info: {
        Row: {
          company_logo_url: string | null
          company_name: string | null
          company_name_en: string | null
          theme_color: string | null
        }
        Relationships: []
      }
      returns_inventory_impact: {
        Row: {
          item_condition: string | null
          item_id: string | null
          product_name: string | null
          return_date: string | null
          return_id: string | null
          return_number: string | null
          returned_quantity: number | null
          status: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_return_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "sales_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["warehouse_id"]
          },
          {
            foreignKeyName: "sales_returns_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      returns_processing_monitor: {
        Row: {
          created_at: string | null
          created_by_name: string | null
          customer_name: string | null
          id: string | null
          items_count: number | null
          original_invoice: string | null
          posted_at: string | null
          refund_amount: number | null
          return_date: string | null
          return_number: string | null
          status: string | null
          total_amount: number | null
          warehouse_name: string | null
        }
        Relationships: []
      }
      returns_statistics: {
        Row: {
          avg_return_amount: number | null
          customers_with_returns: number | null
          draft_returns: number | null
          posted_returns: number | null
          total_items_returned: number | null
          total_refunded_amount: number | null
          total_returns: number | null
        }
        Relationships: []
      }
      safe_customers_summary: {
        Row: {
          balance: number | null
          credit_limit: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
        }
        Insert: {
          balance?: number | null
          credit_limit?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Update: {
          balance?: number | null
          credit_limit?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      safe_employee_details: {
        Row: {
          department: string | null
          email: string | null
          full_name: string | null
          hire_date: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
          national_id: string | null
          phone: string | null
          salary: number | null
          user_id: string | null
        }
        Insert: {
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          national_id?: never
          phone?: string | null
          salary?: never
          user_id?: string | null
        }
        Update: {
          department?: string | null
          email?: string | null
          full_name?: string | null
          hire_date?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
          national_id?: never
          phone?: string | null
          salary?: never
          user_id?: string | null
        }
        Relationships: []
      }
      safe_employees_summary: {
        Row: {
          department: string | null
          full_name: string | null
          id: string | null
          is_active: boolean | null
          job_title: string | null
        }
        Insert: {
          department?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
        }
        Update: {
          department?: string | null
          full_name?: string | null
          id?: string | null
          is_active?: boolean | null
          job_title?: string | null
        }
        Relationships: []
      }
      safe_suppliers_summary: {
        Row: {
          code: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Update: {
          code?: string | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
        }
        Relationships: []
      }
      sales_by_currency: {
        Row: {
          avg_exchange_rate: number | null
          currency_code: string | null
          currency_name: string | null
          currency_symbol: string | null
          first_invoice_date: string | null
          invoice_count: number | null
          last_invoice_date: string | null
          total_in_base_currency: number | null
          total_in_currency: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      sales_summary_view: {
        Row: {
          customer_id: string | null
          invoice_count: number | null
          sale_date: string | null
          total_discount: number | null
          total_sales: number | null
          total_subtotal: number | null
          total_tax: number | null
        }
        Relationships: []
      }
      stock_alerts: {
        Row: {
          alert_level: string | null
          current_quantity: number | null
          min_qty: number | null
          product_id: string | null
          product_name: string | null
          reorder_point: number | null
          reorder_qty: number | null
          sku: string | null
          warehouse_id: string | null
          warehouse_name: string | null
        }
        Relationships: []
      }
      vw_current_exchange_rates: {
        Row: {
          effective_date: string | null
          from_currency: string | null
          id: string | null
          rate: number | null
          to_currency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      vw_document_gl_links: {
        Row: {
          document_amount: number | null
          document_id: string | null
          document_number: string | null
          document_type: string | null
          entry_date: string | null
          error_message: string | null
          id: string | null
          is_posted: boolean | null
          is_reversed: boolean | null
          journal_description: string | null
          journal_entry_id: string | null
          journal_entry_number: string | null
          link_status: string | null
          linked_at: string | null
          posting_date: string | null
          source_module: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      vw_latest_exchange_rates: {
        Row: {
          created_at: string | null
          effective_date: string | null
          from_currency: string | null
          id: string | null
          rate: number | null
          to_currency: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_from_currency_fkey"
            columns: ["from_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "exchange_rates_to_currency_fkey"
            columns: ["to_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
    }
    Functions: {
      add_cost_layer: {
        Args: {
          p_batch_number?: string
          p_expiry_date?: string
          p_product_id: string
          p_quantity: number
          p_source_id?: string
          p_source_number?: string
          p_source_type?: string
          p_unit_cost: number
          p_warehouse_id: string
        }
        Returns: string
      }
      allocate_fifo_cost: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_warehouse_id: string
        }
        Returns: {
          batch_number: string
          layer_id: string
          quantity_allocated: number
          total_cost: number
          unit_cost: number
        }[]
      }
      analyze_inventory_turnover: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          average_inventory: number
          beginning_inventory: number
          category: string
          cogs: number
          days_to_sell: number
          ending_inventory: number
          product_id: string
          product_name: string
          purchases: number
          sales: number
          stock_status: string
          turnover_ratio: number
        }[]
      }
      analyze_product_profitability: {
        Args: {
          p_end_date?: string
          p_product_category?: string
          p_start_date?: string
        }
        Returns: {
          avg_selling_price: number
          category: string
          gross_profit: number
          inventory_turnover: number
          product_id: string
          product_name: string
          profit_margin: number
          total_cost: number
          total_quantity_sold: number
          total_revenue: number
        }[]
      }
      analyze_revenue_by_category: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          category_name: string
          gross_profit: number
          invoice_count: number
          profit_margin: number
          quantity_sold: number
          revenue_percentage: number
          total_cost: number
          total_revenue: number
        }[]
      }
      analyze_stock_movement: {
        Args: {
          p_end_date?: string
          p_product_id?: string
          p_start_date?: string
          p_warehouse_id?: string
        }
        Returns: {
          avg_transaction_value: number
          net_movement: number
          product_id: string
          product_name: string
          total_in: number
          total_out: number
          transaction_count: number
          warehouse_name: string
        }[]
      }
      calculate_financial_ratios: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      calculate_fx_gain_loss: {
        Args: {
          p_original_amount_fc: number
          p_original_rate: number
          p_settlement_amount_fc: number
          p_settlement_rate: number
        }
        Returns: number
      }
      calculate_po_item_amounts: {
        Args: {
          p_discount_pct?: number
          p_exchange_rate?: number
          p_price: number
          p_qty: number
          p_tax_rate?: number
        }
        Returns: {
          line_total: number
          net_amount: number
          net_amount_bc: number
          net_amount_fc: number
          tax_amount: number
        }[]
      }
      check_credit_limit: {
        Args: { p_amount: number; p_customer_id: string }
        Returns: Json
      }
      check_duplicate_supplier_invoice: {
        Args: {
          p_exclude_id?: string
          p_supplier_id: string
          p_supplier_invoice_no: string
        }
        Returns: boolean
      }
      check_reorder_levels: {
        Args: never
        Returns: {
          current_qty: number
          max_quantity: number
          product_id: string
          product_name: string
          reorder_level: number
          shortage: number
          warehouse_id: string
          warehouse_name: string
        }[]
      }
      close_accounting_period: { Args: { p_period_id: string }; Returns: Json }
      consume_fifo_layers: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_warehouse_id: string
        }
        Returns: number
      }
      consume_fifo_layers_enhanced: {
        Args: {
          p_product_id: string
          p_quantity: number
          p_reference_id: string
          p_reference_type: string
          p_warehouse_id: string
        }
        Returns: {
          layers_consumed: Json
          total_cost: number
        }[]
      }
      convert_currency: {
        Args: {
          p_amount: number
          p_date?: string
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      convert_to_base_currency: {
        Args: { p_amount: number; p_date?: string; p_from_currency: string }
        Returns: number
      }
      copy_role_permissions: {
        Args: {
          _copied_by: string
          _source_role_id: string
          _target_role_id: string
        }
        Returns: number
      }
      create_employee_with_role: {
        Args: {
          p_department?: string
          p_email: string
          p_full_name: string
          p_full_name_en?: string
          p_job_title?: string
          p_national_id?: string
          p_notes?: string
          p_password: string
          p_phone?: string
          p_role?: Database["public"]["Enums"]["app_role"]
          p_salary?: number
        }
        Returns: Json
      }
      create_sales_return: {
        Args: {
          p_items: Json
          p_notes?: string
          p_reason: string
          p_refund_method: string
          p_return_type: string
          p_sales_invoice_id: string
        }
        Returns: string
      }
      decrypt_data: {
        Args: { encrypted: string; key?: string }
        Returns: string
      }
      encrypt_data: { Args: { data: string; key?: string }; Returns: string }
      execute_cash_box_exchange: {
        Args: {
          p_exchange_date?: string
          p_from_amount: number
          p_from_cash_box_id: string
          p_notes?: string
          p_to_cash_box_id: string
        }
        Returns: Json
      }
      generate_adjustment_number: { Args: never; Returns: string }
      generate_campaign_number: { Args: never; Returns: string }
      generate_complaint_number: { Args: never; Returns: string }
      generate_doctor_code: { Args: never; Returns: string }
      generate_employee_code: { Args: never; Returns: string }
      generate_exchange_number: { Args: never; Returns: string }
      generate_journal_entry_number: { Args: never; Returns: string }
      generate_payment_number: { Args: never; Returns: string }
      generate_pos_session_number: { Args: never; Returns: string }
      generate_prescription_number: { Args: never; Returns: string }
      generate_purchase_return_number: { Args: never; Returns: string }
      generate_receipt_number: { Args: never; Returns: string }
      generate_sales_return_number: { Args: never; Returns: string }
      generate_si_number: { Args: never; Returns: string }
      generate_supplier_code: { Args: never; Returns: string }
      generate_supplier_payment_number: { Args: never; Returns: string }
      generate_transfer_number: { Args: never; Returns: string }
      generate_vat_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_account_mapping: {
        Args: { p_branch_id?: string; p_module: string; p_operation: string }
        Returns: {
          credit_account_id: string
          debit_account_id: string
          notes: string
        }[]
      }
      get_balance_sheet: { Args: { p_as_of_date?: string }; Returns: Json }
      get_base_currency: { Args: never; Returns: string }
      get_comprehensive_income_statement: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_currency_summary: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: {
          currency_code: string
          currency_name: string
          exchange_gain_loss: number
          net_position: number
          total_purchases: number
          total_sales: number
        }[]
      }
      get_customer_aging: {
        Args: { p_as_of_date?: string }
        Returns: {
          bucket_1_30: number
          bucket_31_60: number
          bucket_61_90: number
          bucket_91_120: number
          bucket_over_120: number
          current_amount: number
          customer_id: string
          customer_name: string
          total_outstanding: number
        }[]
      }
      get_customer_for_transaction: {
        Args: { p_customer_id: string }
        Returns: {
          balance: number
          credit_limit: number
          id: string
          is_active: boolean
          name: string
          phone: string
        }[]
      }
      get_customer_limited: {
        Args: { p_customer_id: string }
        Returns: {
          balance: number
          credit_limit: number
          currency_code: string
          id: string
          is_active: boolean
          name: string
          phone: string
        }[]
      }
      get_customer_safe_view: {
        Args: never
        Returns: {
          address: string
          balance: number
          created_at: string
          credit_limit: number
          currency_code: string
          email: string
          id: string
          is_active: boolean
          last_transaction_date: string
          loyalty_points: number
          name: string
          payment_terms: string
          phone: string
          price_list_id: string
          segment: string
          tax_number: string
          updated_at: string
          user_id: string
        }[]
      }
      get_default_tax_rate: { Args: never; Returns: number }
      get_exchange_rate: {
        Args: {
          p_date?: string
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      get_executive_dashboard_stats: { Args: never; Returns: Json }
      get_integration_statistics: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_inventory_valuation: {
        Args: { p_warehouse_id?: string }
        Returns: {
          average_cost: number
          layer_count: number
          product_id: string
          product_name: string
          total_quantity: number
          total_value: number
          warehouse_id: string
          warehouse_name: string
        }[]
      }
      get_latest_exchange_rate: {
        Args: {
          p_date?: string
          p_from_currency: string
          p_to_currency: string
        }
        Returns: number
      }
      get_open_accounting_period: {
        Args: { p_date: string }
        Returns: {
          closed_at: string | null
          closed_by: string | null
          created_at: string | null
          created_by: string | null
          end_date: string
          fiscal_year: number
          id: string
          is_closed: boolean
          notes: string | null
          period_name: string
          start_date: string
        }
        SetofOptions: {
          from: "*"
          to: "accounting_periods"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_operational_performance: {
        Args: { p_end_date?: string; p_start_date?: string }
        Returns: Json
      }
      get_period_statistics: { Args: { p_period_id: string }; Returns: Json }
      get_returnable_invoice_items: {
        Args: { p_invoice_id: string }
        Returns: {
          discount_percentage: number
          item_id: string
          line_total: number
          product_id: string
          product_name: string
          quantity: number
          returnable_qty: number
          returned_qty: number
          tax_percentage: number
          unit_price: number
        }[]
      }
      get_returnable_purchase_invoices: {
        Args: {
          p_days_limit?: number
          p_search?: string
          p_supplier_id?: string
        }
        Returns: {
          days_since_invoice: number
          has_returns: boolean
          invoice_date: string
          invoice_id: string
          invoice_number: string
          supplier_id: string
          supplier_name: string
          total_amount: number
        }[]
      }
      get_returnable_sales_invoices: {
        Args: { p_search?: string }
        Returns: {
          customer_name: string
          has_returns: boolean
          invoice_date: string
          invoice_id: string
          invoice_number: string
          total_amount: number
        }[]
      }
      get_role_permissions_count: {
        Args: { _category?: string; _role_id: string }
        Returns: {
          active_count: number
          total_count: number
        }[]
      }
      get_supplier_aging: {
        Args: { p_as_of_date?: string }
        Returns: {
          bucket_1_30: number
          bucket_31_60: number
          bucket_61_90: number
          bucket_91_120: number
          bucket_over_120: number
          current_amount: number
          supplier_id: string
          supplier_name: string
          total_outstanding: number
        }[]
      }
      get_supplier_for_order: {
        Args: { p_supplier_id: string }
        Returns: {
          code: string
          currency_code: string
          id: string
          is_active: boolean
          name: string
          phone: string
        }[]
      }
      get_user_comprehensive_permissions: {
        Args: { p_user_id: string }
        Returns: Json
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: { permission_key: string; user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_document_posted: { Args: { doc_status: string }; Returns: boolean }
      log_system_event: {
        Args: {
          p_event_data: Json
          p_event_source: string
          p_event_type: string
          p_triggered_by?: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_ip_address?: string
          p_module?: string
          p_resource_id?: string
          p_resource_type: string
          p_user_agent?: string
          p_user_id: string
        }
        Returns: string
      }
      post_cash_payment: { Args: { p_payment_id: string }; Returns: Json }
      post_cash_receipt: { Args: { p_receipt_id: string }; Returns: Json }
      post_customer_payment: { Args: { p_payment_id: string }; Returns: Json }
      post_customer_receipt: { Args: { p_payment_id: string }; Returns: Json }
      post_goods_receipt: { Args: { p_grn_id: string }; Returns: Json }
      post_inventory_adjustment: {
        Args: { p_adjustment_id: string }
        Returns: Json
      }
      post_pos_session: {
        Args: { p_closing_cash?: number; p_session_id: string }
        Returns: Json
      }
      post_purchase_invoice: { Args: { p_invoice_id: string }; Returns: Json }
      post_purchase_return: { Args: { p_return_id: string }; Returns: Json }
      post_sales_invoice: { Args: { p_invoice_id: string }; Returns: Json }
      post_sales_return: { Args: { p_return_id: string }; Returns: Json }
      post_stock_adjustment: {
        Args: { p_adjustment_id: string }
        Returns: Json
      }
      post_supplier_payment: { Args: { p_payment_id: string }; Returns: Json }
      process_system_events: {
        Args: never
        Returns: {
          event_id: string
          event_type: string
          processed: boolean
          result: string
        }[]
      }
      rebuild_customer_balance: {
        Args: { p_customer_id: string }
        Returns: number
      }
      rebuild_supplier_balance: {
        Args: { p_supplier_id: string }
        Returns: number
      }
      reconcile_ap_with_gl: {
        Args: { p_as_of_date?: string }
        Returns: {
          difference: number
          gl_balance: number
          status: string
          subledger_balance: number
          supplier_id: string
          supplier_name: string
        }[]
      }
      reconcile_ar_with_gl: {
        Args: { p_as_of_date?: string }
        Returns: {
          customer_id: string
          customer_name: string
          difference: number
          gl_balance: number
          status: string
          subledger_balance: number
        }[]
      }
      refresh_inventory_summary: { Args: never; Returns: undefined }
      refresh_sales_summary: { Args: never; Returns: undefined }
      reopen_accounting_period: { Args: { p_period_id: string }; Returns: Json }
      search_customers_for_pos: {
        Args: { p_limit?: number; p_search: string }
        Returns: {
          balance: number
          credit_limit: number
          id: string
          name: string
          phone: string
        }[]
      }
      search_suppliers_limited: {
        Args: { p_limit?: number; p_search: string }
        Returns: {
          code: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      user_has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      validate_admin_action: { Args: never; Returns: boolean }
      validate_po_status_transition: {
        Args: { p_current_status: string; p_new_status: string }
        Returns: boolean
      }
      validate_posting_period: { Args: { p_date: string }; Returns: boolean }
      validate_posting_period_strict: {
        Args: { p_date: string }
        Returns: string
      }
      validate_role_action: {
        Args: { required_roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "pharmacist" | "cashier" | "inventory_manager"
      product_form:
        | "tablet"
        | "capsule"
        | "syrup"
        | "injection"
        | "cream"
        | "ointment"
        | "drops"
        | "inhaler"
        | "suppository"
        | "powder"
        | "solution"
        | "suspension"
        | "other"
      product_status: "active" | "inactive" | "discontinued" | "pending"
      uom_type:
        | "piece"
        | "box"
        | "strip"
        | "bottle"
        | "vial"
        | "tube"
        | "sachet"
        | "ampoule"
        | "carton"
        | "pack"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "pharmacist", "cashier", "inventory_manager"],
      product_form: [
        "tablet",
        "capsule",
        "syrup",
        "injection",
        "cream",
        "ointment",
        "drops",
        "inhaler",
        "suppository",
        "powder",
        "solution",
        "suspension",
        "other",
      ],
      product_status: ["active", "inactive", "discontinued", "pending"],
      uom_type: [
        "piece",
        "box",
        "strip",
        "bottle",
        "vial",
        "tube",
        "sachet",
        "ampoule",
        "carton",
        "pack",
      ],
    },
  },
} as const
