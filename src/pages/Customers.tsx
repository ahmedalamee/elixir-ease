import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Edit, Trash, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  credit_limit: number;
  balance: number;
  loyalty_points: number;
  currency_code?: string;
  is_active: boolean;
  last_transaction_date: string | null;
  created_at: string;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("active");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    credit_limit: 0,
    currency_code: "SAR",
    is_active: true,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchCustomers();
    fetchCurrencies();
  }, [statusFilter]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchCustomers = async () => {
    const query = supabase
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    
    const { data, error } = await query;

    if (error) {
      toast({
        title: "خطأ في تحميل البيانات",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCustomers((data || []) as any);
    }
  };

  const fetchCurrencies = async () => {
    const { data, error } = await supabase
      .from("currencies")
      .select("code, name, symbol")
      .eq("is_active", true)
      .order("code");

    if (error) {
      toast({
        title: "خطأ في تحميل العملات",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCurrencies(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingCustomer) {
      const { error } = await supabase
        .from("customers")
        .update(formData)
        .eq("id", editingCustomer.id);

      if (error) {
        toast({
          title: "خطأ في التحديث",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم التحديث بنجاح",
        });
        fetchCustomers();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("customers").insert([formData]);

      if (error) {
        toast({
          title: "خطأ في الإضافة",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم الإضافة بنجاح",
        });
        fetchCustomers();
        resetForm();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("customers").delete().eq("id", id);

    if (error) {
      toast({
        title: "خطأ في الحذف",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "تم الحذف بنجاح",
      });
      fetchCustomers();
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      address: "",
      credit_limit: 0,
      currency_code: "SAR",
      is_active: true,
    });
    setEditingCustomer(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      credit_limit: customer.credit_limit,
      currency_code: customer.currency_code || "SAR",
      is_active: customer.is_active,
    });
    setIsDialogOpen(true);
  };

  const filteredCustomers = customers.filter(
    (customer) => {
      const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" ? true :
        statusFilter === "active" ? customer.is_active :
        !customer.is_active;
      
      return matchesSearch && matchesStatus;
    }
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>إدارة العملاء</CardTitle>
                <CardDescription>
                  إضافة وتعديل وحذف بيانات العملاء
                </CardDescription>
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2" onClick={() => resetForm()}>
                    <Plus className="h-4 w-4" />
                    إضافة عميل جديد
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingCustomer ? "تعديل عميل" : "إضافة عميل جديد"}
                    </DialogTitle>
                    <DialogDescription>
                      أدخل بيانات العميل بشكل صحيح
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">الاسم *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">رقم الهاتف</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">البريد الإلكتروني</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">العنوان</Label>
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="credit_limit">حد الائتمان</Label>
                      <Input
                        id="credit_limit"
                        type="number"
                        step="0.01"
                        value={formData.credit_limit}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            credit_limit: parseFloat(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency_code">العملة</Label>
                      <Select
                        value={formData.currency_code}
                        onValueChange={(value) =>
                          setFormData({ ...formData, currency_code: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر العملة" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between space-x-2">
                      <Label htmlFor="is_active" className="cursor-pointer">
                        حالة العميل
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {formData.is_active ? "نشط" : "غير نشط"}
                        </span>
                        <Switch
                          id="is_active"
                          checked={formData.is_active}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, is_active: checked })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        {editingCustomer ? "تحديث" : "إضافة"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetForm}
                      >
                        إلغاء
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="البحث بالاسم، الهاتف أو البريد الإلكتروني..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              
              <Tabs value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <TabsList>
                  <TabsTrigger value="all">الكل</TabsTrigger>
                  <TabsTrigger value="active">نشط</TabsTrigger>
                  <TabsTrigger value="inactive">غير نشط</TabsTrigger>
                </TabsList>
              </Tabs>

              <Badge variant="outline" className="flex items-center gap-2">
                {filteredCustomers.length} عميل
              </Badge>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الهاتف</TableHead>
                    <TableHead>البريد الإلكتروني</TableHead>
                    <TableHead>الرصيد</TableHead>
                    <TableHead>نقاط الولاء</TableHead>
                    <TableHead>آخر معاملة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.name}
                      </TableCell>
                      <TableCell>{customer.phone || "-"}</TableCell>
                      <TableCell className="text-sm">{customer.email || "-"}</TableCell>
                      <TableCell>
                        <span className={customer.balance > 0 ? "text-red-600 font-medium" : ""}>
                          {customer.balance.toFixed(2)} ر.س
                        </span>
                      </TableCell>
                      <TableCell>{customer.loyalty_points}</TableCell>
                      <TableCell className="text-sm">
                        {customer.last_transaction_date
                          ? new Date(customer.last_transaction_date).toLocaleDateString("ar-SA", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={customer.is_active ? "default" : "secondary"}>
                          {customer.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(customer.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Customers;
