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
            foreignKeyName: "customer_complaints_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
            foreignKeyName: "customer_follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
            foreignKeyName: "customer_interactions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
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
          line_total: number
          product_id: string
          quantity: number
          tax_amount: number | null
          tax_percentage: number | null
          unit_price: number
        }
        Insert: {
          batch_number?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expiry_date?: string | null
          id?: string
          invoice_id: string
          line_total: number
          product_id: string
          quantity: number
          tax_amount?: number | null
          tax_percentage?: number | null
          unit_price: number
        }
        Update: {
          batch_number?: string | null
          created_at?: string | null
          discount_amount?: number | null
          discount_percentage?: number | null
          expiry_date?: string | null
          id?: string
          invoice_id?: string
          line_total?: number
          product_id?: string
          quantity?: number
          tax_amount?: number | null
          tax_percentage?: number | null
          unit_price?: number
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
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "stock_alerts"
            referencedColumns: ["product_id"]
          },
        ]
      }
      sales_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          discount_amount: number
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          paid_amount: number
          payment_status: string
          status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          paid_amount?: number
          payment_status?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          discount_amount?: number
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          paid_amount?: number
          payment_status?: string
          status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
      suppliers: {
        Row: {
          address: string | null
          balance: number | null
          code: string | null
          contact_person: string | null
          created_at: string | null
          credit_limit: number | null
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
    }
    Functions: {
      copy_role_permissions: {
        Args: {
          _copied_by: string
          _source_role_id: string
          _target_role_id: string
        }
        Returns: number
      }
      generate_campaign_number: { Args: never; Returns: string }
      generate_complaint_number: { Args: never; Returns: string }
      generate_doctor_code: { Args: never; Returns: string }
      generate_employee_code: { Args: never; Returns: string }
      generate_prescription_number: { Args: never; Returns: string }
      generate_supplier_code: { Args: never; Returns: string }
      get_role_permissions_count: {
        Args: { _category?: string; _role_id: string }
        Returns: {
          active_count: number
          total_count: number
        }[]
      }
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
      is_document_posted: { Args: { doc_status: string }; Returns: boolean }
      user_has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      validate_admin_action: { Args: never; Returns: boolean }
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
