import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Edit, Trash2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Workflow {
  id: string;
  workflow_name: string;
  document_type: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_name: string;
  step_order: number;
  approver_role: string;
  is_required: boolean;
  min_amount: number | null;
  max_amount: number | null;
}

const docTypeLabels: Record<string, string> = {
  purchase_requisition: "طلب شراء",
  purchase_order: "أمر شراء",
  sales_invoice: "فاتورة مبيعات",
  expense: "مصروفات",
};

export default function ApprovalWorkflows() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isStepsDialogOpen, setIsStepsDialogOpen] = useState(false);

  const [newWorkflow, setNewWorkflow] = useState({
    workflow_name: "",
    document_type: "purchase_requisition",
    description: "",
  });

  const [newStep, setNewStep] = useState({
    step_name: "",
    approver_role: "",
    is_required: true,
  });

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("approval_workflows")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("خطأ في تحميل سير العمل");
    } else {
      setWorkflows(data || []);
    }
    setIsLoading(false);
  };

  const fetchSteps = async (workflowId: string) => {
    const { data, error } = await supabase
      .from("approval_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("step_order", { ascending: true });

    if (error) {
      toast.error("خطأ في تحميل خطوات الموافقة");
    } else {
      setSteps(data || []);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newWorkflow.workflow_name) {
      toast.error("اسم سير العمل مطلوب");
      return;
    }

    const { error } = await supabase.from("approval_workflows").insert({
      workflow_name: newWorkflow.workflow_name,
      document_type: newWorkflow.document_type,
      description: newWorkflow.description || null,
      is_active: true,
    });

    if (error) {
      toast.error("خطأ في إنشاء سير العمل");
    } else {
      toast.success("تم إنشاء سير العمل بنجاح");
      setIsAddDialogOpen(false);
      setNewWorkflow({ workflow_name: "", document_type: "purchase_requisition", description: "" });
      fetchWorkflows();
    }
  };

  const handleToggleActive = async (workflow: Workflow) => {
    const { error } = await supabase
      .from("approval_workflows")
      .update({ is_active: !workflow.is_active })
      .eq("id", workflow.id);

    if (error) {
      toast.error("خطأ في تحديث حالة سير العمل");
    } else {
      fetchWorkflows();
    }
  };

  const handleDeleteWorkflow = async (id: string) => {
    const { error } = await supabase.from("approval_workflows").delete().eq("id", id);

    if (error) {
      toast.error("خطأ في حذف سير العمل");
    } else {
      toast.success("تم حذف سير العمل");
      fetchWorkflows();
    }
  };

  const handleOpenSteps = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    fetchSteps(workflow.id);
    setIsStepsDialogOpen(true);
  };

  const handleAddStep = async () => {
    if (!selectedWorkflow || !newStep.step_name || !newStep.approver_role) {
      toast.error("جميع الحقول مطلوبة");
      return;
    }

    const nextOrder = steps.length + 1;

    const { error } = await supabase.from("approval_steps").insert({
      workflow_id: selectedWorkflow.id,
      step_name: newStep.step_name,
      step_order: nextOrder,
      approver_role: newStep.approver_role,
      is_required: newStep.is_required,
    });

    if (error) {
      toast.error("خطأ في إضافة الخطوة");
    } else {
      toast.success("تم إضافة الخطوة بنجاح");
      setNewStep({ step_name: "", approver_role: "", is_required: true });
      fetchSteps(selectedWorkflow.id);
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!selectedWorkflow) return;

    const { error } = await supabase.from("approval_steps").delete().eq("id", stepId);

    if (error) {
      toast.error("خطأ في حذف الخطوة");
    } else {
      toast.success("تم حذف الخطوة");
      fetchSteps(selectedWorkflow.id);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">سير عمل الموافقات</h1>
          <p className="text-muted-foreground">إدارة سير عمل الموافقات وخطواتها</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              سير عمل جديد
            </Button>
          </DialogTrigger>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء سير عمل جديد</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>اسم سير العمل *</Label>
                <Input
                  value={newWorkflow.workflow_name}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, workflow_name: e.target.value })
                  }
                  placeholder="مثال: موافقة طلبات الشراء"
                />
              </div>
              <div className="space-y-2">
                <Label>نوع المستند *</Label>
                <Select
                  value={newWorkflow.document_type}
                  onValueChange={(value) =>
                    setNewWorkflow({ ...newWorkflow, document_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase_requisition">طلب شراء</SelectItem>
                    <SelectItem value="purchase_order">أمر شراء</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>الوصف</Label>
                <Input
                  value={newWorkflow.description}
                  onChange={(e) =>
                    setNewWorkflow({ ...newWorkflow, description: e.target.value })
                  }
                  placeholder="وصف سير العمل"
                />
              </div>
              <Button onClick={handleCreateWorkflow} className="w-full">
                إنشاء
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة سير العمل</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">جاري التحميل...</div>
          ) : !workflows.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>لا يوجد سير عمل</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">نوع المستند</TableHead>
                  <TableHead className="text-right">الوصف</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => (
                  <TableRow key={workflow.id}>
                    <TableCell className="font-medium">{workflow.workflow_name}</TableCell>
                    <TableCell>
                      {docTypeLabels[workflow.document_type] || workflow.document_type}
                    </TableCell>
                    <TableCell>{workflow.description || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={workflow.is_active}
                        onCheckedChange={() => handleToggleActive(workflow)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenSteps(workflow)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteWorkflow(workflow.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isStepsDialogOpen} onOpenChange={setIsStepsDialogOpen}>
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              خطوات الموافقة - {selectedWorkflow?.workflow_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="space-y-4">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{step.step_order}</Badge>
                    <div>
                      <p className="font-medium">{step.step_name}</p>
                      <p className="text-sm text-muted-foreground">
                        الدور: {step.approver_role}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteStep(step.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              {steps.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  لا توجد خطوات بعد
                </p>
              )}
            </div>

            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">إضافة خطوة جديدة</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم الخطوة</Label>
                  <Input
                    value={newStep.step_name}
                    onChange={(e) =>
                      setNewStep({ ...newStep, step_name: e.target.value })
                    }
                    placeholder="مثال: موافقة المدير"
                  />
                </div>
                <div className="space-y-2">
                  <Label>الدور المطلوب</Label>
                  <Input
                    value={newStep.approver_role}
                    onChange={(e) =>
                      setNewStep({ ...newStep, approver_role: e.target.value })
                    }
                    placeholder="مثال: manager"
                  />
                </div>
              </div>
              <Button onClick={handleAddStep}>
                <Plus className="ml-2 h-4 w-4" />
                إضافة الخطوة
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
