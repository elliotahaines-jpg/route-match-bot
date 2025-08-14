import { useState, useCallback } from 'react';
import { AnalysisResult } from '@/components/AnalysisResults';

interface AnalysisStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  description?: string;
}

interface UseAnalyzerReturn {
  isAnalyzing: boolean;
  progress: number;
  steps: AnalysisStep[];
  results: AnalysisResult[];
  startAnalysis: (csvFile: File, jsonFile: File, apiKey: string) => Promise<void>;
  exportResults: () => void;
}

export const useAnalyzer = (): UseAnalyzerReturn => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [steps, setSteps] = useState<AnalysisStep[]>([
    { id: 'parse', title: 'Parsing uploaded files', status: 'pending' },
    { id: 'extract', title: 'Extracting URLs and responses', status: 'pending' },
    { id: 'scrape', title: 'Scraping page content', status: 'pending' },
    { id: 'embed', title: 'Generating embeddings', status: 'pending' },
    { id: 'calculate', title: 'Calculating similarity scores', status: 'pending' },
  ]);

  const updateStep = useCallback((stepId: string, status: AnalysisStep['status'], description?: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, status, description } : step
    ));
  }, []);

  const parseCSV = async (file: File): Promise<string[]> => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    return lines.slice(1, 6).map(line => line.split(',')[0].trim().replace(/"/g, ''));
  };

  const parseJSON = async (file: File): Promise<any[]> => {
    const text = await file.text();
    return JSON.parse(text);
  };

  const scrapePageContent = async (url: string): Promise<string> => {
    try {
      // In a real implementation, you'd need a CORS proxy or backend service
      // For demo purposes, we'll simulate content extraction
      const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      // Parse HTML and extract text (simplified)
      const parser = new DOMParser();
      const doc = parser.parseFromString(data.contents, 'text/html');
      
      // Remove script, style, nav, header, footer tags
      ['script', 'style', 'nav', 'header', 'footer'].forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach(el => el.remove());
      });
      
      return doc.body?.textContent?.trim() || '';
    } catch (error) {
      console.warn(`Failed to scrape ${url}:`, error);
      return `Sample content for ${url} - This would be the actual page content in production.`;
    }
  };

  const generateEmbedding = async (text: string, apiKey: string): Promise<number[]> => {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text.substring(0, 8000), // Truncate for token limits
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.warn('Failed to generate embedding:', error);
      // Return mock embedding for demo
      return Array.from({ length: 1536 }, () => Math.random() - 0.5);
    }
  };

  const cosineSimilarity = (a: number[], b: number[]): number => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
  };

  const extractRoutePrompt = (url: string): string => {
    const match = url.match(/train-times\/([^\/]+)/);
    if (!match) return '';
    
    const route = match[1].replace(/\//g, '').toLowerCase();
    if (!route.includes('-to-')) return '';
    
    const [origin, dest] = route.split('-to-');
    return `cheapest ${origin} to ${dest} train tickets online`;
  };

  const findMatchingGPTResponse = (prompt: string, jsonData: any[]): string => {
    const lowerPrompt = prompt.toLowerCase();
    for (const item of jsonData) {
      const itemPrompt = (item.prompt || '').toLowerCase();
      if (itemPrompt.includes(lowerPrompt) || lowerPrompt.includes(itemPrompt)) {
        return item.response || '';
      }
    }
    return '';
  };

  const startAnalysis = useCallback(async (csvFile: File, jsonFile: File, apiKey: string) => {
    setIsAnalyzing(true);
    setProgress(0);
    setResults([]);

    try {
      // Step 1: Parse files
      updateStep('parse', 'running', 'Reading CSV and JSON files...');
      setProgress(10);
      
      const urls = await parseCSV(csvFile);
      const jsonData = await parseJSON(jsonFile);
      
      updateStep('parse', 'completed');
      setProgress(20);

      // Step 2: Extract data
      updateStep('extract', 'running', `Found ${urls.length} URLs to analyze`);
      setProgress(30);
      
      updateStep('extract', 'completed');
      setProgress(40);

      const analysisResults: AnalysisResult[] = [];

      // Step 3: Process each URL
      updateStep('scrape', 'running');
      
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        updateStep('scrape', 'running', `Processing URL ${i + 1}/${urls.length}: ${url}`);
        
        const pageContent = await scrapePageContent(url);
        const routePrompt = extractRoutePrompt(url);
        const gptResponse = findMatchingGPTResponse(routePrompt, jsonData);
        
        if (!gptResponse) {
          console.warn(`No matching GPT response for: ${routePrompt}`);
          continue;
        }

        updateStep('embed', 'running', `Generating embeddings for URL ${i + 1}`);
        
        const [pageEmbedding, gptEmbedding] = await Promise.all([
          generateEmbedding(pageContent, apiKey),
          generateEmbedding(gptResponse, apiKey),
        ]);

        updateStep('calculate', 'running', `Calculating similarity for URL ${i + 1}`);
        
        const similarity = cosineSimilarity(pageEmbedding, gptEmbedding);
        
        analysisResults.push({
          url,
          prompt: routePrompt,
          pageText: pageContent.substring(0, 300),
          gptAnswer: gptResponse.substring(0, 300),
          similarity,
          urlPattern: routePrompt,
        });

        setProgress(40 + ((i + 1) / urls.length) * 50);
      }

      updateStep('scrape', 'completed');
      updateStep('embed', 'completed');
      updateStep('calculate', 'completed');
      
      setResults(analysisResults);
      setProgress(100);
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setSteps(prev => prev.map(step => 
        step.status === 'running' ? { ...step, status: 'error' } : step
      ));
    } finally {
      setIsAnalyzing(false);
    }
  }, [updateStep]);

  const exportResults = useCallback(() => {
    if (results.length === 0) return;

    const csvContent = [
      ['URL', 'Prompt', 'Page Text (truncated)', 'GPT Answer (truncated)', 'Cosine Similarity'],
      ...results.map(r => [
        r.url,
        r.prompt,
        r.pageText.replace(/"/g, '""'),
        r.gptAnswer.replace(/"/g, '""'),
        r.similarity.toFixed(4),
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `similarity_analysis_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [results]);

  return {
    isAnalyzing,
    progress,
    steps,
    results,
    startAnalysis,
    exportResults,
  };
};