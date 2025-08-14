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
  matchFound?: boolean;
  idealPrompt?: string;
  intentType?: 'Informational' | 'Transactional' | 'Navigational' | 'Mixed';
  priorityScore?: number;
  keywordGaps?: string[];
  entityMismatch?: boolean;
  sentenceStructureIssue?: boolean;
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

const analyzeSemanticGaps = (pageText: string, gptAnswer: string): {
  keywordGaps: string[];
  entityMismatch: boolean;
  sentenceStructureIssue: boolean;
} => {
  const criticalKeywords = ['book', 'cheap', 'price', 'ticket', 'eurostar', 'omio', 'trainline', 'schedule', 'journey'];
  const pageWords = pageText.toLowerCase().split(/\s+/);
  const gptWords = gptAnswer.toLowerCase().split(/\s+/);
  
  const keywordGaps = criticalKeywords.filter(keyword => 
    gptWords.includes(keyword) && !pageWords.includes(keyword)
  );
  
  const entities = {
    page: {
      hasTrainline: pageText.toLowerCase().includes('trainline'),
      hasEurostar: pageText.toLowerCase().includes('eurostar'),
      hasOmio: pageText.toLowerCase().includes('omio')
    },
    gpt: {
      hasTrainline: gptAnswer.toLowerCase().includes('trainline'),
      hasEurostar: gptAnswer.toLowerCase().includes('eurostar'), 
      hasOmio: gptAnswer.toLowerCase().includes('omio')
    }
  };
  
  const entityMismatch = 
    (entities.gpt.hasEurostar && entities.page.hasTrainline) ||
    (entities.gpt.hasOmio && entities.page.hasTrainline) ||
    (entities.gpt.hasTrainline && (entities.page.hasEurostar || entities.page.hasOmio));
  
  const pageHasPricing = /price|cost|£|\$|fare|cheap|expensive/.test(pageText.toLowerCase());
  const gptHasPricing = /price|cost|£|\$|fare|cheap|expensive/.test(gptAnswer.toLowerCase());
  const pageHasVague = /you can travel|journey from|route between/.test(pageText.toLowerCase());
  
  const sentenceStructureIssue = !pageHasPricing && gptHasPricing && pageHasVague;
  
  return { keywordGaps, entityMismatch, sentenceStructureIssue };
};

const classifyIntent = (prompt: string, pageText: string): 'Informational' | 'Transactional' | 'Navigational' | 'Mixed' => {
  const transactionalKeywords = ['buy', 'book', 'cheap', 'price', 'ticket', 'online', 'purchase'];
  const informationalKeywords = ['how', 'what', 'when', 'schedule', 'duration', 'route', 'info'];
  const navigationalKeywords = ['trainline', 'website', 'official', 'login', 'account'];
  
  const text = (prompt + ' ' + pageText).toLowerCase();
  
  const transactionalCount = transactionalKeywords.filter(kw => text.includes(kw)).length;
  const informationalCount = informationalKeywords.filter(kw => text.includes(kw)).length;
  const navigationalCount = navigationalKeywords.filter(kw => text.includes(kw)).length;
  
  if (transactionalCount > 0 && informationalCount > 0) return 'Mixed';
  if (transactionalCount > informationalCount && transactionalCount > navigationalCount) return 'Transactional';
  if (informationalCount > navigationalCount) return 'Informational';
  return 'Navigational';
};

const calculatePriorityScore = (result: AnalysisResult): number => {
  let score = 50; // Base score
  
  // Similarity impact (lower similarity = higher priority)
  score += (1 - result.similarity) * 40;
  
  // Intent type impact
  if (result.intentType === 'Transactional') score += 20;
  if (result.intentType === 'Mixed') score += 15;
  
  // Keyword gaps impact
  if (result.keywordGaps && result.keywordGaps.length > 0) score += result.keywordGaps.length * 5;
  
  // Entity mismatch impact
  if (result.entityMismatch) score += 15;
  
  // Sentence structure issues
  if (result.sentenceStructureIssue) score += 10;
  
  return Math.min(score, 100);
};

