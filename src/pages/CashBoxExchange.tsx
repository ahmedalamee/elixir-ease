import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  ArrowLeftRight, 
  Wallet, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2,
  Calculator,
  RefreshCw,
  History
} from "lucide-react";
import { getExchangeRate, formatCurrencyWithCode } from "@/lib/currency";

interface CashBox {
  id: string;
  box_code: string;
  box_name: string;
  currency_code: string;
  current_balance: number;
  is_active: boolean;
}

interface ExchangeHistory {
  id: string;
  exchange_number: string;
  exchange_date: string;
  from_currency: string;
  to_currency: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  status: string;
  notes: string | null;
  created_at: string;
  from_box: { box_name: string } | null;
  to_box: { box_name: string } | null;
}

export default function CashBoxExchange() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [cashBoxes, setCashBoxes] = useState<CashBox[]>([]);
  const [exchangeHistory, setExchangeHistory] = useState<ExchangeHistory[]>([]);
  
  // Form state
  const [fromCashBoxId, setFromCashBoxId] = useState<string>("");
  const [toCashBoxId, setToCashBoxId] = useState<string>("");
  const [fromAmount, setFromAmount] = useState<string>("");
  const [exchangeDate, setExchangeDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  
  // Computed state
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);

  useEffect(() => {
    checkAuth();
    loadData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load YER and SAR cash boxes only
      const { data: boxesData, error: boxesError } = await supabase
        .from("cash_boxes")
        .select("id, box_code, box_name, currency_code, current_balance, is_active")
        .in("currency_code", ["YER", "SAR"])
        .eq("is_active", true)
        .order("currency_code");

      if (boxesError) throw boxesError;
      setCashBoxes(boxesData || []);

      // Load exchange history with separate queries for box names
      const { data: historyData, error: historyError } = await supabase
        .from("cash_box_exchanges")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (historyError) throw historyError;
      
      // Get box names for history
      const historyWithBoxNames = await Promise.all(
        (historyData || []).map(async (exchange) => {
          const [fromBoxRes, toBoxRes] = await Promise.all([
            supabase.from("cash_boxes").select("box_name").eq("id", exchange.from_cash_box_id).single(),
            supabase.from("cash_boxes").select("box_name").eq("id", exchange.to_cash_box_id).single()
          ]);
          return {
            ...exchange,
            from_box: fromBoxRes.data,
            to_box: toBoxRes.data
          } as ExchangeHistory;
        })
      );
      
      setExchangeHistory(historyWithBoxNames);
      
    } catch (error: any) {
      toast.error("فشل تحميل البيانات");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Get selected cash boxes
  const fromCashBox = useMemo(() => 
    cashBoxes.find(b => b.id === fromCashBoxId), 
    [cashBoxes, fromCashBoxId]
  );
  
  const toCashBox = useMemo(() => 
    cashBoxes.find(b => b.id === toCashBoxId), 
    [cashBoxes, toCashBoxId]
  );

  // Filter target boxes (different currency only)
  const availableTargetBoxes = useMemo(() => {
    if (!fromCashBox) return cashBoxes;
    return cashBoxes.filter(b => b.currency_code !== fromCashBox.currency_code);
  }, [cashBoxes, fromCashBox]);

  // Fetch exchange rate when currencies change
  useEffect(() => {
    const fetchRate = async () => {
      if (!fromCashBox || !toCashBox) {
        setExchangeRate(null);
        setRateError(null);
        return;
      }

      if (fromCashBox.currency_code === toCashBox.currency_code) {
        setExchangeRate(1);
        return;
      }

      setLoadingRate(true);
      setRateError(null);
      
      try {
        const rate = await getExchangeRate(
          fromCashBox.currency_code,
          toCashBox.currency_code,
          exchangeDate
        );
        setExchangeRate(rate);
      } catch (error: any) {
        setRateError("سعر الصرف غير متوفر لهذا التاريخ");
        setExchangeRate(null);
      } finally {
        setLoadingRate(false);
      }
    };

    fetchRate();
  }, [fromCashBox, toCashBox, exchangeDate]);

  // Calculate target amount
  const toAmount = useMemo(() => {
    if (!fromAmount || !exchangeRate) return 0;
    return parseFloat(fromAmount) * exchangeRate;
  }, [fromAmount, exchangeRate]);

  // Calculate new balances
  const newFromBalance = useMemo(() => {
    if (!fromCashBox || !fromAmount) return fromCashBox?.current_balance || 0;
    return fromCashBox.current_balance - parseFloat(fromAmount);
  }, [fromCashBox, fromAmount]);

  const newToBalance = useMemo(() => {
    if (!toCashBox || !toAmount) return toCashBox?.current_balance || 0;
    return toCashBox.current_balance + toAmount;
  }, [toCashBox, toAmount]);

  // Validation
  const isValid = useMemo(() => {
    if (!fromCashBoxId || !toCashBoxId) return false;
    if (fromCashBoxId === toCashBoxId) return false;
    if (!fromAmount || parseFloat(fromAmount) <= 0) return false;
    if (!exchangeRate || exchangeRate <= 0) return false;
    if (fromCashBox && parseFloat(fromAmount) > fromCashBox.current_balance) return false;
    return true;
  }, [fromCashBoxId, toCashBoxId, fromAmount, exchangeRate, fromCashBox]);

  const handleExecute = async () => {
    if (!isValid) return;

    setExecuting(true);
    try {
      const { data, error } = await supabase.rpc("execute_cash_box_exchange", {
        p_from_cash_box_id: fromCashBoxId,
        p_to_cash_box_id: toCashBoxId,
        p_from_amount: parseFloat(fromAmount),
        p_exchange_date: exchangeDate,
        p_notes: notes || null
      });

      if (error) throw error;

      const result = data as { exchange_number: string; success: boolean };
      toast.success(`تمت المصارفة بنجاح - رقم العملية: ${result.exchange_number}`);
      
      // Reset form
      setFromCashBoxId("");
      setToCashBoxId("");
      setFromAmount("");
      setNotes("");
      
      // Reload data
      loadData();
      
    } catch (error: any) {
      toast.error(error.message || "فشل تنفيذ المصارفة");
      console.error(error);
    } finally {
      setExecuting(false);
    }
  };

  const handleReset = () => {
    setFromCashBoxId("");
    setToCashBoxId("");
    setFromAmount("");
    setNotes("");
    setExchangeRate(null);
    setRateError(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto p-6 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <ArrowLeftRight className="h-8 w-8 text-primary" />
              المصارفة بين الصناديق
            </h1>
            <p className="text-muted-foreground mt-1">
              تحويل الأموال بين صندوق الريال اليمني وصندوق الريال السعودي
            </p>
          </div>
        </div>

        {/* No cash boxes warning */}
        {cashBoxes.length < 2 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>لا توجد صناديق كافية</AlertTitle>
            <AlertDescription>
              يجب وجود صندوقين على الأقل بعملتين مختلفتين (YER و SAR) لتنفيذ المصارفة.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exchange Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                نموذج المصارفة
              </CardTitle>
              <CardDescription>
                اختر الصناديق وأدخل المبلغ المراد تحويله
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Date */}
              <div>
                <Label>تاريخ المصارفة</Label>
                <Input
                  type="date"
                  value={exchangeDate}
                  onChange={(e) => setExchangeDate(e.target.value)}
                  className="max-w-xs"
                />
              </div>

              {/* From Cash Box */}
              <div className="space-y-2">
                <Label>الصندوق المصدر (السحب من)</Label>
                <Select value={fromCashBoxId} onValueChange={(v) => {
                  setFromCashBoxId(v);
                  // Reset target if same currency
                  const selectedBox = cashBoxes.find(b => b.id === v);
                  if (selectedBox && toCashBox?.currency_code === selectedBox.currency_code) {
                    setToCashBoxId("");
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصندوق المصدر" />
                  </SelectTrigger>
                  <SelectContent>
                    {cashBoxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        <div className="flex items-center gap-2">
                          <span>{box.box_name}</span>
                          <Badge variant="outline">{box.currency_code}</Badge>
                          <span className="text-muted-foreground">
                            ({formatCurrencyWithCode(box.current_balance, box.currency_code)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {fromCashBox && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الرصيد الحالي:</span>
                      <span className="font-bold text-lg">
                        {formatCurrencyWithCode(fromCashBox.current_balance, fromCashBox.currency_code)}
                      </span>
                    </div>
                    {fromAmount && parseFloat(fromAmount) > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">الرصيد بعد المصارفة:</span>
                        <span className={`font-bold text-lg ${newFromBalance < 0 ? 'text-destructive' : 'text-green-600'}`}>
                          {formatCurrencyWithCode(newFromBalance, fromCashBox.currency_code)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* To Cash Box */}
              <div className="space-y-2">
                <Label>الصندوق الهدف (الإيداع في)</Label>
                <Select 
                  value={toCashBoxId} 
                  onValueChange={setToCashBoxId}
                  disabled={!fromCashBoxId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الصندوق الهدف" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTargetBoxes.map((box) => (
                      <SelectItem key={box.id} value={box.id}>
                        <div className="flex items-center gap-2">
                          <span>{box.box_name}</span>
                          <Badge variant="outline">{box.currency_code}</Badge>
                          <span className="text-muted-foreground">
                            ({formatCurrencyWithCode(box.current_balance, box.currency_code)})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {toCashBox && (
                  <div className="bg-muted/50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">الرصيد الحالي:</span>
                      <span className="font-bold text-lg">
                        {formatCurrencyWithCode(toCashBox.current_balance, toCashBox.currency_code)}
                      </span>
                    </div>
                    {toAmount > 0 && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">الرصيد بعد المصارفة:</span>
                        <span className="font-bold text-lg text-green-600">
                          {formatCurrencyWithCode(newToBalance, toCashBox.currency_code)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Exchange Rate Display */}
              {fromCashBox && toCashBox && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <span className="font-medium">سعر الصرف</span>
                    </div>
                    {loadingRate ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : rateError ? (
                      <span className="text-destructive text-sm">{rateError}</span>
                    ) : exchangeRate ? (
                      <span className="font-bold text-lg text-primary">
                        1 {fromCashBox.currency_code} = {exchangeRate.toFixed(4)} {toCashBox.currency_code}
                      </span>
                    ) : null}
                  </div>
                </div>
              )}

              {/* Rate Error Alert */}
              {rateError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>سعر الصرف غير متوفر</AlertTitle>
                  <AlertDescription>
                    لا يوجد سعر صرف لـ {fromCashBox?.currency_code}/{toCashBox?.currency_code} بتاريخ {exchangeDate}.
                    يرجى إضافة سعر الصرف من صفحة <a href="/settings/exchange-rates" className="underline">أسعار الصرف</a>.
                  </AlertDescription>
                </Alert>
              )}

              {/* Amount Input */}
              <div className="space-y-2">
                <Label>المبلغ ({fromCashBox?.currency_code || ""})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="أدخل المبلغ المراد تحويله"
                  disabled={!fromCashBoxId || !toCashBoxId || !!rateError}
                />
                
                {/* Insufficient balance warning */}
                {fromCashBox && fromAmount && parseFloat(fromAmount) > fromCashBox.current_balance && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      الرصيد غير كافٍ. الرصيد المتاح: {formatCurrencyWithCode(fromCashBox.current_balance, fromCashBox.currency_code)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Calculated Amount */}
              {toAmount > 0 && toCashBox && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">المبلغ المستلم:</span>
                    <span className="font-bold text-2xl text-green-600 dark:text-green-400">
                      {formatCurrencyWithCode(toAmount, toCashBox.currency_code)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أي ملاحظات إضافية..."
                  rows={2}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleExecute} 
                  disabled={!isValid || executing}
                  className="flex-1"
                  size="lg"
                >
                  {executing ? (
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  )}
                  تنفيذ المصارفة
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                  disabled={executing}
                >
                  مسح الحقول
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cash Boxes Summary */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  الصناديق المتاحة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {cashBoxes.map((box) => (
                  <div 
                    key={box.id} 
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{box.box_name}</span>
                      <Badge>{box.currency_code}</Badge>
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      {formatCurrencyWithCode(box.current_balance, box.currency_code)}
                    </div>
                  </div>
                ))}
                
                {cashBoxes.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    لا توجد صناديق متاحة
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Exchange History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              سجل المصارفات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العملية</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>من صندوق</TableHead>
                  <TableHead>إلى صندوق</TableHead>
                  <TableHead>المبلغ المحول</TableHead>
                  <TableHead>المبلغ المستلم</TableHead>
                  <TableHead>سعر الصرف</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exchangeHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      لا توجد عمليات مصارفة سابقة
                    </TableCell>
                  </TableRow>
                ) : (
                  exchangeHistory.map((exchange) => (
                    <TableRow key={exchange.id}>
                      <TableCell className="font-mono">{exchange.exchange_number}</TableCell>
                      <TableCell>{exchange.exchange_date}</TableCell>
                      <TableCell>{exchange.from_box?.box_name || "-"}</TableCell>
                      <TableCell>{exchange.to_box?.box_name || "-"}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrencyWithCode(exchange.from_amount, exchange.from_currency)}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrencyWithCode(exchange.to_amount, exchange.to_currency)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {exchange.exchange_rate.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={exchange.status === 'posted' ? 'default' : 'secondary'}>
                          {exchange.status === 'posted' ? 'منفذة' : exchange.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}