import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateEmployeeRequest {
  action: 'create' | 'update' | 'delete'
  employee_data?: {
    email: string
    password: string
    full_name: string
    full_name_en?: string
    phone?: string
    national_id?: string
    job_title?: string
    department?: string
    salary?: number
    role?: 'admin' | 'pharmacist' | 'cashier' | 'inventory_manager'
    notes?: string
  }
  employee_id?: string
  update_data?: {
    full_name?: string
    full_name_en?: string
    phone?: string
    national_id?: string
    job_title?: string
    department?: string
    salary?: number
    notes?: string
    is_active?: boolean
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Employee Management Edge Function ===')
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('No authorization header provided')
      return new Response(
        JSON.stringify({ error: 'غير مصرح: لم يتم توفير رمز المصادقة' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client with user's JWT for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Client for validating user
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    // Client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verify the caller's identity
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('Failed to get user:', userError?.message)
      return new Response(
        JSON.stringify({ error: 'غير مصرح: فشل في التحقق من المستخدم' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Caller user ID:', user.id)

    // 2. Verify the caller is an admin (using service role to bypass RLS)
    const { data: userRoles, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)

    if (roleError) {
      console.error('Failed to fetch user roles:', roleError.message)
      return new Response(
        JSON.stringify({ error: 'خطأ في التحقق من الصلاحيات' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isAdmin = userRoles?.some(r => r.role === 'admin')
    if (!isAdmin) {
      console.error('User is not admin. Roles:', userRoles)
      return new Response(
        JSON.stringify({ error: 'غير مصرح: مطلوب صلاحيات المسؤول' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    console.log('Admin verification passed')

    // 3. Parse the request body
    const requestBody: CreateEmployeeRequest = await req.json()
    const { action } = requestBody
    console.log('Action:', action)

    // 4. Handle different actions
    if (action === 'create') {
      const { employee_data } = requestBody
      if (!employee_data) {
        return new Response(
          JSON.stringify({ error: 'بيانات الموظف مطلوبة' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate required fields
      if (!employee_data.email || !employee_data.password || !employee_data.full_name) {
        return new Response(
          JSON.stringify({ error: 'البريد الإلكتروني وكلمة المرور والاسم مطلوبين' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate password length
      if (employee_data.password.length < 8) {
        return new Response(
          JSON.stringify({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Creating new auth user for:', employee_data.email)

      // Create auth user using Admin API (bypasses email confirmation)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: employee_data.email,
        password: employee_data.password,
        email_confirm: true, // Auto-confirm email
      })

      if (authError) {
        console.error('Failed to create auth user:', authError.message)
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          return new Response(
            JSON.stringify({ error: 'البريد الإلكتروني مسجل بالفعل' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        return new Response(
          JSON.stringify({ error: `فشل في إنشاء المستخدم: ${authError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!authData.user) {
        return new Response(
          JSON.stringify({ error: 'فشل في إنشاء المستخدم' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Auth user created:', authData.user.id)

      // Generate employee code
      const { data: codeData, error: codeError } = await supabaseAdmin.rpc('generate_employee_code')
      if (codeError) {
        console.error('Failed to generate employee code:', codeError.message)
        // Cleanup: delete the auth user we just created
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: 'فشل في توليد كود الموظف' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Employee code generated:', codeData)

      // Create employee record
      const { data: employeeData, error: employeeError } = await supabaseAdmin
        .from('employees')
        .insert({
          user_id: authData.user.id,
          employee_code: codeData,
          full_name: employee_data.full_name,
          full_name_en: employee_data.full_name_en || null,
          phone: employee_data.phone || null,
          email: employee_data.email,
          national_id: employee_data.national_id || null,
          job_title: employee_data.job_title || null,
          department: employee_data.department || null,
          salary: employee_data.salary || null,
          notes: employee_data.notes || null,
          is_active: true,
          hire_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single()

      if (employeeError) {
        console.error('Failed to create employee:', employeeError.message)
        // Cleanup: delete the auth user
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: `فشل في إنشاء سجل الموظف: ${employeeError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('Employee record created:', employeeData.id)

      // Assign role if provided
      if (employee_data.role) {
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: authData.user.id,
            role: employee_data.role,
          })

        if (roleInsertError) {
          console.error('Failed to assign role:', roleInsertError.message)
          // Don't rollback - employee is created, role can be assigned later
        } else {
          console.log('Role assigned:', employee_data.role)
        }
      }

      // Log the action
      console.log(`Employee ${employee_data.full_name} created by admin ${user.id}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم إنشاء الموظف بنجاح',
          employee: employeeData,
          employee_code: codeData,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update') {
      const { employee_id, update_data } = requestBody
      if (!employee_id || !update_data) {
        return new Response(
          JSON.stringify({ error: 'معرف الموظف والبيانات المحدثة مطلوبين' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Updating employee:', employee_id)

      const { data: updatedEmployee, error: updateError } = await supabaseAdmin
        .from('employees')
        .update(update_data)
        .eq('id', employee_id)
        .select()
        .single()

      if (updateError) {
        console.error('Failed to update employee:', updateError.message)
        return new Response(
          JSON.stringify({ error: `فشل في تحديث الموظف: ${updateError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Employee ${employee_id} updated by admin ${user.id}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم تحديث الموظف بنجاح',
          employee: updatedEmployee,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      const { employee_id } = requestBody
      if (!employee_id) {
        return new Response(
          JSON.stringify({ error: 'معرف الموظف مطلوب' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Deleting employee:', employee_id)

      // Get the employee's user_id first
      const { data: employee, error: fetchError } = await supabaseAdmin
        .from('employees')
        .select('user_id, full_name')
        .eq('id', employee_id)
        .single()

      if (fetchError || !employee) {
        return new Response(
          JSON.stringify({ error: 'الموظف غير موجود' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Delete employee record
      const { error: deleteError } = await supabaseAdmin
        .from('employees')
        .delete()
        .eq('id', employee_id)

      if (deleteError) {
        console.error('Failed to delete employee:', deleteError.message)
        return new Response(
          JSON.stringify({ error: `فشل في حذف الموظف: ${deleteError.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Optionally delete the auth user as well
      if (employee.user_id) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(employee.user_id)
          console.log('Auth user deleted:', employee.user_id)
        } catch (e) {
          console.error('Failed to delete auth user (non-critical):', e)
        }
      }

      console.log(`Employee ${employee.full_name} deleted by admin ${user.id}`)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'تم حذف الموظف بنجاح',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'الإجراء غير معروف' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ غير متوقع' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
