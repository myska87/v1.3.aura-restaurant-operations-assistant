import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Calendar,
  Users,
  Home,
  Search,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function FormLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  const { data: forms = [] } = useQuery({
    queryKey: ['formTemplates'],
    queryFn: () => base44.entities.FormTemplate.list('-created_date'),
  });

  const deleteFormMutation = useMutation({
    mutationFn: (id) => base44.entities.FormTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
    },
  });

  const duplicateFormMutation = useMutation({
    mutationFn: (formData) => base44.entities.FormTemplate.create({
      ...formData,
      form_name: `${formData.form_name} (Copy)`,
      version_number: 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['formTemplates'] });
    },
  });

  const filteredForms = forms.filter(form => {
    const matchesSearch = form.form_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          form.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || form.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'cleaning', 'hygiene', 'maintenance', 'training', 'audit', 'safety', 'quality', 'other'];

  const getCategoryColor = (category) => {
    const colors = {
      cleaning: 'bg-blue-100 text-blue-800',
      hygiene: 'bg-green-100 text-green-800',
      maintenance: 'bg-orange-100 text-orange-800',
      training: 'bg-purple-100 text-purple-800',
      audit: 'bg-red-100 text-red-800',
      safety: 'bg-yellow-100 text-yellow-800',
      quality: 'bg-indigo-100 text-indigo-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">📋 Form Library</h1>
              <p className="text-gray-600">Manage your dynamic forms and templates</p>
            </div>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate(createPageUrl('FormBuilder'))} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Create New Form
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-white mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Search forms..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {categories.map(cat => (
                  <Button
                    key={cat}
                    variant={categoryFilter === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(cat)}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms Grid */}
        {filteredForms.length === 0 ? (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Plus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No forms found</p>
              {isAdmin && (
                <Button onClick={() => navigate(createPageUrl('FormBuilder'))} variant="outline">
                  Create Your First Form
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form, index) => (
              <motion.div
                key={form.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="bg-white hover:shadow-lg transition-all duration-200 group">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-3xl">{form.icon || '📋'}</div>
                      {form.is_active ? (
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      ) : (
                        <Badge variant="outline">Inactive</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{form.form_name}</CardTitle>
                    <p className="text-sm text-gray-600 line-clamp-2">{form.description}</p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge className={getCategoryColor(form.category)}>
                        {form.category}
                      </Badge>
                      <Badge variant="outline">{form.fields?.length || 0} fields</Badge>
                      {form.requires_signature && <Badge variant="outline">✍️ Signature</Badge>}
                    </div>

                    <div className="flex gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(createPageUrl(`FormBuilder?edit=${form.id}`))}
                            className="flex-1"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateFormMutation.mutate(form)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this form?')) {
                                deleteFormMutation.mutate(form.id);
                              }
                            }}
                            className="text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}