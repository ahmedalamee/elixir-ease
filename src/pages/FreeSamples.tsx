import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Plus, Send, Search, Trash2, ArrowRightLeft, Eye, Pencil, XCircle } from "lucide-react";
import { ExportMenu } from "@/components/ExportMenu";

interface FreeSampleItem {
  id?: string;
  product_id: string;
  qty: number;
  unit: string;
  expiry_date: string;
}

interface FreeSample {
  id: string;
  sample_number: string;
  supplier_id: string | null;
  warehouse_id: string;
  date_received: string;
  notes: string | null;
  status: string;
  created_at: string;
  supplier_name?: string;
  warehouse_name?: string;
}

const FreeSamples = () => {
  const { toast } = useToast();
  const [samples, setSamples] = useState<FreeSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedSample, setSelectedSample] = useState<FreeSample | null>(null);
  const [viewItems, setViewItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // Create/Edit form state
  const [editMode, setEditMode] = useState(false);
  const [editSampleId, setEditSampleId] = useState<string | null>(null);
  const [formSupplier, setFormSupplier] = useState("");
  const [formWarehouse, setFormWarehouse] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<FreeSampleItem[]>([
    { product_id: "", qty: 1, unit: "حبة", expiry_date: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);

  // Convert dialog
  const [showConvert, setShowConvert] = useState(false);
  const [convertItem, setConvertItem] = useState<any>(null);
  const [convertQty, setConvertQty] = useState(0);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteSample, setDeleteSample] = useState<FreeSample | null>(null);

  useEffect(() => {
    fetchSamples();
    fetchLookups();
  }, []);

  const fetchLookups = async () => {
    const [suppRes, whRes, prodRes] = await Promise.all([
      supabase.from("suppliers").select("id, name").eq("is_active", true),
      supabase.from("warehouses").select("id, name").eq("is_active", true),
      supabase.from("products").select("id, name").eq("is_active", true),
    ]);
    setSuppliers(suppRes.data || []);
    setWarehouses(whRes.data || []);
    setProducts(prodRes.data || []);
  };

  const fetchSamples = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("free_samples")
      .select("*, suppliers(name), warehouses(name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setSamples(
        data.map((s: any) => ({
          ...s,
          supplier_name: s.suppliers?.name || "—",
          warehouse_name: s.warehouses?.name || "—",
        }))
      );
    }
    setLoading(false);
  };

  const generateSampleNumber = () => {
    const now = new Date();
    return `FS-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
  };

  const handleCreate = async () => {
    if (!formWarehouse) {
      toast({ title: "خطأ", description: "يجب اختيار المستودع", variant: "destructive" });
      return;
    }
    const validItems = formItems.filter((i) => i.product_id && i.qty > 0);
    if (validItems.length === 0) {
      toast({ title: "خطأ", description: "يجب إضافة منتج واحد على الأقل بكمية", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();

      if (editMode && editSampleId) {
        // Update existing sample
        const { error: uErr } = await supabase
          .from("free_samples")
          .update({
            supplier_id: formSupplier || null,
            warehouse_id: formWarehouse,
            date_received: formDate,
            notes: formNotes || null,
          })
          .eq("id", editSampleId);
        if (uErr) throw uErr;

        // Delete old items and re-insert
        await supabase.from("free_sample_items").delete().eq("free_sample_id", editSampleId);

        const items = validItems.map((i) => ({
          free_sample_id: editSampleId,
          product_id: i.product_id,
          qty: i.qty,
          free_qty: i.qty,
          unit: i.unit || "حبة",
          expiry_date: i.expiry_date || null,
        }));
        const { error: iErr } = await supabase.from("free_sample_items").insert(items);
        if (iErr) throw iErr;

        toast({ title: "تم التحديث", description: "تم تحديث العينة المجانية بنجاح" });
      } else {
        // Create new
        const sampleNumber = generateSampleNumber();
        const { data: sample, error: sErr } = await supabase
          .from("free_samples")
          .insert({
            sample_number: sampleNumber,
            supplier_id: formSupplier || null,
            warehouse_id: formWarehouse,
            date_received: formDate,
            notes: formNotes || null,
            created_by: user.user?.id,
          })
          .select()
          .single();
        if (sErr) throw sErr;

        const items = validItems.map((i) => ({
          free_sample_id: sample.id,
          product_id: i.product_id,
          qty: i.qty,
          free_qty: i.qty,
          unit: i.unit || "حبة",
          expiry_date: i.expiry_date || null,
        }));
        const { error: iErr } = await supabase.from("free_sample_items").insert(items);
        if (iErr) throw iErr;

        toast({ title: "تم الحفظ", description: `تم إنشاء العينة المجانية ${sampleNumber}` });
      }

      setShowCreate(false);
      resetForm();
      fetchSamples();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (sample: FreeSample) => {
    setEditMode(true);
    setEditSampleId(sample.id);
    setFormSupplier(sample.supplier_id || "");
    setFormWarehouse(sample.warehouse_id);
    setFormDate(sample.date_received);
    setFormNotes(sample.notes || "");

    const { data } = await supabase
      .from("free_sample_items")
      .select("*")
      .eq("free_sample_id", sample.id);

    setFormItems(
      (data || []).map((i: any) => ({
        id: i.id,
        product_id: i.product_id,
        qty: i.qty,
        unit: i.unit || "حبة",
        expiry_date: i.expiry_date || "",
      }))
    );
    setShowCreate(true);
  };

  const handleDelete = async () => {
    if (!deleteSample) return;
    try {
      if (deleteSample.status === "posted") {
        // Reverse posted sample
        const { error } = await supabase.rpc("reverse_free_sample", { p_sample_id: deleteSample.id });
        if (error) throw error;
        toast({ title: "تم العكس", description: "تم عكس العينة المجانية وإلغاؤها" });
      } else {
        // Delete draft
        await supabase.from("free_sample_items").delete().eq("free_sample_id", deleteSample.id);
        const { error } = await supabase.from("free_samples").delete().eq("id", deleteSample.id);
        if (error) throw error;
        toast({ title: "تم الحذف", description: "تم حذف العينة المجانية" });
      }
      setShowDeleteConfirm(false);
      setDeleteSample(null);
      setShowView(false);
      fetchSamples();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const handlePost = async (sampleId: string) => {
    setPosting(true);
    try {
      const { data, error } = await supabase.rpc("post_free_sample", { p_sample_id: sampleId });
      if (error) throw error;
      toast({ title: "تم الترحيل", description: "تم ترحيل العينة المجانية وتحديث المخزون" });
      fetchSamples();
    } catch (err: any) {
      toast({ title: "خطأ في الترحيل", description: err.message, variant: "destructive" });
    } finally {
      setPosting(false);
    }
  };

  const handleViewSample = async (sample: FreeSample) => {
    setSelectedSample(sample);
    const { data } = await supabase
      .from("free_sample_items")
      .select("*, products(name)")
      .eq("free_sample_id", sample.id);
    setViewItems(data || []);
    setShowView(true);
  };

  const handleConvertStock = async () => {
    if (!convertItem || convertQty <= 0) return;
    try {
      const { error } = await supabase.rpc("convert_free_stock_to_regular", {
        p_product_id: convertItem.product_id,
        p_warehouse_id: selectedSample?.warehouse_id,
        p_quantity: convertQty,
        p_notes: `تحويل من عينة مجانية: ${selectedSample?.sample_number}`,
      });
      if (error) throw error;
      toast({ title: "تم التحويل", description: `تم تحويل ${convertQty} وحدة إلى مخزون عادي` });
      setShowConvert(false);
      setConvertItem(null);
      setConvertQty(0);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setEditMode(false);
    setEditSampleId(null);
    setFormSupplier("");
    setFormWarehouse("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormNotes("");
    setFormItems([{ product_id: "", qty: 1, unit: "حبة", expiry_date: "" }]);
  };

  const addItem = () => {
    setFormItems([...formItems, { product_id: "", qty: 1, unit: "حبة", expiry_date: "" }]);
  };

  const removeItem = (index: number) => {
    if (formItems.length > 1) {
      setFormItems(formItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof FreeSampleItem, value: any) => {
    const updated = [...formItems];
    (updated[index] as any)[field] = value;
    setFormItems(updated);
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      draft: { label: "مسودة", variant: "secondary" },
      posted: { label: "مرحّل", variant: "default" },
      cancelled: { label: "ملغي", variant: "destructive" },
    };
    const s = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  const filteredSamples = samples.filter(
    (s) =>
      s.sample_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.supplier_name || "").includes(searchTerm) ||
      (s.warehouse_name || "").includes(searchTerm)
  );

  const exportData = filteredSamples.map((s) => ({
    "رقم العينة": s.sample_number,
    "المورد": s.supplier_name,
    "المستودع": s.warehouse_name,
    "تاريخ الاستلام": s.date_received,
    "الحالة": s.status === "draft" ? "مسودة" : s.status === "posted" ? "مرحّل" : "ملغي",
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">العينات المجانية</h1>
            <p className="text-muted-foreground text-sm">إدارة العينات والهدايا من الموردين</p>
          </div>
        </div>
        <div className="flex gap-2">
          <ExportMenu data={exportData} fileName="free-samples" />
          <Button onClick={() => { resetForm(); setShowCreate(true); }}>
            <Plus className="w-4 h-4 ml-2" />
            عينة جديدة
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-4">
          <div className="relative">
            <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالرقم أو المورد أو المستودع..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Samples List */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم العينة</TableHead>
                <TableHead>المورد</TableHead>
                <TableHead>المستودع</TableHead>
                <TableHead>تاريخ الاستلام</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">جاري التحميل...</TableCell>
                </TableRow>
              ) : filteredSamples.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">لا توجد عينات مجانية</TableCell>
                </TableRow>
              ) : (
                filteredSamples.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-medium">{s.sample_number}</TableCell>
                    <TableCell>{s.supplier_name}</TableCell>
                    <TableCell>{s.warehouse_name}</TableCell>
                    <TableCell>{s.date_received}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleViewSample(s)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {s.status === "draft" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(s)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="default" onClick={() => handlePost(s.id)} disabled={posting}>
                              <Send className="w-4 h-4 ml-1" />
                              ترحيل
                            </Button>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => { setDeleteSample(s); setShowDeleteConfirm(true); }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              {editMode ? "تعديل العينة المجانية" : "إنشاء عينة مجانية جديدة"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>المورد</Label>
              <Select value={formSupplier} onValueChange={setFormSupplier}>
                <SelectTrigger><SelectValue placeholder="اختر المورد (اختياري)" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المستودع *</Label>
              <Select value={formWarehouse} onValueChange={setFormWarehouse}>
                <SelectTrigger><SelectValue placeholder="اختر المستودع" /></SelectTrigger>
                <SelectContent>
                  {warehouses.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>تاريخ الاستلام</Label>
              <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
            </div>
            <div>
              <Label>ملاحظات</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="ملاحظات..." />
            </div>
          </div>

          {/* Items table */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">المنتجات</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus className="w-4 h-4 ml-1" /> إضافة منتج
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>
                    <span className="flex items-center gap-1">
                      🎁 الكمية
                    </span>
                  </TableHead>
                  <TableHead>الوحدة</TableHead>
                  <TableHead>تاريخ الانتهاء</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formItems.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Select value={item.product_id} onValueChange={(v) => updateItem(idx, "product_id", v)}>
                        <SelectTrigger className="min-w-[200px]"><SelectValue placeholder="اختر منتج" /></SelectTrigger>
                        <SelectContent>
                          {products.map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", Math.max(0, Number(e.target.value)))}
                        className="w-24 border-primary/30 bg-primary/5 font-semibold"
                      />
                    </TableCell>
                    <TableCell>
                      <Input value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)} className="w-20" />
                    </TableCell>
                    <TableCell>
                      <Input type="date" value={item.expiry_date} onChange={(e) => updateItem(idx, "expiry_date", e.target.value)} className="w-36" />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(idx)} disabled={formItems.length <= 1}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>إلغاء</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "جاري الحفظ..." : editMode ? "تحديث" : "حفظ العينة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={showView} onOpenChange={setShowView}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              تفاصيل العينة: {selectedSample?.sample_number}
              <span className="mr-2">{selectedSample && statusBadge(selectedSample.status)}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-muted-foreground">المورد:</span> {selectedSample?.supplier_name}</div>
            <div><span className="text-muted-foreground">المستودع:</span> {selectedSample?.warehouse_name}</div>
            <div><span className="text-muted-foreground">تاريخ الاستلام:</span> {selectedSample?.date_received}</div>
            {selectedSample?.notes && (
              <div className="col-span-2"><span className="text-muted-foreground">ملاحظات:</span> {selectedSample.notes}</div>
            )}
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المنتج</TableHead>
                <TableHead>
                  <span className="flex items-center gap-1">🎁 الكمية</span>
                </TableHead>
                <TableHead>الوحدة</TableHead>
                <TableHead>تاريخ الانتهاء</TableHead>
                {selectedSample?.status === "posted" && <TableHead>تحويل</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {viewItems.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.products?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1">
                      🎁 {item.qty}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.unit || "حبة"}</TableCell>
                  <TableCell>{item.expiry_date || "—"}</TableCell>
                  {selectedSample?.status === "posted" && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setConvertItem(item);
                          setConvertQty(item.qty);
                          setShowConvert(true);
                        }}
                      >
                        <ArrowRightLeft className="w-4 h-4 ml-1" />
                        تحويل
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <DialogFooter>
            {selectedSample?.status === "draft" && (
              <>
                <Button variant="outline" onClick={() => { handleEdit(selectedSample); setShowView(false); }}>
                  <Pencil className="w-4 h-4 ml-1" /> تعديل
                </Button>
                <Button onClick={() => { handlePost(selectedSample.id); setShowView(false); }} disabled={posting}>
                  <Send className="w-4 h-4 ml-1" /> ترحيل
                </Button>
              </>
            )}
            <Button
              variant="destructive"
              onClick={() => { setDeleteSample(selectedSample); setShowDeleteConfirm(true); }}
            >
              <Trash2 className="w-4 h-4 ml-1" />
              {selectedSample?.status === "posted" ? "عكس وإلغاء" : "حذف"}
            </Button>
            <Button variant="outline" onClick={() => setShowView(false)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="w-5 h-5" />
              {deleteSample?.status === "posted" ? "عكس وإلغاء العينة" : "حذف العينة"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteSample?.status === "posted"
              ? "سيتم عكس الكميات المجانية من المخزون وإلغاء هذه العينة. هل أنت متأكد؟"
              : "سيتم حذف هذه العينة نهائياً. هل أنت متأكد؟"}
          </p>
          <p className="font-mono text-sm font-medium">{deleteSample?.sample_number}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>
              {deleteSample?.status === "posted" ? "عكس وإلغاء" : "حذف نهائياً"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              تحويل المخزون المجاني إلى عادي
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              المنتج: <strong>{convertItem?.products?.name}</strong>
            </p>
            <div>
              <Label>الكمية المراد تحويلها</Label>
              <Input
                type="number"
                min={1}
                max={convertItem?.qty || 0}
                value={convertQty}
                onChange={(e) => setConvertQty(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground mt-1">الحد الأقصى: {convertItem?.qty}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>إلغاء</Button>
            <Button onClick={handleConvertStock} disabled={convertQty <= 0}>تأكيد التحويل</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FreeSamples;
