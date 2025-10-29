import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Bell,
  Settings,
  Zap,
  Plus,
  Edit,
  Trash2,
  Home,
  Activity,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';

export default function EventHub() {
  const queryClient = useQueryClient();
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const [formData, setFormData] = useState({
    rule_name: '',
    description: '',
    trigger_event_type: '',
    action_type: 'create_task',
    target_role: 'manager',
    priority: 'medium',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['automationRules'],
    queryFn: () => base44.entities.EventAutomationRule.list('-created_date'),
    enabled: isAdmin,
  });

  const { data: recentEvents = [] } = useQuery({
    queryKey: ['recentEventsStats'],
    queryFn: () => base44.entities.Event.list('-created_date', 100),
    enabled: isAdmin,
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data) => {
      if (editingRule) {
        return await base44.entities.EventAutomationRule.update(editingRule.id, data);
      }
      return await base44.entities.EventAutomationRule.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      setShowRuleDialog(false);
      resetForm();
      alert(editingRule ? '✅ Rule Updated!' : '✅ Rule Created!');
    },
  });

  const deleteRuleMutation = useMutation({
    mutationFn: (ruleId) => base44.entities.EventAutomationRule.delete(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
      alert('✅ Rule Deleted!');
    },
  });

  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, isActive }) => {
      return base44.entities.EventAutomationRule.update(ruleId, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['automationRules'] });
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: '',
      description: '',
      trigger_event_type: '',
      action_type: 'create_task',
      target_role: 'manager',
      priority: 'medium',
    });
    setEditingRule(null);
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || '',
      trigger_event_type: rule.trigger_event_type,
      action_type: rule.action_type,
      target_role: rule.target_role || 'manager',
      priority: rule.priority || 'medium',
    });
    setShowRuleDialog(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const ruleData = {
      ...formData,
      created_by: user.email,
      created_by_name: user.full_name,
      is_active: true,
    };

    createRuleMutation.mutate(ruleData);
  };

  const stats = {
    totalEvents: recentEvents.length,
    criticalEvents: recentEvents.filter(e => e.severity === 'critical').length,
    autoActionsTriggered: recentEvents.filter(e => e.auto_action_triggered).length,
    activeRules: rules.filter(r => r.is_active).length,
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">EventHub Management is only accessible to Administrators.</p>
              <Link to={createPageUrl('Dashboard')}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link to={createPageUrl('EventFeed')}>
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Event Feed
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">EventHub Management</h1>
              <p className="text-gray-600">Configure automation rules and event routing</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-gray-900">{stats.totalEvents}</p>
              <p className="text-sm text-gray-600">Total Events</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-red-900">{stats.criticalEvents}</p>
              <p className="text-sm text-gray-600">Critical Alerts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-purple-900">{stats.autoActionsTriggered}</p>
              <p className="text-sm text-gray-600">Auto-Actions</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-3xl font-bold text-green-900">{stats.activeRules}</p>
              <p className="text-sm text-gray-600">Active Rules</p>
            </CardContent>
          </Card>
        </div>

        {/* Automation Rules */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Automation Rules ({rules.length})</CardTitle>
              <Button
                onClick={() => setShowRuleDialog(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Rule
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto"></div>
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12">
                <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No automation rules yet</p>
                <Button onClick={() => setShowRuleDialog(true)}>
                  Create First Rule
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule, index) => (
                  <motion.div
                    key={rule.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={`p-4 rounded-lg border-2 ${rule.is_active ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-bold text-gray-900">{rule.rule_name}</h4>
                            <Badge className={rule.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {rule.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{rule.description}</p>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              Trigger: {rule.trigger_event_type}
                            </Badge>
                            <Badge variant="outline">
                              Action: {rule.action_type}
                            </Badge>
                            <Badge variant="outline">
                              Triggered: {rule.times_triggered || 0}x
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleRuleMutation.mutate({ ruleId: rule.id, isActive: rule.is_active })}
                          >
                            {rule.is_active ? 'Disable' : 'Enable'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(rule)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              if (confirm('Delete this rule?')) {
                                deleteRuleMutation.mutate(rule.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Rule Dialog */}
        <Dialog open={showRuleDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <Label>Rule Name *</Label>
                <Input
                  value={formData.rule_name}
                  onChange={(e) => setFormData({...formData, rule_name: e.target.value})}
                  placeholder="e.g., Auto-assign low hygiene tasks"
                  required
                />
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="What does this rule do?"
                  rows={2}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Trigger Event *</Label>
                  <Select
                    value={formData.trigger_event_type}
                    onValueChange={(value) => setFormData({...formData, trigger_event_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select trigger" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stock_low">Stock Low</SelectItem>
                      <SelectItem value="stock_critical">Stock Critical</SelectItem>
                      <SelectItem value="checklist_missed">Checklist Missed</SelectItem>
                      <SelectItem value="quality_check_low">Quality Check Low</SelectItem>
                      <SelectItem value="form_overdue">Form Overdue</SelectItem>
                      <SelectItem value="shift_missed">Shift Missed</SelectItem>
                      <SelectItem value="maintenance_urgent">Maintenance Urgent</SelectItem>
                      <SelectItem value="hygiene_alert">Hygiene Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Action Type *</Label>
                  <Select
                    value={formData.action_type}
                    onValueChange={(value) => setFormData({...formData, action_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create_task">Create Task</SelectItem>
                      <SelectItem value="send_email">Send Email</SelectItem>
                      <SelectItem value="notify_manager">Notify Manager</SelectItem>
                      <SelectItem value="create_maintenance_ticket">Create Maintenance Ticket</SelectItem>
                      <SelectItem value="escalate_alert">Escalate Alert</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Assign To</Label>
                  <Select
                    value={formData.target_role}
                    onValueChange={(value) => setFormData({...formData, target_role: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="chef">Chef</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="all">All Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({...formData, priority: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowRuleDialog(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createRuleMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {createRuleMutation.isPending ? 'Saving...' : (editingRule ? 'Update Rule' : 'Create Rule')}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}