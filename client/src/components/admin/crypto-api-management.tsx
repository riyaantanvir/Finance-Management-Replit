import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bitcoin, Key, MessageSquare, Save } from "lucide-react";
import { getAuthState } from "@/lib/auth";

interface CryptoApiSettings {
  id?: string;
  coinGeckoApiKey?: string;
  cryptoNewsApiKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

export function CryptoApiManagement() {
  const [formData, setFormData] = useState({
    coinGeckoApiKey: "",
    cryptoNewsApiKey: "",
    telegramBotToken: "",
    telegramChatId: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const sessionId = localStorage.getItem('sessionId');

  const { data: settings, isLoading } = useQuery<CryptoApiSettings>({
    queryKey: ["/api/crypto/settings"],
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID found");
      const response = await fetch(`/api/crypto/settings?sessionId=${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        coinGeckoApiKey: settings.coinGeckoApiKey || "",
        cryptoNewsApiKey: settings.cryptoNewsApiKey || "",
        telegramBotToken: settings.telegramBotToken || "",
        telegramChatId: settings.telegramChatId || "",
      });
    }
  }, [settings]);

  const saveSettingsMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("PUT", `/api/crypto/settings?sessionId=${sessionId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crypto/settings"] });
      setIsEditing(false);
      toast({
        title: "Success",
        description: "Crypto API settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save crypto API settings",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(formData);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (settings) {
      setFormData({
        coinGeckoApiKey: settings.coinGeckoApiKey || "",
        cryptoNewsApiKey: settings.cryptoNewsApiKey || "",
        telegramBotToken: settings.telegramBotToken || "",
        telegramChatId: settings.telegramChatId || "",
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bitcoin className="h-5 w-5" />
            Crypto API Settings
          </CardTitle>
          <CardDescription>Configure API keys for cryptocurrency data and alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bitcoin className="h-5 w-5" />
          Crypto API Settings
        </CardTitle>
        <CardDescription>
          Configure API keys for CoinGecko, CryptoNews, and Telegram Bot notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CoinGecko API */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold">CoinGecko API</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Get cryptocurrency prices and market data. Free tier: 13M+ tokens, 100 calls/min
          </p>
          <div className="space-y-2">
            <Label htmlFor="coinGeckoApiKey">API Key</Label>
            <Input
              id="coinGeckoApiKey"
              type="password"
              value={formData.coinGeckoApiKey}
              onChange={(e) => setFormData({ ...formData, coinGeckoApiKey: e.target.value })}
              placeholder="Enter CoinGecko API key"
              disabled={!isEditing}
              data-testid="input-coingecko-api-key"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Get your free API key at:{" "}
            <a
              href="https://www.coingecko.com/en/api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              coingecko.com/en/api
            </a>
          </p>
        </div>

        {/* CryptoNews API */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-semibold">CryptoNews API</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Get crypto news with sentiment analysis. Free tier: 100 calls/month
          </p>
          <div className="space-y-2">
            <Label htmlFor="cryptoNewsApiKey">API Key</Label>
            <Input
              id="cryptoNewsApiKey"
              type="password"
              value={formData.cryptoNewsApiKey}
              onChange={(e) => setFormData({ ...formData, cryptoNewsApiKey: e.target.value })}
              placeholder="Enter CryptoNews API key"
              disabled={!isEditing}
              data-testid="input-cryptonews-api-key"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Get your free API key at:{" "}
            <a
              href="https://cryptonews-api.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              cryptonews-api.com
            </a>
          </p>
        </div>

        {/* Telegram Bot */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Telegram Bot (Alerts)</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Receive crypto price alerts via Telegram. Unlimited free notifications
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramBotToken">Bot Token</Label>
              <Input
                id="telegramBotToken"
                type="password"
                value={formData.telegramBotToken}
                onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                placeholder="Enter Telegram bot token"
                disabled={!isEditing}
                data-testid="input-telegram-bot-token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramChatId">Chat ID</Label>
              <Input
                id="telegramChatId"
                value={formData.telegramChatId}
                onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                placeholder="Enter Telegram chat ID"
                disabled={!isEditing}
                data-testid="input-telegram-chat-id"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Create a bot with{" "}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              @BotFather
            </a>{" "}
            on Telegram
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={saveSettingsMutation.isPending}
                data-testid="button-save-crypto-api"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </Button>
              <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-crypto-api">
                Cancel
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit} data-testid="button-edit-crypto-api">
              Edit Settings
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
