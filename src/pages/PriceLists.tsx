import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, DollarSign } from "lucide-react";

const PriceLists = () => {
  const [priceLists, setPriceLists] = useState<any[]>([]);
  const [priceListItems, setPriceListItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [selectedPriceList, setSelectedPriceList] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newPriceList, setNewPriceList] = useState({
    name: "",
    name_en: "",
    description: "",
    currency: "SAR",
    is_default: false,
  });

  const [newItem, setNewItem] = useState({
    item_id: "",
    uom_id: "",
    price: 0,
    min_price: 0,
    max_price: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchData = async () => {
    await Promise.all([
      fetchPriceLists(),
      fetchProducts(),
      fetchUOMs(),
    ]);
  };

  const fetchPriceLists = async () => {
    const { data } = await supabase.from("price_lists").select("*").order("name");
    setPriceLists(data || []);
  };

  const fetchProducts = async () => {
    const { data } = await supabase.from("products").select("*").eq("is_active", true).order("name");
    setProducts(data || []);
  };

  const fetchUOMs = async () => {
    const { data } = await supabase.from("uom_templates").select("*").eq("is_active", true).order("name");
    setUoms(data || []);
  };

  const fetchPriceListItems = async (priceListId: string) => {
    const { data } = await supabase
      .from("item_prices")
      .select("*, item:item_id(name, sku), uom:uom_id(name)")
      .eq("price_list_id", priceListId)
      .order("item_id");
    setPriceListItems(data || []);
  };

  const handleCreatePriceList = async () => {
    setLoading(true);
    const { error } = await supabase.from("price_lists").insert([newPriceList]);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الإنشاء بنجاح" });
      setIsDialogOpen(false);
      setNewPriceList({ name: "", name_en: "", description: "", currency: "SAR", is_default: false });
      fetchPriceLists();
    }
    setLoading(false);
  };

  const handleAddItem = async () => {
    if (!selectedPriceList || !newItem.item_id) {
      toast({ title: "خطأ", description: "اختر القائمة والمنتج", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("item_prices").insert([{
      ...newItem,
      price_list_id: selectedPriceList,
    }]);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الإضافة بنجاح" });
      setIsItemDialogOpen(false);
      setNewItem({ item_id: "", uom_id: "", price: 0, min_price: 0, max_price: 0 });
      fetchPriceListItems(selectedPriceList);
    }
    setLoading(false);
  };

  const handleSelectPriceList = (id: string) => {
    setSelectedPriceList(id);
    fetchPriceListItems(id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Price Lists */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  قوائم الأسعار
                </span>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 ml-2" />
                      إنشاء قائمة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>قائمة سعر جديدة</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>الاسم بالعربي</Label>
                        <Input value={newPriceList.name} onChange={(e) => setNewPriceList({ ...newPriceList, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>الاسم بالإنجليزي</Label>
                        <Input value={newPriceList.name_en} onChange={(e) => setNewPriceList({ ...newPriceList, name_en: e.target.value })} />
                      </div>
                      <div>
                        <Label>الوصف</Label>
                        <Input value={newPriceList.description} onChange={(e) => setNewPriceList({ ...newPriceList, description: e.target.value })} />
                      </div>
                      <Button onClick={handleCreatePriceList} disabled={loading}>حفظ</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>العملة</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceLists.map((pl) => (
                    <TableRow
                      key={pl.id}
                      className={selectedPriceList === pl.id ? "bg-accent" : "cursor-pointer hover:bg-accent/50"}
                      onClick={() => handleSelectPriceList(pl.id)}
                    >
                      <TableCell>{pl.name}</TableCell>
                      <TableCell>{pl.currency}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Price List Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>عناصر القائمة</span>
                {selectedPriceList && (
                  <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة منتج
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>إضافة منتج لقائمة السعر</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>المنتج</Label>
                          <Select value={newItem.item_id} onValueChange={(v) => setNewItem({ ...newItem, item_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المنتج" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>وحدة القياس</Label>
                          <Select value={newItem.uom_id} onValueChange={(v) => setNewItem({ ...newItem, uom_id: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الوحدة" />
                            </SelectTrigger>
                            <SelectContent>
                              {uoms.map((u) => (
                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>السعر</Label>
                          <Input type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>الحد الأدنى</Label>
                            <Input type="number" value={newItem.min_price} onChange={(e) => setNewItem({ ...newItem, min_price: parseFloat(e.target.value) })} />
                          </div>
                          <div>
                            <Label>الحد الأقصى</Label>
                            <Input type="number" value={newItem.max_price} onChange={(e) => setNewItem({ ...newItem, max_price: parseFloat(e.target.value) })} />
                          </div>
                        </div>
                        <Button onClick={handleAddItem} disabled={loading}>حفظ</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPriceList ? (
                <p className="text-muted-foreground text-center py-8">اختر قائمة سعر لعرض العناصر</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الوحدة</TableHead>
                      <TableHead>السعر</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceListItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.item?.name}</TableCell>
                        <TableCell>{item.uom?.name || "-"}</TableCell>
                        <TableCell>{item.price}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PriceLists;
