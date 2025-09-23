import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Coins, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Asset {
  id: string;
  symbol: string;
  name: string;
  asset_type: string;
  exchange: string | null;
  sector: string | null;
  currency: string;
  is_custom: boolean;
}

export function AssetsSection() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAsset, setNewAsset] = useState({
    symbol: "",
    name: "",
    asset_type: "stock",
    exchange: "",
    sector: ""
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch assets
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('is_active', true)
        .order('symbol');
      
      if (error) throw error;
      return data as Asset[];
    }
  });

  // Add custom asset mutation
  const addAssetMutation = useMutation({
    mutationFn: async (asset: typeof newAsset) => {
      const { data, error } = await supabase
        .from('assets')
        .insert({
          ...asset,
          is_custom: true,
          created_by: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setDialogOpen(false);
      setNewAsset({
        symbol: "",
        name: "",
        asset_type: "stock",
        exchange: "",
        sector: ""
      });
      toast({
        title: "Success",
        description: "Custom asset added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add asset",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAssetMutation.mutate(newAsset);
  };

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         asset.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || asset.asset_type === filterType;
    return matchesSearch && matchesType;
  });

  const defaultAssets = filteredAssets.filter(a => !a.is_custom);
  const customAssets = filteredAssets.filter(a => a.is_custom);

  const getAssetTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      stock: "Stock",
      etf: "ETF",
      crypto: "Crypto",
      mutual_fund: "Mutual Fund",
      bond: "Bond",
      commodity: "Commodity",
      other: "Other"
    };
    return typeLabels[type] || type;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Assets Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading assets...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Assets Management
        </CardTitle>
        <CardDescription>
          Manage your investment assets including stocks, ETFs, crypto, and custom assets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Coins className="h-4 w-4" />
          <AlertDescription>
            Asset management is now fully functional! Use these assets in your investment transactions.
          </AlertDescription>
        </Alert>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">
              {defaultAssets.length} default assets • {customAssets.length} custom assets
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Custom Asset</DialogTitle>
                <DialogDescription>
                  Create a custom asset for investments not available in our default list.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol *</Label>
                    <Input
                      id="symbol"
                      value={newAsset.symbol}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                      placeholder="AAPL"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="asset_type">Type *</Label>
                    <Select value={newAsset.asset_type} onValueChange={(value) => setNewAsset(prev => ({ ...prev, asset_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="etf">ETF</SelectItem>
                        <SelectItem value="crypto">Crypto</SelectItem>
                        <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                        <SelectItem value="bond">Bond</SelectItem>
                        <SelectItem value="commodity">Commodity</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Apple Inc."
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="exchange">Exchange</Label>
                    <Input
                      id="exchange"
                      value={newAsset.exchange}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, exchange: e.target.value }))}
                      placeholder="NASDAQ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Input
                      id="sector"
                      value={newAsset.sector}
                      onChange={(e) => setNewAsset(prev => ({ ...prev, sector: e.target.value }))}
                      placeholder="Technology"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addAssetMutation.isPending}>
                    {addAssetMutation.isPending ? "Adding..." : "Add Asset"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="stock">Stocks</SelectItem>
              <SelectItem value="etf">ETFs</SelectItem>
              <SelectItem value="crypto">Crypto</SelectItem>
              <SelectItem value="mutual_fund">Mutual Funds</SelectItem>
              <SelectItem value="bond">Bonds</SelectItem>
              <SelectItem value="commodity">Commodities</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {customAssets.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Your Custom Assets</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
              {customAssets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <h5 className="font-medium">{asset.symbol}</h5>
                    <p className="text-sm text-muted-foreground">{asset.name}</p>
                    {asset.exchange && (
                      <p className="text-xs text-muted-foreground">{asset.exchange}</p>
                    )}
                  </div>
                  <Badge variant="default" className="text-xs">
                    {getAssetTypeLabel(asset.asset_type)}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-medium mb-3">Available Assets ({defaultAssets.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
            {defaultAssets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <h5 className="font-medium">{asset.symbol}</h5>
                  <p className="text-sm text-muted-foreground">{asset.name}</p>
                  {asset.exchange && (
                    <p className="text-xs text-muted-foreground">{asset.exchange}</p>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {getAssetTypeLabel(asset.asset_type)}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}