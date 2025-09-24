import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, DollarSign, Mail, Calendar } from "lucide-react";

interface GeneralSettingsProps {
  profile: any;
  user: any;
  currencies: any[];
  queryClient: any;
}

export function GeneralSettings({ profile, user, currencies, queryClient }: GeneralSettingsProps) {
  const { toast } = useToast();
  const [selectedCurrency, setSelectedCurrency] = useState(profile?.currency || "USD");

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
        <h2 className="text-2xl font-semibold">General Settings</h2>
        <p className="text-muted-foreground">
          Manage your basic account preferences and settings
        </p>
      </div>

      <div className="grid gap-6">
        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Currency Settings
            </CardTitle>
            <CardDescription>
              Choose your preferred currency for displaying amounts throughout the app
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium">Preferred Currency</label>
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
              <p className="text-xs text-muted-foreground">
                This will be used for all monetary displays in the application
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details and profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  Email Address
                </div>
                <p className="text-sm font-medium">{user?.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  Full Name
                </div>
                <p className="text-sm font-medium">
                  {user?.user_metadata?.full_name || "Not provided"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Account Created
                </div>
                <p className="text-sm font-medium">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Unknown"}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <DollarSign className="h-4 w-4" />
                  Currency
                </div>
                <p className="text-sm font-medium">
                  {profile?.currency || "Not set"}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                To update your email or name, please contact support or update through your authentication provider.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}