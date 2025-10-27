import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Save, ArrowLeft, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function FormBuilder() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    form_name: '',
    description: '',
    category: 'workflow',
    fields: [],
  });

  const createFormMutation = useMutation({
    mutationFn: (data) => base44.entities.FormTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
      alert('✅ Form created successfully!');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createFormMutation.mutateAsync(formData);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('FormIntelligence')}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Forms
            </Button>
          </Link>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Form Builder</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Form Name</Label>
                <Input
                  value={formData.form_name}
                  onChange={(e) => setFormData({ ...formData, form_name: e.target.value })}
                  placeholder="e.g., Daily Hygiene Checklist"
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this form for?"
                  rows={3}
                />
              </div>

              <div>
                <Label>Category</Label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="haccp">HACCP</option>
                  <option value="workflow">Workflow</option>
                  <option value="equipment">Equipment</option>
                  <option value="pest">Pest Control</option>
                  <option value="sops">SOPs</option>
                  <option value="training">Training</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => window.history.back()}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createFormMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {createFormMutation.isPending ? 'Saving...' : 'Save Form'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}