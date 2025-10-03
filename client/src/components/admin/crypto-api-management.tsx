import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Bitcoin, Key, MessageSquare, Save, TestTube, CheckCircle, XCircle, Loader2 } from "lucide-react";

interface CryptoApiSettings {
  id?: string;
  coinGeckoApiKey?: string;
  cryptoNewsApiKey?: string;
  telegramBotToken?: string;
  telegramChatId?: string;
}

interface TestStatus {
  tested: boolean;
  connected: boolean;
  message: string;
}

export function CryptoApiManagement() {
  const [formData, setFormData] = useState({
    coinGeckoApiKey: "",
    cryptoNewsApiKey: "",
    telegramBotToken: "",
    telegramChatId: "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    coingecko: TestStatus;
    cryptonews: TestStatus;
    telegram: TestStatus;
  }>({
    coingecko: { tested: false, connected: false, message: "" },
    cryptonews: { tested: false, connected: false, message: "" },
    telegram: { tested: false, connected: false, message: "" },
  });

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
      // If no settings exist yet, start in edit mode
      if (!settings.id) {
        setIsEditing(true);
      }
    }
  }, [settings]);

  // Test CoinGecko mutation
  const testCoinGeckoMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      if (!sessionId) throw new Error("No session ID");
      const response = await apiRequest("POST", `/api/crypto/settings/test-coingecko?sessionId=${sessionId}`, { apiKey });
      return await response.json();
    },
    onSuccess: (result) => {
      setTestStatus(prev => ({
        ...prev,
        coingecko: {
          tested: true,
          connected: result.connected,
          message: result.message
        }
      }));
      toast({
        title: result.connected ? "Success" : "Failed",
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setTestStatus(prev => ({
        ...prev,
        coingecko: {
          tested: true,
          connected: false,
          message: error.message || "Test failed"
        }
      }));
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test CoinGecko connection",
        variant: "destructive",
      });
    },
  });

  // Test CryptoNews mutation
  const testCryptoNewsMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      if (!sessionId) throw new Error("No session ID");
      const response = await apiRequest("POST", `/api/crypto/settings/test-cryptonews?sessionId=${sessionId}`, { apiKey });
      return await response.json();
    },
    onSuccess: (result) => {
      setTestStatus(prev => ({
        ...prev,
        cryptonews: {
          tested: true,
          connected: result.connected,
          message: result.message
        }
      }));
      toast({
        title: result.connected ? "Success" : "Failed",
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setTestStatus(prev => ({
        ...prev,
        cryptonews: {
          tested: true,
          connected: false,
          message: error.message || "Test failed"
        }
      }));
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test CryptoNews connection",
        variant: "destructive",
      });
    },
  });

  // Test Telegram mutation
  const testTelegramMutation = useMutation({
    mutationFn: async (data: { botToken: string; chatId: string }) => {
      if (!sessionId) throw new Error("No session ID");
      const response = await apiRequest("POST", `/api/crypto/settings/test-telegram?sessionId=${sessionId}`, data);
      return await response.json();
    },
    onSuccess: (result) => {
      setTestStatus(prev => ({
        ...prev,
        telegram: {
          tested: true,
          connected: result.connected,
          message: result.message
        }
      }));
      toast({
        title: result.connected ? "Success" : "Failed",
        description: result.message,
        variant: result.connected ? "default" : "destructive",
      });
    },
    onError: (error: any) => {
      setTestStatus(prev => ({
        ...prev,
        telegram: {
          tested: true,
          connected: false,
          message: error.message || "Test failed"
        }
      }));
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test Telegram connection",
        variant: "destructive",
      });
    },
  });

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
    // Reset test status
    setTestStatus({
      coingecko: { tested: false, connected: false, message: "" },
      cryptonews: { tested: false, connected: false, message: "" },
      telegram: { tested: false, connected: false, message: "" },
    });
  };

  const handleTestCoinGecko = () => {
    if (!formData.coinGeckoApiKey) {
      toast({
        title: "Missing API Key",
        description: "Please enter CoinGecko API key first",
        variant: "destructive",
      });
      return;
    }
    testCoinGeckoMutation.mutate(formData.coinGeckoApiKey);
  };

  const handleTestCryptoNews = () => {
    if (!formData.cryptoNewsApiKey) {
      toast({
        title: "Missing API Key",
        description: "Please enter CryptoNews API key first",
        variant: "destructive",
      });
      return;
    }
    testCryptoNewsMutation.mutate(formData.cryptoNewsApiKey);
  };

  const handleTestTelegram = () => {
    if (!formData.telegramBotToken || !formData.telegramChatId) {
      toast({
        title: "Missing Credentials",
        description: "Please enter both Telegram bot token and chat ID first",
        variant: "destructive",
      });
      return;
    }
    testTelegramMutation.mutate({
      botToken: formData.telegramBotToken,
      chatId: formData.telegramChatId,
    });
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
        {!isEditing && !settings?.id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              👉 <strong>Get started:</strong> Click "Edit Settings" below to add your API keys
            </p>
          </div>
        )}

        {/* CoinGecko API */}
        <div className="space-y-4 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-orange-500" />
              <h3 className="text-lg font-semibold">CoinGecko API</h3>
            </div>
            {testStatus.coingecko.tested && (
              <Badge variant={testStatus.coingecko.connected ? "default" : "destructive"}>
                {testStatus.coingecko.connected ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get cryptocurrency prices and market data. Free tier: 13M+ tokens, 100 calls/min
          </p>
          <div className="space-y-2">
            <Label htmlFor="coinGeckoApiKey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="coinGeckoApiKey"
                type="text"
                value={formData.coinGeckoApiKey}
                onChange={(e) => setFormData({ ...formData, coinGeckoApiKey: e.target.value })}
                placeholder="Enter CoinGecko API key"
                disabled={!isEditing}
                data-testid="input-coingecko-api-key"
                className="flex-1"
              />
              {isEditing && (
                <Button
                  onClick={handleTestCoinGecko}
                  disabled={testCoinGeckoMutation.isPending || !formData.coinGeckoApiKey}
                  variant="outline"
                  data-testid="button-test-coingecko"
                >
                  {testCoinGeckoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><TestTube className="h-4 w-4 mr-2" /> Test</>
                  )}
                </Button>
              )}
            </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-5 w-5 text-blue-500" />
              <h3 className="text-lg font-semibold">CryptoNews API</h3>
            </div>
            {testStatus.cryptonews.tested && (
              <Badge variant={testStatus.cryptonews.connected ? "default" : "destructive"}>
                {testStatus.cryptonews.connected ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Get crypto news with sentiment analysis. Free tier: 100 calls/month
          </p>
          <div className="space-y-2">
            <Label htmlFor="cryptoNewsApiKey">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="cryptoNewsApiKey"
                type="text"
                value={formData.cryptoNewsApiKey}
                onChange={(e) => setFormData({ ...formData, cryptoNewsApiKey: e.target.value })}
                placeholder="Enter CryptoNews API key"
                disabled={!isEditing}
                data-testid="input-cryptonews-api-key"
                className="flex-1"
              />
              {isEditing && (
                <Button
                  onClick={handleTestCryptoNews}
                  disabled={testCryptoNewsMutation.isPending || !formData.cryptoNewsApiKey}
                  variant="outline"
                  data-testid="button-test-cryptonews"
                >
                  {testCryptoNewsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><TestTube className="h-4 w-4 mr-2" /> Test</>
                  )}
                </Button>
              )}
            </div>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold">Telegram Bot (Alerts)</h3>
            </div>
            {testStatus.telegram.tested && (
              <Badge variant={testStatus.telegram.connected ? "default" : "destructive"}>
                {testStatus.telegram.connected ? (
                  <><CheckCircle className="h-3 w-3 mr-1" /> Connected</>
                ) : (
                  <><XCircle className="h-3 w-3 mr-1" /> Failed</>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Receive crypto price alerts via Telegram. Unlimited free notifications
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegramBotToken">Bot Token</Label>
              <Input
                id="telegramBotToken"
                type="text"
                value={formData.telegramBotToken}
                onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                placeholder="Enter Telegram bot token"
                disabled={!isEditing}
                data-testid="input-telegram-bot-token"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telegramChatId">Chat ID</Label>
              <div className="flex gap-2">
                <Input
                  id="telegramChatId"
                  type="text"
                  value={formData.telegramChatId}
                  onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                  placeholder="Enter Telegram chat ID"
                  disabled={!isEditing}
                  data-testid="input-telegram-chat-id"
                  className="flex-1"
                />
                {isEditing && (
                  <Button
                    onClick={handleTestTelegram}
                    disabled={testTelegramMutation.isPending || !formData.telegramBotToken || !formData.telegramChatId}
                    variant="outline"
                    data-testid="button-test-telegram"
                  >
                    {testTelegramMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><TestTube className="h-4 w-4 mr-2" /> Test</>
                    )}
                  </Button>
                )}
              </div>
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
                {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
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
