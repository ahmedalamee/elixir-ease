import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JournalEntryLine {
  account_id: string;
  debit_amount: number;
  credit_amount: number;
  description: string;
}

// Request validation schema
const RequestSchema = z.object({
  document_type: z.enum(['sales_invoice', 'purchase_invoice', 'customer_payment', 'supplier_payment']),
  document_id: z.string().uuid('معرف المستند يجب أن يكون UUID صالح'),
  document_number: z.string().min(1, 'رقم المستند مطلوب').max(50, 'رقم المستند طويل جداً'),
  document_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'تاريخ المستند يجب أن يكون بصيغة YYYY-MM-DD'),
  amount: z.number().positive('المبلغ يجب أن يكون موجباً').max(10000000, 'المبلغ يتجاوز الحد الأقصى المسموح'),
  customer_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  payment_method: z.string().max(50).optional(),
});

type GenerateJournalEntryRequest = z.infer<typeof RequestSchema>;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'غير مصرح: مطلوب رأس التفويض' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication failed:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'غير مصرح: رمز غير صالح' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Verify user has appropriate role (admin, pharmacist, or cashier)
    const { data: userRoles, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (roleError) {
      console.error('Error checking user roles:', roleError);
      return new Response(
        JSON.stringify({ success: false, error: 'خطأ في التحقق من الصلاحيات' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const allowedRoles = ['admin', 'pharmacist', 'cashier'];
    const hasPermission = userRoles?.some(r => allowedRoles.includes(r.role));

    if (!hasPermission) {
      console.log(`User ${user.id} attempted journal entry without permission`);
      return new Response(
        JSON.stringify({ success: false, error: 'غير مصرح: صلاحيات غير كافية' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    console.log(`Authenticated user ${user.id} with role ${userRoles?.map(r => r.role).join(', ')}`);

    // Parse and validate request
    const rawData = await req.json();
    let requestData: GenerateJournalEntryRequest;
    
    try {
      requestData = RequestSchema.parse(rawData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'بيانات غير صالحة',
            details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
      throw error;
    }

    console.log('Generating journal entry for:', requestData.document_type, requestData.document_number);

    // الحصول على قواعد الترحيل
    const { data: postingRules, error: rulesError } = await supabase
      .from('posting_rules')
      .select('*')
      .eq('document_type', requestData.document_type)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching posting rules:', rulesError);
      throw new Error('خطأ في تكوين المحاسبة');
    }

    if (!postingRules || postingRules.length === 0) {
      throw new Error('خطأ في تكوين المحاسبة - اتصل بالمسؤول');
    }

    // إنشاء بنود القيد المحاسبي
    const journalLines: JournalEntryLine[] = [];
    
    switch (requestData.document_type) {
      case 'sales_invoice':
        // مدين: العملاء (المدينون)
        const receivablesRule = postingRules.find(r => r.account_type === 'receivables');
        if (receivablesRule && receivablesRule.debit_account_id) {
          journalLines.push({
            account_id: receivablesRule.debit_account_id,
            debit_amount: requestData.amount,
            credit_amount: 0,
            description: `فاتورة مبيعات رقم ${requestData.document_number}`,
          });
        }

        // دائن: المبيعات
        const revenueRule = postingRules.find(r => r.account_type === 'revenue');
        if (revenueRule && revenueRule.credit_account_id) {
          journalLines.push({
            account_id: revenueRule.credit_account_id,
            debit_amount: 0,
            credit_amount: requestData.amount,
            description: `فاتورة مبيعات رقم ${requestData.document_number}`,
          });
        }
        break;

      case 'purchase_invoice':
        // مدين: المخزون
        const inventoryRule = postingRules.find(r => r.account_type === 'inventory');
        if (inventoryRule && inventoryRule.debit_account_id) {
          journalLines.push({
            account_id: inventoryRule.debit_account_id,
            debit_amount: requestData.amount,
            credit_amount: 0,
            description: `فاتورة مشتريات رقم ${requestData.document_number}`,
          });
        }

        // دائن: الموردين (الدائنون)
        const payablesRule = postingRules.find(r => r.account_type === 'payables');
        if (payablesRule && payablesRule.credit_account_id) {
          journalLines.push({
            account_id: payablesRule.credit_account_id,
            debit_amount: 0,
            credit_amount: requestData.amount,
            description: `فاتورة مشتريات رقم ${requestData.document_number}`,
          });
        }
        break;

      case 'customer_payment':
        // مدين: الصندوق أو البنك
        const paymentMethod = requestData.payment_method || 'cash';
        const cashBankRule = postingRules.find(r => 
          paymentMethod === 'cash' ? r.account_type === 'cash' : r.account_type === 'bank'
        );
        if (cashBankRule && cashBankRule.debit_account_id) {
          journalLines.push({
            account_id: cashBankRule.debit_account_id,
            debit_amount: requestData.amount,
            credit_amount: 0,
            description: `سداد من عميل - ${requestData.document_number}`,
          });
        }

        // دائن: العملاء (المدينون)
        const customerReceivablesRule = postingRules.find(r => r.account_type === 'receivables');
        if (customerReceivablesRule && customerReceivablesRule.credit_account_id) {
          journalLines.push({
            account_id: customerReceivablesRule.credit_account_id,
            debit_amount: 0,
            credit_amount: requestData.amount,
            description: `سداد من عميل - ${requestData.document_number}`,
          });
        }
        break;

      case 'supplier_payment':
        // مدين: الموردين (الدائنون)
        const supplierPayablesRule = postingRules.find(r => r.account_type === 'payables');
        if (supplierPayablesRule && supplierPayablesRule.debit_account_id) {
          journalLines.push({
            account_id: supplierPayablesRule.debit_account_id,
            debit_amount: requestData.amount,
            credit_amount: 0,
            description: `سداد لمورد - ${requestData.document_number}`,
          });
        }

        // دائن: الصندوق أو البنك
        const supplierPaymentMethod = requestData.payment_method || 'cash';
        const supplierCashBankRule = postingRules.find(r => 
          supplierPaymentMethod === 'cash' ? r.account_type === 'cash' : r.account_type === 'bank'
        );
        if (supplierCashBankRule && supplierCashBankRule.credit_account_id) {
          journalLines.push({
            account_id: supplierCashBankRule.credit_account_id,
            debit_amount: 0,
            credit_amount: requestData.amount,
            description: `سداد لمورد - ${requestData.document_number}`,
          });
        }
        break;
    }

    if (journalLines.length === 0) {
      throw new Error('خطأ في تكوين المحاسبة - اتصل بالمسؤول');
    }

    // التحقق من توازن القيد
    const totalDebit = journalLines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = journalLines.reduce((sum, line) => sum + line.credit_amount, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      console.error('Journal entry not balanced', { totalDebit, totalCredit });
      throw new Error('خطأ في حساب المعاملة - اتصل بالمسؤول');
    }

    // إنشاء القيد المحاسبي
    const { data: journalEntry, error: entryError } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: `AUTO-${requestData.document_number}`,
        entry_date: requestData.document_date,
        reference_type: requestData.document_type,
        reference_id: requestData.document_id,
        description: `قيد تلقائي - ${requestData.document_type} - ${requestData.document_number}`,
        total_debit: totalDebit,
        total_credit: totalCredit,
        status: 'draft',
      })
      .select()
      .single();

    if (entryError) {
      console.error('Error creating journal entry:', entryError);
      throw new Error('فشل في إنشاء القيد المحاسبي');
    }

    console.log('Journal entry created:', journalEntry.id);

    // إنشاء بنود القيد
    const linesWithEntryId = journalLines.map((line, index) => ({
      entry_id: journalEntry.id,
      line_no: index + 1,
      ...line,
    }));

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(linesWithEntryId);

    if (linesError) {
      console.error('Error creating journal entry lines:', linesError);
      // حذف القيد إذا فشل إنشاء البنود
      await supabase.from('journal_entries').delete().eq('id', journalEntry.id);
      throw new Error('فشل في إنشاء بنود القيد المحاسبي');
    }

    // تسجيل الربط بين المستند والقيد
    const { error: linkError } = await supabase
      .from('document_gl_entries')
      .insert({
        document_type: requestData.document_type,
        document_id: requestData.document_id,
        document_number: requestData.document_number,
        journal_entry_id: journalEntry.id,
        document_amount: requestData.amount,
        status: 'posted',
      });

    if (linkError) {
      console.error('Error linking document to journal entry:', linkError);
    }

    console.log('Journal entry generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        journal_entry_id: journalEntry.id,
        entry_number: journalEntry.entry_number,
        total_debit: totalDebit,
        total_credit: totalCredit,
        lines_count: journalLines.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in generate-journal-entry function:', error);
    
    // Return generic error message to client, log details server-side
    let userMessage = 'فشل في إنشاء القيد المحاسبي';
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Only return safe error messages
      if (error.message.includes('بيانات غير صالحة') || 
          error.message.includes('خطأ في تكوين المحاسبة') ||
          error.message.includes('خطأ في حساب المعاملة') ||
          error.message.includes('فشل في إنشاء')) {
        userMessage = error.message;
      }
      statusCode = error.message.includes('تكوين') ? 400 : 500;
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: userMessage,
        error_id: crypto.randomUUID(), // For support tracking
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode,
      }
    );
  }
});
