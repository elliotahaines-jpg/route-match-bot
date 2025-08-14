import React, { useState } from 'react';
import { Key, Eye, EyeOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface APIKeyInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isValid: boolean;
}

export const APIKeyInput: React.FC<APIKeyInputProps> = ({
  value,
  onChange,
  onSubmit,
  isValid,
}) => {
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="p-6 bg-gradient-subtle border-primary/20">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Key className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">OpenAI API Key Required</h3>
          <p className="text-sm text-muted-foreground">
            Enter your OpenAI API key to generate embeddings for analysis
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="api-key">API Key</Label>
          <div className="relative">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="sk-..."
              className="pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Your API key is only used for this session and never stored
          </p>
          <Button 
            onClick={onSubmit} 
            disabled={!isValid}
            size="sm"
          >
            Start Analysis
          </Button>
        </div>
      </div>
    </Card>
  );
};