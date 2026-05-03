import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Utensils, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { name, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [value, setValue] = useState("");

  if (!loading && name) return <Navigate to="/" replace />;

  const handleEnter = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return toast.error("Please enter your name");
    if (trimmed.length > 30) return toast.error("Max 30 characters");
    signIn(trimmed);
    toast.success(`Welcome, ${trimmed}! 🎉`);
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6 gap-3">
          <div className="w-14 h-14 rounded-2xl gradient-warm flex items-center justify-center shadow-pop">
            <Utensils className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">MakanApa</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
              <Sparkles className="w-3 h-3" /> chat · order · vibe
            </p>
          </div>
        </div>

        <form onSubmit={handleEnter} className="bg-card border border-border rounded-2xl shadow-pop p-6 space-y-4">
          <div>
            <Label className="text-card-foreground">What's your name?</Label>
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. Alex"
              maxLength={30}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              We'll use this name in the chat. No password needed ✌️
            </p>
          </div>
          <Button type="submit" className="w-full gradient-warm text-primary-foreground font-semibold">
            Enter marketplace →
          </Button>
        </form>
      </div>
    </div>
  );
}
