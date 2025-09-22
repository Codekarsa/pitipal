import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Euro, PoundSterling, CircleDollarSign } from "lucide-react";

const currencies = [
  { code: "USD", symbol: "$", name: "US Dollar", icon: DollarSign },
  { code: "EUR", symbol: "€", name: "Euro", icon: Euro },
  { code: "GBP", symbol: "£", name: "British Pound", icon: PoundSterling },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", icon: CircleDollarSign },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", icon: CircleDollarSign },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", icon: DollarSign },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", icon: CircleDollarSign },
  { code: "THB", symbol: "฿", name: "Thai Baht", icon: CircleDollarSign },
  { code: "KRW", symbol: "₩", name: "South Korean Won", icon: CircleDollarSign },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", icon: CircleDollarSign },
  { code: "INR", symbol: "₹", name: "Indian Rupee", icon: CircleDollarSign },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", icon: DollarSign },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", icon: DollarSign },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCurrency, setSelectedCurrency] = useState("USD");

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async (currency: string) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("profiles")
        .upsert({
          user_id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          currency: currency,
        }, {
          onConflict: "user_id"
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({
        title: "Settings updated",
        description: "Your currency preference has been saved.",
      });
    },
    onError: (error) => {
      console.error("Error updating currency:", error);
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
    updateCurrencyMutation.mutate(currency);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
            <CardDescription>
              Choose your preferred currency for displaying amounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={profile?.currency || selectedCurrency}
              onValueChange={handleCurrencyChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => {
                  const Icon = currency.icon;
                  return (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center space-x-2">
                        <Icon className="h-4 w-4" />
                        <span>{currency.symbol} {currency.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <p className="text-sm">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              <p className="text-sm">{user?.user_metadata?.full_name || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}