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
      currencies: {
        Row: {
          code: string
          created_at: string | null
          is_active: boolean | null
          name: string
          name_en: string | null
          precision: number | null
          symbol: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          is_active?: boolean | null
          name: string
          name_en?: string | null
          precision?: number | null
          symbol?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          precision?: number | null
          symbol?: string | null
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          balance: number | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          id: string
          loyalty_points: number | null
          name: string
          payment_terms: string | null
          phone: string | null
          price_list_id: string | null
          segment: string | null
          tax_number: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name: string
          payment_terms?: string | null
          phone?: string | null
          price_list_id?: string | null
          segment?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          loyalty_points?: number | null
          name?: string
          payment_terms?: string | null
          phone?: string | null
          price_list_id?: string | null
          segment?: string | null
          tax_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          created_at: string | null
          created_by: string | null
          documents: Json | null
          grn_number: string
          id: string
          notes: string | null
          po_id: string | null
          posted_at: string | null
          posted_by: string | null
          received_at: string | null
          status: string | null
          supplier_id: string | null
          updated_at: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          grn_number: string
          id?: string
          notes?: string | null
          po_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          received_at?: string | null
          status?: string | null
          supplier_id?: string | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          documents?: Json | null
          grn_number?: string
          id?: string
          notes?: string | null
          po_id?: string | null
          posted_at?: string | null
          posted_by?: string | null
          received_at?: string | null
          status?: string | null
          supplier_id?: string | null
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
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
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
          lot_no: string
          notes: string | null
          po_item_id: string | null
          qty_received: number
          unit_cost: number | null
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          expiry_date: string
          grn_id?: string | null
          id?: string
          item_id?: string | null
          lot_no: string
          notes?: string | null
          po_item_id?: string | null
          qty_received: number
          unit_cost?: number | null
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          expiry_date?: string
          grn_id?: string | null
          id?: string
          item_id?: string | null
          lot_no?: string
          notes?: string | null
          po_item_id?: string | null
          qty_received?: number
          unit_cost?: number | null
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
            foreignKeyName: "item_substitutions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
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
            foreignKeyName: "item_uoms_uom_id_fkey"
            columns: ["uom_id"]
            isOneToOne: false
            referencedRelation: "uoms"
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
      pi_items: {
        Row: {
          created_at: string | null
          discount: number | null
          grn_item_id: string | null
          id: string
          item_id: string | null
          line_total: number | null
          pi_id: string | null
          price: number
          qty: number
          tax_code: string | null
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          grn_item_id?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          pi_id?: string | null
          price: number
          qty: number
          tax_code?: string | null
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          grn_item_id?: string | null
          id?: string
          item_id?: string | null
          line_total?: number | null
          pi_id?: string | null
          price?: number
          qty?: number
          tax_code?: string | null
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
          item_id: string | null
          line_no: number
          net_amount: number | null
          notes: string | null
          po_id: string | null
          price: number
          qty_ordered: number
          qty_received: number | null
          tax_code: string | null
          uom_id: string | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          expected_date?: string | null
          id?: string
          item_id?: string | null
          line_no: number
          net_amount?: number | null
          notes?: string | null
          po_id?: string | null
          price: number
          qty_ordered: number
          qty_received?: number | null
          tax_code?: string | null
          uom_id?: string | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          expected_date?: string | null
          id?: string
          item_id?: string | null
          line_no?: number
          net_amount?: number | null
          notes?: string | null
          po_id?: string | null
          price?: number
          qty_ordered?: number
          qty_received?: number | null
          tax_code?: string | null
          uom_id?: string | null
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
      pos_sessions: {
        Row: {
          cashier_id: string | null
          closed_at: string | null
          closing_cash: number | null
          created_at: string | null
          difference: number | null
          expected_cash: number | null
          id: string
          notes: string | null
          opened_at: string | null
          opening_cash: number | null
          session_number: string
          status: string | null
          terminal_id: string | null
          totals: Json | null
          warehouse_id: string | null
        }
        Insert: {
          cashier_id?: string | null
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opening_cash?: number | null
          session_number: string
          status?: string | null
          terminal_id?: string | null
          totals?: Json | null
          warehouse_id?: string | null
        }
        Update: {
          cashier_id?: string | null
          closed_at?: string | null
          closing_cash?: number | null
          created_at?: string | null
          difference?: number | null
          expected_cash?: number | null
          id?: string
          notes?: string | null
          opened_at?: string | null
          opening_cash?: number | null
          session_number?: string
          status?: string | null
          terminal_id?: string | null
          totals?: Json | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
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
        ]
      }
      products: {
        Row: {
          barcode: string | null
          base_uom_id: string | null
          category_id: string | null
          cost_price: number
          created_at: string | null
          description: string | null
          expiry_date: string | null
          form: Database["public"]["Enums"]["product_form"] | null
          generic_name: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_controlled: boolean | null
          manufacturer_id: string | null
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
          barcode?: string | null
          base_uom_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          form?: Database["public"]["Enums"]["product_form"] | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_controlled?: boolean | null
          manufacturer_id?: string | null
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
          barcode?: string | null
          base_uom_id?: string | null
          category_id?: string | null
          cost_price?: number
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          form?: Database["public"]["Enums"]["product_form"] | null
          generic_name?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_controlled?: boolean | null
          manufacturer_id?: string | null
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
          created_at: string | null
          created_by: string | null
          currency: string | null
          discount_amount: number | null
          due_date: string | null
          exchange_rate: number | null
          id: string
          invoice_date: string
          notes: string | null
          paid_amount: number | null
          payment_status: string | null
          pi_number: string
          posted_at: string | null
          posted_by: string | null
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          supplier_invoice_no: string
          tax_amount: number | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_date: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          pi_number: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_invoice_no: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          discount_amount?: number | null
          due_date?: string | null
          exchange_rate?: number | null
          id?: string
          invoice_date?: string
          notes?: string | null
          paid_amount?: number | null
          payment_status?: string | null
          pi_number?: string
          posted_at?: string | null
          posted_by?: string | null
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          supplier_invoice_no?: string
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
          exchange_rate: number | null
          expected_date: string | null
          id: string
          notes: string | null
          payment_terms: string | null
          po_number: string
          status: string | null
          subtotal: number | null
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number | null
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
          exchange_rate?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          po_number: string
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
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
          exchange_rate?: number | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          payment_terms?: string | null
          po_number?: string
          status?: string | null
          subtotal?: number | null
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number | null
          updated_at?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
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
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "sales_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
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
            foreignKeyName: "sales_orders_warehouse_id_fkey"
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
      stock_ledger: {
        Row: {
          batch_id: string | null
          cogs_amount: number | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          id: string
          item_id: string | null
          note: string | null
          qty_in: number | null
          qty_out: number | null
          ref_id: string | null
          ref_type: string | null
          timestamp: string | null
          unit_cost: number | null
          warehouse_id: string | null
        }
        Insert: {
          batch_id?: string | null
          cogs_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          qty_in?: number | null
          qty_out?: number | null
          ref_id?: string | null
          ref_type?: string | null
          timestamp?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Update: {
          batch_id?: string | null
          cogs_amount?: number | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          id?: string
          item_id?: string | null
          note?: string | null
          qty_in?: number | null
          qty_out?: number | null
          ref_id?: string | null
          ref_type?: string | null
          timestamp?: string | null
          unit_cost?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
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
            foreignKeyName: "stock_ledger_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number | null
          created_at: string | null
          credit_limit: number | null
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          balance?: number | null
          created_at?: string | null
          credit_limit?: number | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string | null
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
      uoms: {
        Row: {
          created_at: string | null
          id: string
          name: string
          name_en: string | null
          symbol: string | null
          uom_type: Database["public"]["Enums"]["uom_type"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          name_en?: string | null
          symbol?: string | null
          uom_type: Database["public"]["Enums"]["uom_type"]
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          name_en?: string | null
          symbol?: string | null
          uom_type?: Database["public"]["Enums"]["uom_type"]
        }
        Relationships: []
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
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          phone: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          phone?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
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
