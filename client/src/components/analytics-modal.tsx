import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart3, TrendingUp, Globe, Clock, RefreshCw, CheckCircle, XCircle } from "lucide-react";

interface AnalyticsData {
  totalAnalyses: number;
  successfulAnalyses: number;
  failedAnalyses: number;
  successRate: number;
  uniqueWebsites: number;
  averageScore: number;
  uptimeHours: number;
  lastReset: string;
  recentAnalyses: Array<{
    timestamp: string;
    url: string;
    status: 'success' | 'failed';
    loadTime?: number;
    overallScore?: number;
    error?: string;
  }>;
}

export default function AnalyticsModal() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsData = await response.json();
      setData(analyticsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchAnalytics();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Analytics Dashboard</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {loading && !data ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <XCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
              <p className="text-red-600 mb-4">{error}</p>
              <Button onClick={fetchAnalytics} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : data ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.totalAnalyses}</div>
                    <p className="text-xs text-muted-foreground">
                      Since server start ({data.uptimeHours.toFixed(1)} hours ago)
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.successRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {data.successfulAnalyses} successful / {data.failedAnalyses} failed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Unique Websites</CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.uniqueWebsites}</div>
                    <p className="text-xs text-muted-foreground">
                      Different domains analyzed
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{data.averageScore}</div>
                    <p className="text-xs text-muted-foreground">
                      Out of 100 points
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Analyses */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Recent Analyses</CardTitle>
                    <CardDescription>
                      Last 10 website analyses with status and performance
                    </CardDescription>
                  </div>
                  <Button onClick={fetchAnalytics} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {data.recentAnalyses.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No analyses yet. Try analyzing a website to see data here.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {data.recentAnalyses.map((analysis, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            {analysis.status === 'success' ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <div>
                              <p className="font-medium text-sm">{analysis.url}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(analysis.timestamp).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {analysis.status === 'success' ? (
                              <>
                                {analysis.overallScore && (
                                  <Badge variant="secondary" className="text-xs">
                                    Score: {analysis.overallScore}
                                  </Badge>
                                )}
                                {analysis.loadTime && (
                                  <Badge variant="outline" className="text-xs">
                                    {(analysis.loadTime / 1000).toFixed(1)}s
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="destructive" className="text-xs">
                                Failed
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}