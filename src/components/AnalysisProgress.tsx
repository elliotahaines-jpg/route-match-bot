import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AnalysisStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  description?: string;
}

interface AnalysisProgressProps {
  steps: AnalysisStep[];
  currentStep: string;
  progress: number;
  isAnalyzing: boolean;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  steps,
  currentStep,
  progress,
  isAnalyzing,
}) => {
  const getStepIcon = (status: AnalysisStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-success" />;
      case 'running':
        return <Clock className="h-5 w-5 text-primary animate-pulse" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  if (!isAnalyzing && steps.every(step => step.status === 'pending')) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">Analysis in Progress</h3>
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground mt-2">{progress}% Complete</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-start gap-3">
              {getStepIcon(step.status)}
              <div className="flex-1 min-w-0">
                <p className={`font-medium ${
                  step.status === 'running' ? 'text-primary' : 
                  step.status === 'completed' ? 'text-success' :
                  step.status === 'error' ? 'text-destructive' :
                  'text-muted-foreground'
                }`}>
                  {step.title}
                </p>
                {step.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};