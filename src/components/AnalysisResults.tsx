import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, ExternalLink, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export interface AnalysisResult {
  url: string;
  prompt: string;
  pageText: string;
  gptAnswer: string;
  similarity: number;
  urlPattern?: string;
}

interface AnalysisResultsProps {
  results: AnalysisResult[];
  onExportCSV: () => void;
}

const getSimilarityLabel = (score: number) => {
  if (score >= 0.8) return { label: 'Excellent', color: 'success', icon: CheckCircle };
  if (score >= 0.7) return { label: 'Good', color: 'info', icon: TrendingUp };
  if (score >= 0.6) return { label: 'Fair', color: 'warning', icon: AlertTriangle };
  return { label: 'Poor', color: 'destructive', icon: AlertTriangle };
};

const CHART_COLORS = ['hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const extractRouteData = (url: string) => {
  const match = url.match(/train-times\/([^\/]+)/);
  if (!match) return { origin: 'Unknown', destination: 'Unknown', route: 'unknown' };
  
  const route = match[1].replace(/\//g, '').toLowerCase();
  if (!route.includes('-to-')) return { origin: 'Unknown', destination: 'Unknown', route };
  
  const [origin, destination] = route.split('-to-');
  return { 
    origin: origin.charAt(0).toUpperCase() + origin.slice(1), 
    destination: destination.charAt(0).toUpperCase() + destination.slice(1),
    route 
  };
};

const getRegion = (location: string): string => {
  const northernCities = ['manchester', 'birmingham', 'liverpool', 'leeds', 'sheffield', 'newcastle'];
  const scottishCities = ['glasgow', 'edinburgh', 'aberdeen', 'dundee'];
  
  if (location.toLowerCase().includes('london')) return 'London';
  if (scottishCities.some(city => location.toLowerCase().includes(city))) return 'Scotland';
  if (northernCities.some(city => location.toLowerCase().includes(city))) return 'Northern England';
  return 'Other';
};

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  results,
  onExportCSV,
}) => {
  if (results.length === 0) return null;

  const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
  
  // Prepare chart data
  const barData = results.map((result, index) => ({
    name: `URL ${index + 1}`,
    similarity: result.similarity,
    url: result.url,
  }));

  // Enhanced analytics data
  const excellent = results.filter(r => r.similarity >= 0.8).length;
  const good = results.filter(r => r.similarity >= 0.7 && r.similarity < 0.8).length;
  const fair = results.filter(r => r.similarity >= 0.6 && r.similarity < 0.7).length;
  const poor = results.filter(r => r.similarity < 0.6).length;

  // Route-based analysis
  const routeAnalysis = results.reduce((acc, result) => {
    const { origin, destination } = extractRouteData(result.url);
    const key = `${origin} to ${destination}`;
    if (!acc[key]) {
      acc[key] = { routes: [], totalScore: 0, count: 0 };
    }
    acc[key].routes.push(result);
    acc[key].totalScore += result.similarity;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { routes: AnalysisResult[]; totalScore: number; count: number }>);

  // Geographic analysis
  const regionAnalysis = results.reduce((acc, result) => {
    const { origin, destination } = extractRouteData(result.url);
    const regions = [getRegion(origin), getRegion(destination)];
    regions.forEach(region => {
      if (!acc[region]) acc[region] = { count: 0, totalScore: 0, urls: [] };
      acc[region].count += 0.5; // Split between origin and destination
      acc[region].totalScore += result.similarity * 0.5;
      acc[region].urls.push(result);
    });
    return acc;
  }, {} as Record<string, { count: number; totalScore: number; urls: AnalysisResult[] }>);

  // Actionable insights
  const criticalIssues = results.filter(r => r.similarity < 0.7);
  const optimizationOpportunities = results.filter(r => r.similarity >= 0.7 && r.similarity < 0.85);

  const pieData = [
    { name: 'Excellent (80-100%)', value: excellent, fill: CHART_COLORS[0] },
    { name: 'Good (70-79%)', value: good, fill: CHART_COLORS[1] },
    { name: 'Fair (60-69%)', value: fair, fill: CHART_COLORS[2] },
    { name: 'Poor (<60%)', value: poor, fill: CHART_COLORS[3] },
  ].filter(item => item.value > 0);

  const regionData = Object.entries(regionAnalysis).map(([region, data]) => ({
    name: region,
    count: Math.round(data.count),
    avgScore: (data.totalScore / data.count) * 100,
    fill: CHART_COLORS[0]
  }));

  const routePerformanceData = Object.entries(routeAnalysis)
    .map(([route, data]) => ({
      route,
      avgScore: (data.totalScore / data.count) * 100,
      count: data.count,
      vsAverage: ((data.totalScore / data.count) - avgSimilarity) * 100
    }))
    .sort((a, b) => b.avgScore - a.avgScore);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            <span className="text-sm font-medium text-muted-foreground">URLs Analyzed</span>
          </div>
          <p className="text-3xl font-bold">{results.length}</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Average Similarity</span>
          </div>
          <p className="text-3xl font-bold">{(avgSimilarity * 100).toFixed(1)}%</p>
        </Card>

        <Card className="p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Export Results</p>
            <Button onClick={onExportCSV} size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Similarity Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { range: '90-100%', count: excellent, fill: CHART_COLORS[0] },
              { range: '80-89%', count: good, fill: CHART_COLORS[1] },
              { range: '70-79%', count: fair, fill: CHART_COLORS[2] },
              { range: '60-69%', count: 0, fill: CHART_COLORS[2] },
              { range: 'Below 60%', count: poor, fill: CHART_COLORS[3] }
            ]}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="range" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} URLs`, 'Count']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success"></div>
              <span>Excellent (80%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-warning"></div>
              <span>Good (60-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive"></div>
              <span>Poor (&lt;60%)</span>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 bg-primary/10 rounded">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">URL Pattern Analysis</h3>
              <p className="text-sm text-muted-foreground">Performance insights by content patterns</p>
            </div>
          </div>
          <div className="space-y-3">
            {routePerformanceData.slice(0, 5).map((route, index) => (
              <div key={index} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{route.route}</span>
                    <span className="text-xs text-muted-foreground">{route.count} URL{route.count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{route.avgScore.toFixed(1)}%</span>
                    <span className={`text-xs ${route.vsAverage >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {route.vsAverage >= 0 ? '+' : ''}{route.vsAverage.toFixed(1)}% vs average
                    </span>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.min(route.avgScore, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Segmentation Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 bg-info/10 rounded">
              <div className="h-4 w-4 bg-info rounded-full"></div>
            </div>
            <div>
              <h3 className="text-lg font-semibold">Segmentation Analysis</h3>
              <p className="text-sm text-muted-foreground">Deep dive into performance by segments</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Geographic</div>
            </div>
            <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="text-sm font-medium text-primary">Performance</div>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Content Type</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium mb-3">Distribution by Region</h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={regionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ name, count }) => `${name}: ${count}`}
                >
                  {regionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} URLs`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6">
          <h4 className="font-medium mb-4">Performance by Region</h4>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={regionData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Avg Score']} />
              <Bar dataKey="avgScore" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Actionable Recommendations */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-1 bg-warning/10 rounded">
            <AlertTriangle className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Actionable Recommendations</h3>
            <p className="text-sm text-muted-foreground">Personalized insights to improve cosine similarity scores</p>
          </div>
        </div>

        <div className="space-y-6">
          {criticalIssues.length > 0 && (
            <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <h4 className="font-semibold text-destructive">
                  {criticalIssues.length} URLs with Critical Similarity Issues
                </h4>
                <Badge variant="destructive">high priority</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These URLs have cosine similarity scores below 70%, indicating significant misalignment between page content and GPT responses.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium">Impact:</span>
                  <Badge variant="destructive" className="ml-2">High</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Effort:</span>
                  <Badge variant="secondary" className="ml-2">Medium</Badge>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Affected URLs:</p>
                <div className="flex flex-wrap gap-2">
                  {criticalIssues.slice(0, 5).map((result, index) => {
                    const { route } = extractRouteData(result.url);
                    return (
                      <Badge key={index} variant="outline" className="text-xs">
                        {route}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Action Items:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Review page content for relevance to search intent</li>
                  <li>• Optimize meta descriptions and page titles</li>
                  <li>• Ensure content directly addresses user queries</li>
                  <li>• Consider content restructuring for better semantic alignment</li>
                </ul>
              </div>
            </div>
          )}

          {optimizationOpportunities.length > 0 && (
            <div className="p-4 border border-info/20 bg-info/5 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-5 w-5 text-info" />
                <h4 className="font-semibold text-info">
                  {optimizationOpportunities.length} URLs Ready for Performance Boost
                </h4>
                <Badge className="bg-info/20 text-info border-info/30">optimization</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                These URLs show good potential (70-85% similarity) and could benefit from targeted optimizations.
              </p>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <span className="text-sm font-medium">Impact:</span>
                  <Badge variant="secondary" className="ml-2">Medium</Badge>
                </div>
                <div>
                  <span className="text-sm font-medium">Effort:</span>
                  <Badge variant="secondary" className="ml-2">Low</Badge>
                </div>
              </div>
              <div className="mb-4">
                <p className="text-sm font-medium mb-2">Affected URLs:</p>
                <div className="flex flex-wrap gap-2">
                  {optimizationOpportunities.slice(0, 5).map((result, index) => {
                    const { route } = extractRouteData(result.url);
                    return (
                      <Badge key={index} variant="outline" className="text-xs">
                        {route}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Action Items:</p>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Add semantic keywords and synonyms</li>
                  <li>• Improve content structure with clear headings</li>
                  <li>• Enhance internal linking to related content</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Detailed Results */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Detailed Analysis Results</h3>
        </div>
        
        <div className="space-y-4">
          {results.map((result, index) => {
            const { label, color, icon: Icon } = getSimilarityLabel(result.similarity);
            return (
              <Card key={index} className="p-4 border-l-4" style={{ borderLeftColor: `hsl(var(--${color}))` }}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <h4 className="font-medium">URL {index + 1}</h4>
                    <Badge variant={color as any}>{label}</Badge>
                    <span className="text-lg font-bold">{(result.similarity * 100).toFixed(1)}%</span>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={result.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">Page Content (Preview)</p>
                    <p className="text-xs bg-muted p-2 rounded truncate">
                      {result.pageText.substring(0, 200)}...
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-muted-foreground mb-1">GPT Response (Preview)</p>
                    <p className="text-xs bg-muted p-2 rounded truncate">
                      {result.gptAnswer.substring(0, 200)}...
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Card>
    </div>
  );
};