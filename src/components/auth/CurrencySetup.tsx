import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { currencies } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface CurrencySetupProps {
  user: User;
  onComplete: () => void;
  onSignOut: () => void;
}

export function CurrencySetup({ user, onComplete, onSignOut }: CurrencySetupProps) {
  const [currency, setCurrency] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();

  const saveCurrency = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currency || saving) return;
    setSaving(true);
    setError("");

    try {
      const { data, error: saveError } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata.full_name,
          avatar_url: user.user_metadata.avatar_url,
          currency,
        }, { onConflict: "user_id" })
        .select()
        .single();

      if (saveError) throw saveError;
      queryClient.setQueryData(["profile", user.id], data);
      onComplete();
    } catch {
      setError("We couldn't save your currency. Please try again. Your choice is still selected.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-subtle flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md space-y-6">
        <div className="flex items-center justify-center gap-3">
          <img src="/pitipal_square.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-2xl font-bold text-primary">Pitipal</span>
        </div>
        <Card className="bg-gradient-card shadow-lg">
          <CardHeader>
            <p className="text-sm font-medium text-primary">Step 1 of 3 · Your currency</p>
            <CardTitle className="text-2xl">Welcome! Let's make this yours.</CardTitle>
            <CardDescription>
              Choose the currency you use day to day. Next, you'll set a spending limit and record your first transaction.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveCurrency} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="setup-currency">Your currency</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={saving}>
                  <SelectTrigger id="setup-currency">
                    <SelectValue placeholder="Choose a currency" />
                  </SelectTrigger>
                  <SelectContent className="w-[var(--radix-select-trigger-width)]">
                    {currencies.map(option => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.code} · {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {currency && (
                <div className="rounded-lg bg-muted p-3 text-sm" aria-live="polite">
                  Example amount: <strong>{formatCurrency(currency === "IDR" ? 1500000 : 100, currency)}</strong>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Used to display all your amounts, not to convert them. You can change this later in Settings.
              </p>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="hero" className="w-full" disabled={!currency || saving}>
                {saving ? "Saving currency…" : "Continue to my dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Button variant="ghost" className="w-full" onClick={onSignOut} disabled={saving}>Sign out</Button>
      </div>
    </main>
  );
}
