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

const CHART_COLORS = ['hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

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

  // Distribution data for pie chart
  const excellent = results.filter(r => r.similarity >= 0.8).length;
  const good = results.filter(r => r.similarity >= 0.7 && r.similarity < 0.8).length;
  const fair = results.filter(r => r.similarity >= 0.6 && r.similarity < 0.7).length;
  const poor = results.filter(r => r.similarity < 0.6).length;

  const pieData = [
    { name: 'Excellent (80-100%)', value: excellent, fill: CHART_COLORS[0] },
    { name: 'Good (70-79%)', value: good, fill: CHART_COLORS[1] },
    { name: 'Poor (<60%)', value: poor, fill: CHART_COLORS[2] },
  ].filter(item => item.value > 0);

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
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} URLs`, 'Count']} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">URL Pattern Analysis</h3>
          <div className="space-y-3">
            {results.map((result, index) => {
              const { label, color, icon: Icon } = getSimilarityLabel(result.similarity);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">URL {index + 1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{(result.similarity * 100).toFixed(1)}%</span>
                    <Badge variant={color as any}>{label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

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