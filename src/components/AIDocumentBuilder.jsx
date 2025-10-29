import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';

export default function AIDocumentBuilder({ onDocumentGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please describe the document you want to create');
      return;
    }

    setGenerating(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a professional restaurant document based on this request: "${prompt}". 

Generate detailed, well-structured content suitable for a restaurant operations manual.

Return JSON with:
- title (string)
- category (one of: sop, policy, training, guide, quality, procedure, emergency, customer_service, other)
- description (brief overview)
- content_html (full document content in HTML with proper headings, lists, and formatting)
- tags (array of searchable tags)
- department (one of: all, kitchen, front_of_house, bar, management, cleaning, maintenance)
- requires_signature (boolean - true if this is a policy/procedure that requires acknowledgment)`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            category: { type: "string" },
            description: { type: "string" },
            content_html: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            department: { type: "string" },
            requires_signature: { type: "boolean" }
          }
        }
      });

      onDocumentGenerated(response);
      setPrompt('');
    } catch (error) {
      alert('Failed to generate document. Please try again.');
    }
    setGenerating(false);
  };

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI Document Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Describe the document you need and AI will generate professional content for you
        </p>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Create a comprehensive health and safety policy covering fire safety, first aid procedures, and emergency evacuation..."
          rows={4}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating || !prompt.trim()}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Document with AI
              </>
            )}
          </Button>
        </div>
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-medium">Example prompts:</p>
          <p>• "Create a food allergen management policy"</p>
          <p>• "Write a training manual for new servers"</p>
          <p>• "Generate a cleaning and hygiene protocol"</p>
        </div>
      </CardContent>
    </Card>
  );
}