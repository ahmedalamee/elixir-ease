import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Check, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Expense {
  id: string;
  expense_number: string;
  expense_date: string;
  expense_type: string;
  category: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  status: string;
  description?: string;
  suppliers?: { name: string };
  warehouses?: { name: string };
}

interface ExpenseItem {
  id?: string;
  line_no: number;
  description: string;
  quantity: number;
  unit_price: number;
  tax_percentage: number;
  tax_amount: number;
  line_total: number;
  notes?: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [selectedExpenseItems, setSelectedExpenseItems] = useState<ExpenseItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Form states
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expenseType, setExpenseType] = useState('operational');
  const [category, setCategory] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ExpenseItem[]>([]);

  useEffect(() => {
    fetchExpenses();
    fetchSuppliers();
    fetchWarehouses();
  }, []);

  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from('expenses')
      .select(`
        *,
        suppliers(name),
        warehouses(name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('خطأ في تحميل المصروفات');
      console.error(error);
    } else {
      setExpenses(data || []);
    }
  };

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name, code')
      .eq('is_active', true)
      .order('name');
    setSuppliers(data || []);
  };

  const fetchWarehouses = async () => {
    const { data } = await supabase
      .from('warehouses')
      .select('id, name')
      .eq('is_active', true)
      .order('name');
    setWarehouses(data || []);
  };

  const addNewItem = () => {
    setItems([...items, {
      line_no: items.length + 1,
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_percentage: 15,
      tax_amount: 0,
      line_total: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    const qty = updatedItems[index].quantity;
    const price = updatedItems[index].unit_price;
    const taxPct = updatedItems[index].tax_percentage;
    const subtotal = qty * price;
    const taxAmt = subtotal * (taxPct / 100);
    updatedItems[index].tax_amount = taxAmt;
    updatedItems[index].line_total = subtotal + taxAmt;
    
    setItems(updatedItems);
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleCreateExpense = async () => {
    try {
      if (!expenseType || !category || items.length === 0) {
        toast.error('يرجى إدخال جميع الحقول المطلوبة');
        return;
      }

      const { subtotal, taxAmount, total } = calculateTotals();

      const { data: lastExpense } = await supabase
        .from('expenses')
        .select('expense_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNum = 1;
      if (lastExpense?.expense_number) {
        const match = lastExpense.expense_number.match(/EXP-(\d+)/);
        if (match) nextNum = parseInt(match[1]) + 1;
      }
      const expenseNumber = `EXP-${String(nextNum).padStart(6, '0')}`;

      const { data: user } = await supabase.auth.getUser();

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          expense_number: expenseNumber,
          expense_date: expenseDate,
          expense_type: expenseType,
          category: category,
          supplier_id: supplierId || null,
          warehouse_id: warehouseId || null,
          amount: subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_method: paymentMethod || null,
          payment_status: 'unpaid',
          reference_number: referenceNumber || null,
          description: description || null,
          notes: notes || null,
          status: 'draft',
          created_by: user?.user?.id,
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const itemsData = items.map((item) => ({
        expense_id: expense.id,
        line_no: item.line_no,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        tax_percentage: item.tax_percentage,
        tax_amount: item.tax_amount,
        line_total: item.line_total,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('expense_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success('تم إنشاء المصروف بنجاح');
      setIsDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (error: any) {
      toast.error('خطأ في إنشاء المصروف: ' + error.message);
      console.error(error);
    }
  };

  const handleApproveExpense = async (expenseId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'approved',
          approved_by: user?.user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('تمت الموافقة على المصروف');
      setIsViewDialogOpen(false);
      fetchExpenses();
    } catch (error: any) {
      toast.error('خطأ في الموافقة: ' + error.message);
    }
  };

  const handleViewExpense = async (expense: Expense) => {
    setSelectedExpense(expense);
    
    const { data: items } = await supabase
      .from('expense_items')
      .select('*')
      .eq('expense_id', expense.id)
      .order('line_no');

    setSelectedExpenseItems(items || []);
    setIsViewDialogOpen(true);
  };

  const resetForm = () => {
    setExpenseDate(format(new Date(), 'yyyy-MM-dd'));
    setExpenseType('operational');
    setCategory('');
    setSupplierId('');
    setWarehouseId('');
    setPaymentMethod('');
    setReferenceNumber('');
    setDescription('');
    setNotes('');
    setItems([]);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'مسودة', variant: 'secondary' as const },
      approved: { label: 'معتمد', variant: 'default' as const },
      posted: { label: 'مرحل', variant: 'default' as const },
      cancelled: { label: 'ملغي', variant: 'destructive' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      unpaid: { label: 'غير مدفوع', variant: 'destructive' as const },
      partially_paid: { label: 'مدفوع جزئياً', variant: 'secondary' as const },
      paid: { label: 'مدفوع', variant: 'default' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.unpaid;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.expense_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         exp.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const expenseTypes = [
    { value: 'operational', label: 'تشغيلي' },
    { value: 'maintenance', label: 'صيانة' },
    { value: 'utilities', label: 'مرافق' },
    { value: 'salaries', label: 'رواتب' },
    { value: 'other', label: 'أخرى' },
  ];

  const categories = [
    { value: 'rent', label: 'إيجار' },
    { value: 'electricity', label: 'كهرباء' },
    { value: 'water', label: 'مياه' },
    { value: 'transport', label: 'نقل' },
    { value: 'office_supplies', label: 'لوازم مكتبية' },
    { value: 'marketing', label: 'تسويق' },
    { value: 'maintenance', label: 'صيانة' },
    { value: 'other', label: 'أخرى' },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Navbar />
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl">إدارة المصروفات</CardTitle>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="ml-2 h-4 w-4" />
              مصروف جديد
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-4">
              <div className="flex-1">
                <Input
                  placeholder="بحث برقم المصروف أو الوصف..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="draft">مسودة</SelectItem>
                  <SelectItem value="approved">معتمد</SelectItem>
                  <SelectItem value="posted">مرحل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم المصروف</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>المورد</TableHead>
                  <TableHead>المخزن</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>حالة الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <p className="text-lg mb-2">لا توجد مصروفات مسجلة</p>
                      <p className="text-sm">قم بإضافة مصروف جديد للبدء</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.expense_number}</TableCell>
                      <TableCell>{format(new Date(expense.expense_date), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>
                        {expenseTypes.find(t => t.value === expense.expense_type)?.label || expense.expense_type}
                      </TableCell>
                      <TableCell>
                        {categories.find(c => c.value === expense.category)?.label || expense.category}
                      </TableCell>
                      <TableCell>{expense.suppliers?.name || '-'}</TableCell>
                      <TableCell>{expense.warehouses?.name || '-'}</TableCell>
                      <TableCell className="text-right font-medium">
                        {expense.total_amount.toLocaleString()} ر.س
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(expense.payment_status)}</TableCell>
                      <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewExpense(expense)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>مصروف جديد</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>تاريخ المصروف *</Label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>نوع المصروف *</Label>
                <Select value={expenseType} onValueChange={setExpenseType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الفئة *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المورد</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المورد (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>المخزن</Label>
                <Select value={warehouseId} onValueChange={setWarehouseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر المخزن (اختياري)" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر طريقة الدفع" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">نقدي</SelectItem>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="check">شيك</SelectItem>
                    <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>الرقم المرجعي</Label>
                <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder="رقم الفاتورة أو الشيك" />
              </div>

              <div className="space-y-2 col-span-2">
                <Label>الوصف</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="وصف المصروف" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <Label>بنود المصروف *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addNewItem}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة بند
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الوصف</TableHead>
                    <TableHead>الكمية</TableHead>
                    <TableHead>السعر</TableHead>
                    <TableHead>الضريبة %</TableHead>
                    <TableHead>الإجمالي</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="الوصف"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.unit_price}
                          onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.tax_percentage}
                          onChange={(e) => updateItem(index, 'tax_percentage', parseFloat(e.target.value) || 0)}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell className="text-right">{item.line_total.toFixed(2)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {items.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span className="font-medium">{calculateTotals().subtotal.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الضريبة:</span>
                      <span className="font-medium">{calculateTotals().taxAmount.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>الإجمالي:</span>
                      <span>{calculateTotals().total.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية" />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>إلغاء</Button>
              <Button onClick={handleCreateExpense}>حفظ المصروف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>تفاصيل المصروف: {selectedExpense?.expense_number}</DialogTitle>
            </DialogHeader>

            {selectedExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">التاريخ</Label>
                    <p className="font-medium">{format(new Date(selectedExpense.expense_date), 'yyyy-MM-dd')}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">النوع</Label>
                    <p className="font-medium">
                      {expenseTypes.find(t => t.value === selectedExpense.expense_type)?.label}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الفئة</Label>
                    <p className="font-medium">
                      {categories.find(c => c.value === selectedExpense.category)?.label}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المورد</Label>
                    <p className="font-medium">{selectedExpense.suppliers?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">المخزن</Label>
                    <p className="font-medium">{selectedExpense.warehouses?.name || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">الحالة</Label>
                    <div className="mt-1">{getStatusBadge(selectedExpense.status)}</div>
                  </div>
                </div>

                {selectedExpense.description && (
                  <div>
                    <Label className="text-muted-foreground">الوصف</Label>
                    <p className="mt-1">{selectedExpense.description}</p>
                  </div>
                )}

                <div>
                  <Label>البنود</Label>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>الضريبة</TableHead>
                        <TableHead>الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedExpenseItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>{item.unit_price.toFixed(2)} ر.س</TableCell>
                          <TableCell>{item.tax_amount.toFixed(2)} ر.س</TableCell>
                          <TableCell className="text-right font-medium">{item.line_total.toFixed(2)} ر.س</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-end">
                  <div className="w-64 space-y-2 border-t pt-2">
                    <div className="flex justify-between">
                      <span>المجموع الفرعي:</span>
                      <span className="font-medium">{selectedExpense.amount.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between">
                      <span>الضريبة:</span>
                      <span className="font-medium">{selectedExpense.tax_amount.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold">
                      <span>الإجمالي:</span>
                      <span>{selectedExpense.total_amount.toFixed(2)} ر.س</span>
                    </div>
                  </div>
                </div>

                {selectedExpense.status === 'draft' && (
                  <DialogFooter>
                    <Button onClick={() => handleApproveExpense(selectedExpense.id)}>
                      <Check className="ml-2 h-4 w-4" />
                      اعتماد المصروف
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
