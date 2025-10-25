import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lightbulb, Plus, ThumbsUp, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function SuggestionBox() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const [newSuggestion, setNewSuggestion] = useState({
    title: "",
    suggestion: "",
    category: "operations",
    is_anonymous: false,
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => base44.entities.StaffSuggestion.list('-submitted_at'),
  });

  const createSuggestionMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffSuggestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      setShowDialog(false);
      setNewSuggestion({
        title: "",
        suggestion: "",
        category: "operations",
        is_anonymous: false,
      });
    },
  });

  const handleSubmit = async () => {
    await createSuggestionMutation.mutateAsync({
      ...newSuggestion,
      staff_email: newSuggestion.is_anonymous ? "anonymous" : user?.email,
      staff_name: newSuggestion.is_anonymous ? "Anonymous" : user?.full_name,
      status: "submitted",
      likes_count: 0,
      submitted_at: new Date().toISOString(),
    });
  };

  const filteredSuggestions = suggestions.filter(suggestion => {
    const categoryMatch = filterCategory === 'all' || suggestion.category === filterCategory;
    const statusMatch = filterStatus === 'all' || suggestion.status === filterStatus;
    return categoryMatch && statusMatch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'implemented':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'under_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'not_feasible':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("CommunicationFeedback")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Lightbulb className="w-10 h-10 text-amber-600" />
              <h1 className="text-4xl font-bold text-gray-900">Suggestion Box</h1>
            </div>
            <p className="text-gray-600">Share your ideas to help us improve</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-amber-600 hover:bg-amber-700">
            <Plus className="w-4 h-4 mr-2" />
            Submit Suggestion
          </Button>
        </div>

        {/* Info Banner */}
        <Card className="mb-6 bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <p className="text-sm text-amber-900">
              💡 Your ideas matter! Submit suggestions to improve our workplace. You can choose to be anonymous if you prefer.
            </p>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="menu">Menu</SelectItem>
                  <SelectItem value="customer_service">Customer Service</SelectItem>
                  <SelectItem value="workplace">Workplace</SelectItem>
                  <SelectItem value="culture">Culture</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                  <SelectItem value="not_feasible">Not Feasible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Suggestions List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredSuggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{suggestion.title}</h3>
                          <Badge variant="outline">{suggestion.category}</Badge>
                          <Badge className={getStatusColor(suggestion.status)}>
                            {suggestion.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-3">
                          {suggestion.suggestion}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>
                            By {suggestion.is_anonymous ? "Anonymous" : suggestion.staff_name}
                          </span>
                          <span>•</span>
                          <span>{format(new Date(suggestion.submitted_at), 'PPP')}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{suggestion.likes_count || 0}</span>
                          </div>
                        </div>
                        {suggestion.management_response && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Management Response:</p>
                            <p className="text-sm text-blue-800">{suggestion.management_response}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredSuggestions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No suggestions found</p>
            </CardContent>
          </Card>
        )}

        {/* Create Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit a Suggestion</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <Input
                  value={newSuggestion.title}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, title: e.target.value })}
                  placeholder="Brief summary of your idea..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Suggestion</label>
                <Textarea
                  value={newSuggestion.suggestion}
                  onChange={(e) => setNewSuggestion({ ...newSuggestion, suggestion: e.target.value })}
                  placeholder="Describe your suggestion in detail..."
                  rows={6}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Category</label>
                <Select
                  value={newSuggestion.category}
                  onValueChange={(value) => setNewSuggestion({ ...newSuggestion, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="menu">Menu</SelectItem>
                    <SelectItem value="customer_service">Customer Service</SelectItem>
                    <SelectItem value="workplace">Workplace</SelectItem>
                    <SelectItem value="culture">Culture</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  checked={newSuggestion.is_anonymous}
                  onCheckedChange={(checked) => 
                    setNewSuggestion({ ...newSuggestion, is_anonymous: checked })
                  }
                />
                <label className="text-sm text-gray-700">
                  Submit anonymously
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!newSuggestion.title || !newSuggestion.suggestion}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  Submit Suggestion
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}