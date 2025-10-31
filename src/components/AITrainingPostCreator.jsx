import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Loader2, CheckCircle, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function AITrainingPostCreator({ onPostCreated, userEmail, userName }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState(null);

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.TrainingPost.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainingPosts'] });
      toast.success('✅ Training post created!');
      setPreview(null);
      setPrompt('');
      if (onPostCreated) onPostCreated();
    },
  });

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Please describe the training content you want');
      return;
    }

    setGenerating(true);

    try {
      const aiPrompt = `You are a training content creator for AURA restaurant.

Create an inspiring and educational training post based on this request:
"${prompt}"

The post should be:
- Warm and motivational
- Practical and actionable
- Aligned with restaurant culture of excellence
- Include specific examples
- 3-5 paragraphs

Also suggest:
- An engaging title
- Post category (leadership, customer_service, food_safety, teamwork, innovation, excellence, culture, skills)
- 3 key takeaways
- Whether it should require acknowledgment (important policies/safety = yes, tips = no)

Format professionally with emojis where appropriate.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            category: { type: 'string' },
            key_takeaways: { type: 'array', items: { type: 'string' } },
            requires_acknowledgment: { type: 'boolean' },
            suggested_image_prompt: { type: 'string' }
          }
        }
      });

      setPreview(result);
      toast.success('✅ Training content generated!');
      
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = () => {
    if (!preview) return;

    createPostMutation.mutate({
      title: preview.title,
      content: `${preview.content}\n\n🔑 Key Takeaways:\n${preview.key_takeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
      post_type: 'training_tip',
      category: preview.category || 'culture',
      author_email: userEmail,
      author_name: userName,
      requires_acknowledgment: preview.requires_acknowledgment || false,
      photo_urls: [],
      video_url: '',
      is_featured: false,
    });
  };

  return (
    <Card className="border-2 border-purple-200 shadow-lg">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">AI Training Assistant</h3>
            <p className="text-sm text-gray-600">Create professional training content instantly</p>
          </div>
        </div>

        {!preview ? (
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Example: Create a training post about the importance of temperature control in food storage, including HACCP guidelines and common mistakes to avoid."
            />
            <Button
              onClick={handleGenerate}
              disabled={generating || !prompt.trim()}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  AI is creating content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
              <h4 className="text-2xl font-bold text-gray-900 mb-4">{preview.title}</h4>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap mb-4">
                {preview.content}
              </div>
              {preview.key_takeaways && (
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <p className="font-semibold text-purple-900 mb-2">🔑 Key Takeaways:</p>
                  <ul className="space-y-1">
                    {preview.key_takeaways.map((takeaway, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-gray-700">
                        <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>{takeaway}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setPreview(null)}
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
              <Button
                onClick={handlePublish}
                disabled={createPostMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                {createPostMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Publish Post
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}