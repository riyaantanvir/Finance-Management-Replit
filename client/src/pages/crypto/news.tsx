import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, ExternalLink, Loader2, Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NewsArticle {
  news_url: string;
  image_url: string;
  title: string;
  text: string;
  source_name: string;
  date: string;
  topics: string[];
  sentiment: string;
  type: string;
  tickers: string[];
}

interface CryptoNewsResponse {
  data: NewsArticle[];
  total_results: number;
}

export default function NewsPage() {
  const [sentimentFilter, setSentimentFilter] = useState<string>("all");
  const sessionId = localStorage.getItem('sessionId');

  // Fetch crypto API settings to get the API key
  const { data: settings } = useQuery<{ cryptoNewsApiKey?: string }>({
    queryKey: ["/api/crypto/settings"],
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID");
      const response = await fetch(`/api/crypto/settings?sessionId=${sessionId}`);
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    enabled: !!sessionId,
  });

  // Fetch crypto news from CryptoNews API
  const { data: newsData, isLoading, error } = useQuery<CryptoNewsResponse>({
    queryKey: ["/api/crypto/news", settings?.cryptoNewsApiKey],
    queryFn: async () => {
      if (!settings?.cryptoNewsApiKey) {
        throw new Error("CryptoNews API key not configured");
      }

      const response = await fetch(
        `https://cryptonews-api.com/api/v1?tickers=BTC,ETH,BNB,SOL,ADA,XRP&items=50&token=${settings.cryptoNewsApiKey}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch crypto news");
      }

      return response.json();
    },
    enabled: !!settings?.cryptoNewsApiKey,
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
      case "bullish":
        return "bg-green-100 text-green-800 border-green-200";
      case "negative":
      case "bearish":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case "positive":
      case "bullish":
        return <TrendingUp className="h-3 w-3" />;
      case "negative":
      case "bearish":
        return <TrendingDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  const filteredNews = newsData?.data?.filter((article) => {
    if (sentimentFilter === "all") return true;
    return article.sentiment?.toLowerCase() === sentimentFilter.toLowerCase();
  }) || [];

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
      } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
      } else if (diffDays < 7) {
        return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Newspaper className="h-8 w-8 text-blue-500" />
            Crypto News
          </h1>
          <p className="text-muted-foreground mt-1">Latest cryptocurrency news with sentiment analysis</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter News
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <label className="text-sm font-medium">Sentiment:</label>
            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-48" data-testid="select-sentiment-filter">
                <SelectValue placeholder="All sentiments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiments</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>
            {sentimentFilter !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSentimentFilter("all")}
                data-testid="button-clear-filter"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* News Feed */}
      {!settings?.cryptoNewsApiKey ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">CryptoNews API not configured</p>
              <p className="text-sm text-muted-foreground mt-1">
                Go to Admin Panel → Crypto API to add your API key
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading news...</span>
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <p className="text-destructive font-medium">Failed to load news</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check your API key configuration
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredNews.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No news articles found
                {sentimentFilter !== "all" && ` with ${sentimentFilter} sentiment`}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredNews.map((article, index) => (
            <Card
              key={`${article.news_url}-${index}`}
              className="hover:shadow-lg transition-shadow"
              data-testid={`news-article-${index}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-xl line-clamp-2">
                      {article.title}
                    </CardTitle>
                    <CardDescription className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="text-sm">{article.source_name}</span>
                      <span>•</span>
                      <span className="text-sm">{formatDate(article.date)}</span>
                      {article.sentiment && (
                        <>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className={`${getSentimentColor(article.sentiment)} flex items-center gap-1`}
                          >
                            {getSentimentIcon(article.sentiment)}
                            {article.sentiment}
                          </Badge>
                        </>
                      )}
                    </CardDescription>
                  </div>
                  {article.image_url && (
                    <img
                      src={article.image_url}
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded-md"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground line-clamp-3 mb-4">
                  {article.text}
                </p>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {article.tickers?.slice(0, 3).map((ticker) => (
                      <Badge key={ticker} variant="secondary">
                        {ticker}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    data-testid={`button-read-more-${index}`}
                  >
                    <a
                      href={article.news_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      Read More
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredNews.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          Showing {filteredNews.length} article{filteredNews.length !== 1 ? 's' : ''}
          {sentimentFilter !== "all" && ` with ${sentimentFilter} sentiment`}
        </div>
      )}
    </div>
  );
}