export const AnalysisResults: React.FC<AnalysisResultsProps> = ({
  results,
  onExportCSV,
}) => {
  if (results.length === 0) return null;

  // Enhanced analysis with new features
  const enhancedResults = results.map(result => {
    const semanticAnalysis = analyzeSemanticGaps(result.pageText, result.gptAnswer);
    const intentType = classifyIntent(result.prompt, result.pageText);
    const matchFound = result.prompt && result.gptAnswer ? true : false;
    const idealPrompt = result.urlPattern || extractRouteData(result.url).route.replace('-', ' ');
    
    const enhanced = {
      ...result,
      ...semanticAnalysis,
      intentType,
      matchFound,
      idealPrompt,
      priorityScore: 0
    };
    
    enhanced.priorityScore = calculatePriorityScore(enhanced);
    return enhanced;
  });

  const avgSimilarity = enhancedResults.reduce((sum, r) => sum + r.similarity, 0) / enhancedResults.length;
  
  // New Analytics Data
  const matchFoundCount = enhancedResults.filter(r => r.matchFound).length;
  const noMatchCount = enhancedResults.length - matchFoundCount;
  
  const intentDistribution = enhancedResults.reduce((acc, r) => {
    acc[r.intentType!] = (acc[r.intentType!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const semanticIssues = {
    keywordGaps: enhancedResults.filter(r => r.keywordGaps!.length > 0).length,
    entityMismatch: enhancedResults.filter(r => r.entityMismatch).length,
    structureIssues: enhancedResults.filter(r => r.sentenceStructureIssue).length
  };
  
  const priorityBuckets = {
    fixNow: enhancedResults.filter(r => r.priorityScore! >= 80).length,
    fixLater: enhancedResults.filter(r => r.priorityScore! >= 60 && r.priorityScore! < 80).length,
    monitor: enhancedResults.filter(r => r.priorityScore! < 60).length
  };

  // Prepare chart data
  const barData = enhancedResults.map((result, index) => ({
    name: `URL ${index + 1}`,
    similarity: result.similarity,
    priority: result.priorityScore,
    url: result.url,
  }));

  // Enhanced analytics data
  const excellent = enhancedResults.filter(r => r.similarity >= 0.8).length;
  const good = enhancedResults.filter(r => r.similarity >= 0.7 && r.similarity < 0.8).length;
  const fair = enhancedResults.filter(r => r.similarity >= 0.6 && r.similarity < 0.7).length;
  const poor = enhancedResults.filter(r => r.similarity < 0.6).length;

  // Route-based analysis
  const routeAnalysis = enhancedResults.reduce((acc, result) => {
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
  const regionAnalysis = enhancedResults.reduce((acc, result) => {
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
  const criticalIssues = enhancedResults.filter(r => r.similarity < 0.7);
  const optimizationOpportunities = enhancedResults.filter(r => r.similarity >= 0.7 && r.similarity < 0.85);

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-2 w-2 rounded-full bg-primary"></div>
            <span className="text-sm font-medium text-muted-foreground">URLs Analyzed</span>
          </div>
          <p className="text-3xl font-bold">{enhancedResults.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {matchFoundCount} with GPT match, {noMatchCount} missing
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Average Similarity</span>
          </div>
          <p className="text-3xl font-bold">{(avgSimilarity * 100).toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">
            {semanticIssues.keywordGaps + semanticIssues.entityMismatch + semanticIssues.structureIssues} semantic issues
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-muted-foreground">Priority Actions</span>
          </div>
          <p className="text-3xl font-bold">{priorityBuckets.fixNow}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Critical / {priorityBuckets.fixLater} medium / {priorityBuckets.monitor} monitor
          </p>
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

      {/* New Advanced Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Prompt Coverage Analysis</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Match Found</span>
              <div className="flex items-center gap-2">
                <Badge variant={matchFoundCount > 0 ? "default" : "destructive"}>
                  {matchFoundCount}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {((matchFoundCount / enhancedResults.length) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Missing Coverage</span>
              <div className="flex items-center gap-2">
                <Badge variant={noMatchCount > 0 ? "destructive" : "default"}>
                  {noMatchCount}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {((noMatchCount / enhancedResults.length) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            {noMatchCount > 0 && (
              <div className="p-3 bg-destructive/10 rounded-lg">
                <p className="text-sm font-medium text-destructive mb-2">Missing Ideal Prompts:</p>
                <div className="space-y-1">
                  {enhancedResults.filter(r => !r.matchFound).slice(0, 3).map((result, i) => (
                    <div key={i} className="text-xs text-muted-foreground">
                      "{result.idealPrompt}"
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Intent Classification</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={Object.entries(intentDistribution).map(([intent, count]) => ({
                  name: intent,
                  value: count,
                  fill: CHART_COLORS[Object.keys(intentDistribution).indexOf(intent) % CHART_COLORS.length]
                }))}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {Object.entries(intentDistribution).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Semantic Issues</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Keyword Gaps</span>
              <Badge variant={semanticIssues.keywordGaps > 0 ? "destructive" : "default"}>
                {semanticIssues.keywordGaps}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Entity Mismatch</span>
              <Badge variant={semanticIssues.entityMismatch > 0 ? "destructive" : "default"}>
                {semanticIssues.entityMismatch}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Structure Issues</span>
              <Badge variant={semanticIssues.structureIssues > 0 ? "destructive" : "default"}>
                {semanticIssues.structureIssues}
              </Badge>
            </div>
            {(semanticIssues.keywordGaps + semanticIssues.entityMismatch + semanticIssues.structureIssues) > 0 && (
              <div className="p-3 bg-warning/10 rounded-lg">
                <p className="text-sm font-medium text-warning mb-2">Common Issues:</p>
                <div className="space-y-1 text-xs text-muted-foreground">
                  {semanticIssues.keywordGaps > 0 && <div>• Missing key booking terms</div>}
                  {semanticIssues.entityMismatch > 0 && <div>• Brand/platform confusion</div>}
                  {semanticIssues.structureIssues > 0 && <div>• Vague vs specific language</div>}
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Priority Action Matrix */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Priority Action Matrix</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <h4 className="font-medium text-destructive">Fix Now</h4>
            </div>
            <p className="text-2xl font-bold text-destructive">{priorityBuckets.fixNow}</p>
            <p className="text-xs text-muted-foreground">Priority Score: 80-100</p>
            <div className="mt-2">
              {enhancedResults
                .filter(r => r.priorityScore! >= 80)
                .slice(0, 3)
                .map((result, i) => (
                  <div key={i} className="text-xs p-1 bg-white rounded mb-1">
                    {extractRouteData(result.url).route} ({(result.similarity * 100).toFixed(0)}%)
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 border border-warning/20 bg-warning/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-warning" />
              <h4 className="font-medium text-warning">Fix Later</h4>
            </div>
            <p className="text-2xl font-bold text-warning">{priorityBuckets.fixLater}</p>
            <p className="text-xs text-muted-foreground">Priority Score: 60-79</p>
            <div className="mt-2">
              {enhancedResults
                .filter(r => r.priorityScore! >= 60 && r.priorityScore! < 80)
                .slice(0, 3)
                .map((result, i) => (
                  <div key={i} className="text-xs p-1 bg-white rounded mb-1">
                    {extractRouteData(result.url).route} ({(result.similarity * 100).toFixed(0)}%)
                  </div>
                ))}
            </div>
          </div>

          <div className="p-4 border border-success/20 bg-success/5 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <h4 className="font-medium text-success">Monitor</h4>
            </div>
            <p className="text-2xl font-bold text-success">{priorityBuckets.monitor}</p>
            <p className="text-xs text-muted-foreground">Priority Score: &lt;60</p>
            <div className="mt-2">
              {enhancedResults
                .filter(r => r.priorityScore! < 60)
                .slice(0, 3)
                .map((result, i) => (
                  <div key={i} className="text-xs p-1 bg-white rounded mb-1">
                    {extractRouteData(result.url).route} ({(result.similarity * 100).toFixed(0)}%)
                  </div>
                ))}
            </div>
          </div>
        </div>
      </Card>

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