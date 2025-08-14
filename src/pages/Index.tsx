import React, { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { AnalysisProgress } from '@/components/AnalysisProgress';
import { AnalysisResults } from '@/components/AnalysisResults';
import { APIKeyInput } from '@/components/APIKeyInput';
import { useAnalyzer } from '@/hooks/useAnalyzer';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Brain, Zap, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiInput, setShowApiInput] = useState(false);
  
  const { toast } = useToast();
  const { isAnalyzing, progress, steps, results, startAnalysis, exportResults } = useAnalyzer();

  const handleStartAnalysis = () => {
    if (!csvFile || !jsonFile) {
      toast({
        title: "Missing Files",
        description: "Please upload both CSV and JSON files before starting analysis.",
        variant: "destructive",
      });
      return;
    }
    setShowApiInput(true);
  };

  const handleAPISubmit = async () => {
    if (!apiKey.startsWith('sk-')) {
      toast({
        title: "Invalid API Key",
        description: "Please enter a valid OpenAI API key starting with 'sk-'.",
        variant: "destructive",
      });
      return;
    }

    setShowApiInput(false);
    await startAnalysis(csvFile!, jsonFile!, apiKey);
  };

  const canStartAnalysis = csvFile && jsonFile && !isAnalyzing;
  const isAPIKeyValid = apiKey.startsWith('sk-') && apiKey.length > 20;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <div className="bg-gradient-primary text-white">
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Zap className="h-6 w-6" />
            </div>
            <span className="text-sm font-medium bg-white/20 px-2 py-1 rounded">
              AI-Powered Analysis
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Cosine Similarity Analyser
          </h1>
          <p className="text-xl text-white/90 max-w-2xl">
            Measure semantic alignment between your website content and GPT responses using advanced cosine similarity analysis
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        {!results.length && !isAnalyzing && (
          <>
            {/* File Upload Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Upload className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Upload URL List</h2>
                </div>
                <FileUpload
                  onFileSelect={setCsvFile}
                  accept=".csv"
                  title="Upload CSV File"
                  description="Upload a CSV file containing URLs to analyse for GPT response similarity"
                  icon={<FileSpreadsheet className="h-12 w-12 text-primary" />}
                  uploadedFile={csvFile}
                  onRemoveFile={() => setCsvFile(null)}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Brain className="h-5 w-5 text-primary" />
                  <h2 className="text-xl font-semibold">Upload GPT Responses</h2>
                </div>
                <FileUpload
                  onFileSelect={setJsonFile}
                  accept=".json"
                  title="Upload JSON File"
                  description="Upload a JSON file containing GPT responses for similarity analysis"
                  icon={<Brain className="h-12 w-12 text-primary" />}
                  uploadedFile={jsonFile}
                  onRemoveFile={() => setJsonFile(null)}
                />
              </div>
            </div>

            {/* API Key Input */}
            {showApiInput && (
              <APIKeyInput
                value={apiKey}
                onChange={setApiKey}
                onSubmit={handleAPISubmit}
                isValid={isAPIKeyValid}
              />
            )}

            {/* Start Analysis Button */}
            {!showApiInput && (
              <div className="text-center">
                <Button
                  onClick={handleStartAnalysis}
                  disabled={!canStartAnalysis}
                  size="lg"
                  className="gap-2 shadow-elegant"
                >
                  <Zap className="h-5 w-5" />
                  {canStartAnalysis ? 'Start Analysis' : 'Upload Files to Continue'}
                </Button>
                {csvFile && jsonFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {csvFile.name} & {jsonFile.name} ready for analysis
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Analysis Progress */}
        <AnalysisProgress
          steps={steps}
          currentStep=""
          progress={progress}
          isAnalyzing={isAnalyzing}
        />

        {/* Results */}
        <AnalysisResults
          results={results}
          onExportCSV={exportResults}
        />

        {/* Reset Button */}
        {(results.length > 0 || isAnalyzing) && (
          <div className="text-center">
            <Button
              variant="outline"
              onClick={() => {
                setCsvFile(null);
                setJsonFile(null);
                setApiKey('');
                setShowApiInput(false);
                window.location.reload();
              }}
              disabled={isAnalyzing}
            >
              Start New Analysis
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
