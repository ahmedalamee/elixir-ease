import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Lock, Phone, MapPin } from "lucide-react";
import { customerSchema } from "@/lib/validationSchemas";
import { z } from "zod";

const CustomerAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkIfAlreadyLoggedIn();
  }, []);

  const checkIfAlreadyLoggedIn = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate("/customer-portal");
    }
  };

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) {
      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }
    if (!/[A-Z]/.test(pass)) {
      return "كلمة المرور يجب أن تحتوي على حرف كبير";
    }
    if (!/[a-z]/.test(pass)) {
      return "كلمة المرور يجب أن تحتوي على حرف صغير";
    }
    if (!/[0-9]/.test(pass)) {
      return "كلمة المرور يجب أن تحتوي على رقم";
    }
    return null;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في بوابة العملاء",
        });
        navigate("/customer-portal");
      } else {
        // Validate password strength
        const passwordError = validatePassword(password);
        if (passwordError) {
          toast({
            title: "كلمة مرور ضعيفة",
            description: passwordError,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Validate customer data
        const customerData = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          address: address.trim() || null,
          credit_limit: 0,
          loyalty_points: 0,
        };

        const validationSchema = customerSchema.pick({
          name: true,
          email: true,
          phone: true,
          address: true,
        });

        const validatedData = validationSchema.parse(customerData);

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: validatedData.email!,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/customer-portal`,
          },
        });
        
        if (authError) throw authError;

        if (authData.user) {
          // Create customer record with validated data
          const { error: customerError } = await supabase
            .from("customers")
            .insert([{
              name: validatedData.name,
              email: validatedData.email || null,
              phone: validatedData.phone || null,
              address: validatedData.address || null,
              user_id: authData.user.id,
              balance: 0,
              credit_limit: 0,
              loyalty_points: 0,
              is_active: true,
            }]);

          if (customerError) throw customerError;

          toast({
            title: "تم إنشاء الحساب بنجاح",
            description: "يمكنك الآن تسجيل الدخول",
          });
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        toast({
          title: "خطأ في البيانات",
          description: firstError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "خطأ",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-accent/5 to-background p-4" dir="rtl">
      <Card className="w-full max-w-md p-8 space-y-6 card-elegant">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-primary to-primary-hover p-4 rounded-2xl">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-hover bg-clip-text text-transparent">
            بوابة العملاء
          </h1>
          <p className="text-muted-foreground">
            {isLogin ? "سجل دخولك لعرض بياناتك وفواتيرك" : "أنشئ حساباً جديداً"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4" />
                  الاسم الكامل
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="input-medical"
                  placeholder="أدخل اسمك الكامل"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  رقم الهاتف
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="input-medical"
                  placeholder="05xxxxxxxx"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  العنوان
                </label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="input-medical"
                  placeholder="العنوان (اختياري)"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Mail className="w-4 h-4" />
              البريد الإلكتروني
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-medical"
              placeholder="example@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              كلمة المرور
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-medical"
              placeholder="••••••••"
              minLength={8}
            />
            {!isLogin && (
              <p className="text-xs text-muted-foreground">
                8 أحرف على الأقل، تحتوي على أحرف كبيرة وصغيرة وأرقام
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full btn-medical"
            disabled={loading}
          >
            {loading ? "جاري المعالجة..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-primary hover:underline"
          >
            {isLogin ? "ليس لديك حساب؟ سجل الآن" : "لديك حساب؟ سجل دخولك"}
          </button>
          
          <div className="pt-2 border-t">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              العودة للصفحة الرئيسية
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CustomerAuth;