import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function SOPAIAssistant({ onSOPGenerated }) {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const generateSOP = async () => {
    if (!prompt.trim()) {
      setError('Please describe what SOP you need');
      return;
    }

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const aiPrompt = `You are an expert restaurant operations manager. Generate a detailed Standard Operating Procedure (SOP) document based on this request:

"${prompt}"

Return a JSON object with the following structure:
{
  "title": "SOP Title",
  "description": "Brief description",
  "category": "kitchen/service/cleaning/hygiene/equipment/customer_service",
  "objective": "Main purpose of this SOP",
  "scope": "What this SOP covers",
  "procedure_steps": [
    {
      "step_number": 1,
      "title": "Step Title",
      "description": "Detailed instructions",
      "time_estimate_minutes": 5,
      "safety_notes": "Safety considerations if any"
    }
  ],
  "equipment_required": ["Equipment 1", "Equipment 2"],
  "safety_notes": "Overall safety warnings",
  "quality_standards": "Quality expectations",
  "frequency": "daily/weekly/monthly/as_needed"
}

Make it detailed, professional, and practical for restaurant staff.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            category: { type: 'string' },
            objective: { type: 'string' },
            scope: { type: 'string' },
            procedure_steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  step_number: { type: 'number' },
                  title: { type: 'string' },
                  description: { type: 'string' },
                  time_estimate_minutes: { type: 'number' },
                  safety_notes: { type: 'string' }
                }
              }
            },
            equipment_required: {
              type: 'array',
              items: { type: 'string' }
            },
            safety_notes: { type: 'string' },
            quality_standards: { type: 'string' },
            frequency: { type: 'string' }
          }
        }
      });

      setResult(response);

      if (onSOPGenerated) {
        onSOPGenerated(response);
      }

    } catch (err) {
      console.error('Error generating SOP:', err);
      setError('Failed to generate SOP. Please try again.');
    }

    setGenerating(false);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          AI SOP Generator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the SOP you need... e.g., 'Create an SOP for opening the restaurant kitchen in the morning'"
              rows={4}
              className="bg-white"
              disabled={generating}
            />
          </div>

          <Button
            onClick={generateSOP}
            disabled={generating || !prompt.trim()}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating SOP...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate SOP with AI
              </>
            )}
          </Button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {result && (
            <div className="p-4 bg-white border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">SOP Generated Successfully!</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Title:</p>
                  <p className="text-sm text-gray-900">{result.title}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Category:</p>
                  <Badge className="bg-purple-100 text-purple-800">{result.category}</Badge>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Steps:</p>
                  <p className="text-sm text-gray-900">{result.procedure_steps?.length || 0} steps</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}