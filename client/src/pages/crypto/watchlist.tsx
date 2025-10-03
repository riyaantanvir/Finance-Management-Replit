import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bitcoin, Search, Trash2, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CoinSearchResult {
  id: string;
  symbol: string;
  name: string;
}

interface WatchlistItem {
  id: string;
  userId: string;
  coinId: string;
  coinName: string;
  coinSymbol: string;
}

interface CoinPrice {
  id: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

export default function WatchlistPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CoinSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const sessionId = localStorage.getItem('sessionId');

  // Fetch user's watchlist
  const { data: watchlist = [], isLoading: isLoadingWatchlist, error: watchlistError } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/crypto/watchlist"],
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID");
      const response = await fetch(`/api/crypto/watchlist?sessionId=${sessionId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to fetch watchlist");
      }
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Fetch API settings to get CoinGecko API key
  const { data: apiSettings } = useQuery<{ coinGeckoApiKey?: string }>({
    queryKey: ["/api/crypto/settings"],
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID");
      const response = await fetch(`/api/crypto/settings?sessionId=${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch API settings");
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Fetch coin prices from CoinGecko
  const { data: coinPrices = [], isLoading: isLoadingPrices, error: pricesError } = useQuery<CoinPrice[]>({
    queryKey: ["/api/crypto/prices", watchlist, apiSettings?.coinGeckoApiKey],
    queryFn: async () => {
      if (!watchlist || watchlist.length === 0) return [];
      if (!apiSettings?.coinGeckoApiKey) {
        throw new Error("CoinGecko API key not configured");
      }
      
      const coinIds = watchlist.map(item => item.coinId).join(',');
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&sparkline=false&x_cg_demo_api_key=${apiSettings.coinGeckoApiKey}`
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`CoinGecko API error: ${response.status} - ${errorText}`);
      }
      return response.json();
    },
    enabled: !!watchlist && watchlist.length > 0 && !!apiSettings?.coinGeckoApiKey,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Search coins on CoinGecko
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    if (!apiSettings?.coinGeckoApiKey) {
      toast({
        title: "API Key Missing",
        description: "Please configure CoinGecko API key in Admin Panel",
        variant: "destructive",
      });
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${searchQuery}&x_cg_demo_api_key=${apiSettings.coinGeckoApiKey}`
      );
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      const data = await response.json();
      setSearchResults(data.coins?.slice(0, 10) || []);
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search for coins. Check your API key.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Add coin to watchlist
  const addToWatchlistMutation = useMutation({
    mutationFn: async (coin: CoinSearchResult) => {
      if (!sessionId) throw new Error("No session ID");
      return apiRequest("POST", `/api/crypto/watchlist?sessionId=${sessionId}`, {
        coinId: coin.id,
        coinName: coin.name,
        coinSymbol: coin.symbol.toUpperCase(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto/watchlist"] });
      setSearchQuery("");
      setSearchResults([]);
      toast({
        title: "Success",
        description: "Coin added to watchlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add coin to watchlist",
        variant: "destructive",
      });
    },
  });

  // Remove coin from watchlist
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!sessionId) throw new Error("No session ID");
      return apiRequest("DELETE", `/api/crypto/watchlist/${id}?sessionId=${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto/watchlist"] });
      toast({
        title: "Success",
        description: "Coin removed from watchlist",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove coin from watchlist",
        variant: "destructive",
      });
    },
  });

  const getPriceData = (coinId: string) => {
    return coinPrices.find(price => price.id === coinId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    }).format(price);
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(2)}M`;
    }
    return `$${marketCap.toFixed(0)}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bitcoin className="h-8 w-8 text-orange-500" />
            Crypto Watchlist
          </h1>
          <p className="text-muted-foreground mt-1">Track your favorite cryptocurrencies</p>
        </div>
      </div>

      {/* Search and Add Coin */}
      <Card>
        <CardHeader>
          <CardTitle>Add Cryptocurrency</CardTitle>
          <CardDescription>Search and add coins to your watchlist</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for a cryptocurrency (e.g., Bitcoin, Ethereum)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              data-testid="input-search-coin"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              data-testid="button-search-coin"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <><Search className="h-4 w-4 mr-2" /> Search</>
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold text-muted-foreground">Search Results:</p>
              <div className="space-y-2">
                {searchResults.map((coin) => (
                  <div
                    key={coin.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                    data-testid={`search-result-${coin.id}`}
                  >
                    <div>
                      <p className="font-semibold">{coin.name}</p>
                      <p className="text-sm text-muted-foreground">{coin.symbol.toUpperCase()}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addToWatchlistMutation.mutate(coin)}
                      disabled={addToWatchlistMutation.isPending}
                      data-testid={`button-add-${coin.id}`}
                    >
                      Add to Watchlist
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Watchlist Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Watchlist</CardTitle>
          <CardDescription>
            Live prices updated every 30 seconds
          </CardDescription>
        </CardHeader>
        <CardContent>
          {watchlistError ? (
            <div className="text-center py-8">
              <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
                <p className="text-destructive font-medium">Failed to load watchlist</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {(watchlistError as Error).message || "Please check your connection and try again"}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/crypto/watchlist"] })}
                data-testid="button-retry-watchlist"
              >
                Retry
              </Button>
            </div>
          ) : isLoadingWatchlist ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center py-8">
              <Bitcoin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">Your watchlist is empty</p>
              <p className="text-sm text-muted-foreground">Search and add cryptocurrencies above</p>
            </div>
          ) : pricesError ? (
            <div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-yellow-800 font-medium">⚠️ Unable to fetch live prices</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your watchlist is shown below, but prices couldn't be loaded from CoinGecko.
                  {(pricesError as Error).message && ` (${(pricesError as Error).message})`}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/crypto/prices"] })}
                  data-testid="button-retry-prices"
                >
                  Retry Prices
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coin</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">24h Change</TableHead>
                    <TableHead className="text-right">Market Cap</TableHead>
                    <TableHead className="text-right">Volume (24h)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlist.map((item) => (
                    <TableRow key={item.id} data-testid={`watchlist-row-${item.coinId}`}>
                      <TableCell className="font-medium">{item.coinName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.coinSymbol}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right text-muted-foreground">-</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWatchlistMutation.mutate(item.id)}
                          disabled={removeFromWatchlistMutation.isPending}
                          data-testid={`button-remove-${item.coinId}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coin</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">24h Change</TableHead>
                  <TableHead className="text-right">Market Cap</TableHead>
                  <TableHead className="text-right">Volume (24h)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {watchlist.map((item) => {
                  const priceData = getPriceData(item.coinId);
                  const isPositive = priceData ? priceData.price_change_percentage_24h >= 0 : false;

                  return (
                    <TableRow key={item.id} data-testid={`watchlist-row-${item.coinId}`}>
                      <TableCell className="font-medium">{item.coinName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.coinSymbol}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {isLoadingPrices ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : priceData ? (
                          formatPrice(priceData.current_price)
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isLoadingPrices ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : priceData ? (
                          <div className={`flex items-center justify-end gap-1 ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPositive ? (
                              <TrendingUp className="h-4 w-4" />
                            ) : (
                              <TrendingDown className="h-4 w-4" />
                            )}
                            <span className="font-medium">
                              {priceData.price_change_percentage_24h.toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {isLoadingPrices ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : priceData ? (
                          formatMarketCap(priceData.market_cap)
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {isLoadingPrices ? (
                          <Loader2 className="h-4 w-4 animate-spin inline" />
                        ) : priceData ? (
                          formatMarketCap(priceData.total_volume)
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromWatchlistMutation.mutate(item.id)}
                          disabled={removeFromWatchlistMutation.isPending}
                          data-testid={`button-remove-${item.coinId}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
