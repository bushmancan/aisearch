import { useState, useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Activity, Users, Globe, TrendingUp, Mail, Shield, Clock, MapPin, Search, Filter, X, Trash2, FileText, ExternalLink, ChevronUp, ChevronDown, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisData {
  id: number;
  url: string;
  status: string;
  overallScore: number | null;
  seoScore: number | null;
  techScore: number | null;
  contentScore: number | null;
  accessibilityScore: number | null;
  originIp: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
  lastRequested?: string; // Last time this analysis was requested (even if cached)
  results?: any;
  isMultiPage?: boolean;
  relatedAnalyses?: AnalysisData[];
}

interface AnalyticsStats {
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function AdminDashboard() {
  const [apiKey, setApiKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [sortField, setSortField] = useState<keyof AnalysisData>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedAnalysis, setSelectedAnalysis] = useState<AnalysisData | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Check if already authenticated
  useEffect(() => {
    const savedKey = localStorage.getItem('admin-api-key');
    const savedSessionId = localStorage.getItem('admin-session-id');
    if (savedKey && savedSessionId) {
      setApiKey(savedKey);
      setSessionId(savedSessionId);
      setIsAuthenticated(true);
    }
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh || !isAuthenticated) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debug/storage'] });
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, isAuthenticated, queryClient]);

  // Session management
  useEffect(() => {
    if (!isAuthenticated || !sessionId) return;
    
    const checkSession = async () => {
      try {
        const response = await fetch('/api/admin/session', {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Admin-Session': sessionId
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSessionInfo(data);
        } else {
          // Session expired
          handleLogout();
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };
    
    // Check session every 5 minutes
    const interval = setInterval(checkSession, 5 * 60 * 1000);
    checkSession(); // Initial check
    
    return () => clearInterval(interval);
  }, [isAuthenticated, sessionId, apiKey]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsStats>({
    queryKey: ['/api/admin/analytics'],
    enabled: isAuthenticated,
    queryFn: async () => {
      const response = await fetch('/api/admin/analytics', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Admin-Session': sessionId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      return response.json();
    },
  });

  const { data: allAnalysesData, isLoading: detailedLoading, refetch: refetchAnalyses } = useQuery<{
    analyses: AnalysisData[];
    totalCount: number;
  }>({
    queryKey: ['/api/debug/storage'],
    enabled: isAuthenticated,
    staleTime: 30000, // 30 seconds - refresh more frequently
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds if enabled
    queryFn: async () => {
      const response = await fetch(`/api/debug/storage?page=1&limit=1000&t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Admin-Session': sessionId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch detailed analytics');
      }
      const data = await response.json();
      return {
        analyses: data.analyses || [],
        totalCount: data.totalCount || 0
      };
    },
  });

  const allAnalyses = allAnalysesData?.analyses || [];
  
  // Client-side pagination
  const totalPages = Math.ceil(allAnalyses.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const detailedAnalytics = allAnalyses.slice(startIndex, endIndex);

  const handleLogin = async () => {
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('admin-api-key', apiKey);
        localStorage.setItem('admin-session-id', data.sessionId);
        setSessionId(data.sessionId);
        setIsAuthenticated(true);
        
        if (data.warning) {
          toast({
            title: "Session Limit Reached",
            description: data.warning,
            variant: "destructive",
          });
        }
        
        toast({
          title: "Success",
          description: `Admin session created (${data.activeSessions}/3 active)`,
        });
      } else {
        const error = await response.json();
        toast({
          title: "Login Failed",
          description: error.error || "Invalid API key",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Network error - please try again",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Admin-Session': sessionId
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    localStorage.removeItem('admin-api-key');
    localStorage.removeItem('admin-session-id');
    setIsAuthenticated(false);
    setApiKey('');
    setSessionId('');
    setSessionInfo(null);
  };

  // Delete analysis mutation
  const deleteAnalysisMutation = useMutation({
    mutationFn: async (analysisId: number) => {
      const response = await fetch(`/api/admin/analyses/${analysisId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Admin-Session': sessionId,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete analysis');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Analysis deleted successfully",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/debug/storage'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete analysis",
        variant: "destructive",
      });
    },
  });

  const handleDeleteAnalysis = (analysisId: number) => {
    if (confirm('Are you sure you want to delete this analysis? This action cannot be undone.')) {
      deleteAnalysisMutation.mutate(analysisId);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Enter your API key to access analytics dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (analyticsLoading || detailedLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const scoreDistribution = detailedAnalytics?.reduce((acc, analysis) => {
    if (analysis.overallScore !== null) {
      const range = analysis.overallScore >= 80 ? '80-100' : 
                   analysis.overallScore >= 60 ? '60-79' : 
                   analysis.overallScore >= 40 ? '40-59' : '0-39';
      acc[range] = (acc[range] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const chartData = Object.entries(scoreDistribution).map(([range, count]) => ({
    range,
    count,
  }));

  // IP address analytics
  const ipData = detailedAnalytics?.reduce((acc, analysis) => {
    if (analysis.originIp && analysis.originIp !== 'unknown') {
      acc[analysis.originIp] = (acc[analysis.originIp] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const topIPs = Object.entries(ipData)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([ip, count]) => ({ ip, count }));

  // Group analyses by domain for multi-page detection
  const groupedAnalyses = detailedAnalytics?.reduce((groups, analysis) => {
    try {
      const domain = new URL(analysis.url).hostname;
      const timeWindow = 10 * 60 * 1000; // 10 minutes
      const analysisTime = new Date(analysis.createdAt).getTime();
      
      // Find existing group within time window
      let group = groups.find(g => 
        g.domain === domain && 
        Math.abs(g.latestTime - analysisTime) < timeWindow
      );
      
      if (!group) {
        group = {
          domain,
          analyses: [],
          latestTime: analysisTime,
          isMultiPage: false
        };
        groups.push(group);
      }
      
      group.analyses.push(analysis);
      group.latestTime = Math.max(group.latestTime, analysisTime);
      group.isMultiPage = group.analyses.length > 1;
      
      return groups;
    } catch {
      // If URL parsing fails, treat as individual analysis
      return [...groups, { 
        domain: analysis.url, 
        analyses: [analysis], 
        latestTime: new Date(analysis.createdAt).getTime(),
        isMultiPage: false 
      }];
    }
  }, [] as Array<{domain: string, analyses: AnalysisData[], latestTime: number, isMultiPage: boolean}>) || [];

  // Create display entries (primary + related)
  const displayAnalyses = groupedAnalyses.flatMap(group => {
    if (group.isMultiPage) {
      // For multi-page, show primary entry with related analyses
      const primary = group.analyses.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
      
      return [{
        ...primary,
        isMultiPage: true,
        relatedAnalyses: group.analyses.filter(a => a.id !== primary.id)
      }];
    } else {
      // For single page, show as normal
      return group.analyses.map(analysis => ({
        ...analysis,
        isMultiPage: false
      }));
    }
  });

  // Filter and search functionality
  const filteredAnalytics = displayAnalyses.filter(analysis => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      analysis.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (analysis.originIp && analysis.originIp.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Status filter
    const matchesStatus = statusFilter === 'all' || analysis.status === statusFilter;
    
    // Score filter
    const matchesScore = scoreFilter === 'all' || 
      (scoreFilter === 'high' && analysis.overallScore && analysis.overallScore >= 70) ||
      (scoreFilter === 'medium' && analysis.overallScore && analysis.overallScore >= 40 && analysis.overallScore < 70) ||
      (scoreFilter === 'low' && analysis.overallScore && analysis.overallScore < 40) ||
      (scoreFilter === 'null' && analysis.overallScore === null);
    
    return matchesSearch && matchesStatus && matchesScore;
  });

  // Recent activity timeline (using filtered data)
  const recentActivity = filteredAnalytics?.slice(0, 10).map(analysis => ({
    url: analysis.url,
    score: analysis.overallScore,
    date: new Date(analysis.createdAt).toLocaleDateString(),
    status: analysis.status,
  })) || [];

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setScoreFilter('all');
  };

  // Sorting function
  const handleSort = (field: keyof AnalysisData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Sort filtered data
  const sortedAnalytics = [...filteredAnalytics].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Handle row click
  const handleRowClick = (analysis: AnalysisData) => {
    setSelectedAnalysis(analysis);
    setShowAnalysisModal(true);
  };

  // Count active filters
  const activeFilters = (searchTerm ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0) + (scoreFilter !== 'all' ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">Revenue Experts GEO Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Session Info */}
              {sessionInfo && (
                <div className="text-sm text-gray-600">
                  Sessions: {sessionInfo.activeSessions}/{sessionInfo.maxSessions}
                </div>
              )}
              
              {/* Manual Refresh Button */}
              <Button 
                onClick={() => refetchAnalyses()} 
                variant="outline" 
                size="sm"
                disabled={detailedLoading}
              >
                🔄 Refresh Data
              </Button>
              
              {/* Auto-refresh Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoRefresh" className="text-sm text-gray-700">
                  Auto-refresh (30s)
                </label>
              </div>
              
              <Button onClick={handleLogout} variant="outline">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
              {activeFilters > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilters} active
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search URL or IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Score Filter */}
              <Select value={scoreFilter} onValueChange={setScoreFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Scores</SelectItem>
                  <SelectItem value="high">High (80-100)</SelectItem>
                  <SelectItem value="medium">Medium (60-79)</SelectItem>
                  <SelectItem value="low">Low (0-59)</SelectItem>
                  <SelectItem value="null">No Score</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Clear Filters */}
              <Button 
                variant="outline" 
                onClick={clearFilters}
                disabled={activeFilters === 0}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
            
            {/* Filter Results Summary */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredAnalytics.length} of {allAnalyses?.length || 0} analyses
              <span className="ml-4 text-blue-600">
                • Latest database update: {allAnalyses[0]?.createdAt ? new Date(allAnalyses[0].createdAt).toLocaleString() : 'No data'}
              </span>
              <div className="mt-1 text-xs text-amber-600">
                ⚠️ Note: Repeated analyses of same URLs within 24 hours return cached results (no new database records)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalAnalyses || 0}</div>
              <p className="text-xs text-muted-foreground">
                {analytics?.successRate || 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Websites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.uniqueWebsites || 0}</div>
              <p className="text-xs text-muted-foreground">
                Different domains analyzed
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.averageScore || 0}/100</div>
              <p className="text-xs text-muted-foreground">
                LLM visibility score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.uptimeHours || 0}h</div>
              <p className="text-xs text-muted-foreground">
                Since last reset
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Score Distribution</CardTitle>
              <CardDescription>Website performance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top IP Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Top IP Addresses</CardTitle>
              <CardDescription>Most active analysis sources</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topIPs.map(({ ip, count }) => (
                  <div key={ip} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-mono">{ip}</span>
                    </div>
                    <Badge variant="secondary">{count} analyses</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Table */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Records</CardTitle>
            <CardDescription>
              Showing {filteredAnalytics.length} of {allAnalysesData?.totalCount || 0} total analyses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">
                      <button 
                        onClick={() => handleSort('url')}
                        className="flex items-center gap-1 hover:text-blue-600 font-medium"
                      >
                        URL
                        {sortField === 'url' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-2">
                      <button 
                        onClick={() => handleSort('status')}
                        className="flex items-center gap-1 hover:text-blue-600 font-medium"
                      >
                        Status
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-2">
                      <button 
                        onClick={() => handleSort('overallScore')}
                        className="flex items-center gap-1 hover:text-blue-600 font-medium"
                      >
                        Score
                        {sortField === 'overallScore' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-2">
                      <button 
                        onClick={() => handleSort('originIp')}
                        className="flex items-center gap-1 hover:text-blue-600 font-medium"
                      >
                        IP Address
                        {sortField === 'originIp' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-2">
                      <button 
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center gap-1 hover:text-blue-600 font-medium"
                      >
                        Created
                        {sortField === 'createdAt' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-2">
                      <button 
                        onClick={() => handleSort('lastRequested')}
                        className="flex items-center gap-1 hover:text-blue-600 font-medium"
                      >
                        Last Requested
                        {sortField === 'lastRequested' && (
                          sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="text-left p-2">Report</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAnalytics.map((analysis) => (
                    <tr 
                      key={analysis.id} 
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(analysis)}
                    >
                      <td className="p-2">
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-gray-500" />
                          <span className="font-medium truncate max-w-xs" title={analysis.url}>
                            {analysis.url}
                          </span>
                          {analysis.isMultiPage && (
                            <Badge variant="secondary" className="text-xs">
                              Multi-page ({(analysis.relatedAnalyses?.length || 0) + 1} pages)
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="p-2">
                        <Badge variant={
                          analysis.status === 'completed' ? "default" : 
                          analysis.status === 'failed' ? "destructive" : "secondary"
                        }>
                          {analysis.status}
                        </Badge>
                      </td>
                      <td className="p-2">
                        {analysis.overallScore !== null ? (
                          <Badge variant={
                            analysis.overallScore >= 70 ? "default" : 
                            analysis.overallScore >= 40 ? "secondary" : "destructive"
                          }>
                            {analysis.overallScore}/100
                          </Badge>
                        ) : (
                          <span className="text-gray-400">No score</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className="font-mono text-xs">
                          {analysis.originIp || 'unknown'}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="text-xs text-gray-500">
                          {new Date(analysis.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="p-2">
                        <span className="text-xs text-gray-500">
                          {analysis.lastRequested ? new Date(analysis.lastRequested).toLocaleDateString() : 'Never'}
                        </span>
                        {analysis.lastRequested && new Date(analysis.lastRequested) > new Date(analysis.createdAt) && (
                          <div className="text-xs text-blue-600 font-medium">
                            (Cached)
                          </div>
                        )}
                      </td>
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        {analysis.results && analysis.status === 'completed' ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-xs">
                                <FileText className="h-3 w-3 mr-1" />
                                View Report
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh]">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <ExternalLink className="h-4 w-4" />
                                  Analysis Report for {analysis.url}
                                  {analysis.isMultiPage && (
                                    <Badge variant="secondary" className="text-xs">
                                      Multi-page ({(analysis.relatedAnalyses?.length || 0) + 1} pages)
                                    </Badge>
                                  )}
                                </DialogTitle>
                              </DialogHeader>
                              <ScrollArea className="h-[60vh]">
                                <div className="space-y-6 pr-4">
                                  {/* Multi-Page Report Section */}
                                  {analysis.isMultiPage && analysis.relatedAnalyses && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                      <h3 className="font-semibold mb-2">Multi-Page Analysis Summary</h3>
                                      <div className="space-y-2">
                                        <div className="text-sm text-gray-700">
                                          <strong>Total Pages Analyzed:</strong> {(analysis.relatedAnalyses.length || 0) + 1}
                                        </div>
                                        <div className="text-sm text-gray-700">
                                          <strong>Primary Page:</strong> {analysis.url}
                                        </div>
                                        <div className="text-sm text-gray-700">
                                          <strong>Related Pages:</strong>
                                          <ul className="list-disc list-inside ml-4 mt-1">
                                            {analysis.relatedAnalyses.map((related, idx) => (
                                              <li key={idx}>{related.url}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Overall Scores */}
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                      <div className="text-2xl font-bold text-blue-600">{analysis.results.overallScore || 0}</div>
                                      <div className="text-sm text-gray-600">Overall Score</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                      <div className="text-2xl font-bold text-green-600">{analysis.results.seoScore || 0}</div>
                                      <div className="text-sm text-gray-600">AI/LLM Visibility</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                                      <div className="text-2xl font-bold text-purple-600">{analysis.results.techScore || 0}</div>
                                      <div className="text-sm text-gray-600">Tech Score</div>
                                    </div>
                                    <div className="text-center p-3 bg-orange-50 rounded-lg">
                                      <div className="text-2xl font-bold text-orange-600">{analysis.results.contentScore || 0}</div>
                                      <div className="text-sm text-gray-600">Content Score</div>
                                    </div>
                                  </div>

                                  {/* Narrative Report */}
                                  {analysis.results.narrativeReport && (
                                    <div className="bg-gray-50 p-4 rounded-lg">
                                      <h3 className="font-semibold mb-2">Analysis Summary</h3>
                                      <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                        {analysis.results.narrativeReport}
                                      </div>
                                    </div>
                                  )}

                                  {/* Technical Details */}
                                  {analysis.results.technicalSeo && (
                                    <div className="bg-blue-50 p-4 rounded-lg">
                                      <h3 className="font-semibold mb-2">Technical SEO</h3>
                                      <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>HTTPS: {analysis.results.technicalSeo.https ? '✅' : '❌'}</div>
                                        <div>Mobile Optimized: {analysis.results.technicalSeo.mobileOptimized ? '✅' : '❌'}</div>
                                        <div>Page Speed: {analysis.results.technicalSeo.pageSpeed}</div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Recommendations */}
                                  {analysis.results.recommendations && (
                                    <div className="space-y-4">
                                      <h3 className="font-semibold">Recommendations</h3>
                                      {analysis.results.recommendations.high && analysis.results.recommendations.high.length > 0 && (
                                        <div className="bg-red-50 p-4 rounded-lg">
                                          <h4 className="font-medium text-red-700 mb-2">High Priority</h4>
                                          <ul className="text-sm space-y-1">
                                            {analysis.results.recommendations.high.map((rec: any, index: number) => (
                                              <li key={index} className="flex items-start gap-2">
                                                <span className="text-red-500">•</span>
                                                <div>
                                                  <strong>{rec.title}</strong>
                                                  <p className="text-gray-600">{rec.description}</p>
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                      {analysis.results.recommendations.medium && analysis.results.recommendations.medium.length > 0 && (
                                        <div className="bg-yellow-50 p-4 rounded-lg">
                                          <h4 className="font-medium text-yellow-700 mb-2">Medium Priority</h4>
                                          <ul className="text-sm space-y-1">
                                            {analysis.results.recommendations.medium.map((rec: any, index: number) => (
                                              <li key={index} className="flex items-start gap-2">
                                                <span className="text-yellow-500">•</span>
                                                <div>
                                                  <strong>{rec.title}</strong>
                                                  <p className="text-gray-600">{rec.description}</p>
                                                </div>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Multi-Page PDF Generation */}
                                  {analysis.isMultiPage && analysis.relatedAnalyses && (
                                    <div className="bg-green-50 p-4 rounded-lg">
                                      <h3 className="font-semibold mb-2">Multi-Page PDF Report</h3>
                                      <p className="text-sm text-gray-700 mb-3">
                                        Generate a consolidated PDF report that includes analysis results from all {(analysis.relatedAnalyses.length || 0) + 1} pages.
                                      </p>
                                      <Button 
                                        onClick={() => {
                                          // TODO: Implement multi-page PDF generation
                                          toast({
                                            title: "Feature Coming Soon",
                                            description: "Multi-page PDF generation will be available soon.",
                                          });
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Generate Multi-Page PDF
                                      </Button>
                                    </div>
                                  )}

                                  {/* Raw Data for Debug */}
                                  <details className="bg-gray-100 p-4 rounded-lg">
                                    <summary className="cursor-pointer font-medium">Raw Analysis Data</summary>
                                    <pre className="text-xs mt-2 overflow-x-auto bg-white p-2 rounded border">
                                      {JSON.stringify(analysis.results, null, 2)}
                                    </pre>
                                  </details>
                                </div>
                              </ScrollArea>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-xs text-gray-400">No report</span>
                        )}
                      </td>
                      <td className="p-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteAnalysis(analysis.id)}
                          className="text-xs"
                          disabled={deleteAnalysisMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredAnalytics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No analyses match your current filters.
                </div>
              )}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Showing {startIndex + 1} to {Math.min(endIndex, allAnalyses.length)} of {allAnalyses.length} results
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Select value={pageSize.toString()} onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-700">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Row Click Analysis Modal */}
        <Dialog open={showAnalysisModal} onOpenChange={setShowAnalysisModal}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Analysis Details: {selectedAnalysis?.url}
              </DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[70vh]">
              {selectedAnalysis && (
                <div className="space-y-6 pr-4">
                  {/* Analysis Metadata */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Analysis Information</h3>
                      <div className="text-sm space-y-1">
                        <div><strong>Status:</strong> {selectedAnalysis.status}</div>
                        <div><strong>Created:</strong> {new Date(selectedAnalysis.createdAt).toLocaleString()}</div>
                        <div><strong>Updated:</strong> {new Date(selectedAnalysis.updatedAt).toLocaleString()}</div>
                        <div><strong>IP Address:</strong> {selectedAnalysis.originIp || 'Unknown'}</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-gray-900">Scores</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-lg font-bold text-blue-600">{selectedAnalysis.overallScore || 'N/A'}</div>
                          <div className="text-xs text-gray-600">Overall</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="text-lg font-bold text-green-600">{selectedAnalysis.seoScore || 'N/A'}</div>
                          <div className="text-xs text-gray-600">AI/LLM Visibility</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-lg font-bold text-purple-600">{selectedAnalysis.techScore || 'N/A'}</div>
                          <div className="text-xs text-gray-600">Technical Score</div>
                        </div>
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <div className="text-lg font-bold text-orange-600">{selectedAnalysis.contentScore || 'N/A'}</div>
                          <div className="text-xs text-gray-600">Content Score</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Analysis Results */}
                  {selectedAnalysis.results && selectedAnalysis.status === 'completed' ? (
                    <div className="space-y-4">
                      {/* Narrative Report */}
                      {selectedAnalysis.results.narrativeReport && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium mb-2">Analysis Summary</h3>
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">
                            {selectedAnalysis.results.narrativeReport}
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(selectedAnalysis.url, '_blank');
                          }}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Website
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const data = {
                              url: selectedAnalysis.url,
                              scores: {
                                overall: selectedAnalysis.overallScore,
                                aiVisibility: selectedAnalysis.seoScore,
                                tech: selectedAnalysis.techScore,
                                content: selectedAnalysis.contentScore
                              },
                              results: selectedAnalysis.results
                            };
                            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `analysis-${selectedAnalysis.id}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Report
                        </Button>
                      </div>

                      {/* Raw Data */}
                      <details className="bg-gray-100 p-4 rounded-lg">
                        <summary className="cursor-pointer font-medium mb-2">Raw Analysis Data</summary>
                        <pre className="text-xs mt-2 overflow-x-auto bg-white p-2 rounded border">
                          {JSON.stringify(selectedAnalysis.results, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {selectedAnalysis.status === 'failed' ? 'Analysis failed' : 'Analysis is still in progress'}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* IP Detection Test */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>IP Detection Test</CardTitle>
            <CardDescription>Test the enhanced IP detection system</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={async () => {
                try {
                  const response = await fetch('/api/debug/ip', {
                    headers: {
                      'Authorization': `Bearer ${apiKey}`,
                    },
                  });
                  const data = await response.json();
                  alert(`Detected IP: ${data.detectedIP}\nIframe: ${data.isIframe ? 'Yes' : 'No'}\nEnvironment: ${data.environment}`);
                } catch (error) {
                  alert('Failed to test IP detection');
                }
              }}
              className="mb-4"
            >
              Test IP Detection
            </Button>
          </CardContent>
        </Card>

        {/* System Status */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Last updated: {new Date().toLocaleString()}</p>
          <p>Analytics system operational since {analytics?.lastReset ? new Date(analytics.lastReset).toLocaleString() : 'unknown'}</p>
        </div>
      </div>
    </div>
  );
}