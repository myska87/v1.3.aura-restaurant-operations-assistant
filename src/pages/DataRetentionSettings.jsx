import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Shield, Trash2, Clock, AlertTriangle, Save, Plus, ArrowLeft, Home } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function DataRetentionSettings() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [formData, setFormData] = useState({
    policy_name: "",
    entity_type: "AttendanceRecord",
    retention_years: 2,
    retention_days: 730,
    auto_purge_enabled: true,
    legal_basis: "",
    notes: "",
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: policies = [], isLoading } = useQuery({
    queryKey: ['dataRetentionPolicies'],
    queryFn: () => base44.entities.DataRetentionPolicy.list(),
  });

  const isAdmin = user?.role === 'admin' || user?.position === 'owner';

  const createPolicyMutation = useMutation({
    mutationFn: (data) => base44.entities.DataRetentionPolicy.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataRetentionPolicies'] });
      resetForm();
    },
  });

  const updatePolicyMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DataRetentionPolicy.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataRetentionPolicies'] });
      resetForm();
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id) => base44.entities.DataRetentionPolicy.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataRetentionPolicies'] });
    },
  });

  const resetForm = () => {
    setShowCreateDialog(false);
    setEditingPolicy(null);
    setFormData({
      policy_name: "",
      entity_type: "AttendanceRecord",
      retention_years: 2,
      retention_days: 730,
      auto_purge_enabled: true,
      legal_basis: "",
      notes: "",
    });
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      policy_name: policy.policy_name,
      entity_type: policy.entity_type,
      retention_years: policy.retention_years || Math.floor(policy.retention_days / 365),
      retention_days: policy.retention_days,
      auto_purge_enabled: policy.auto_purge_enabled,
      legal_basis: policy.legal_basis || "",
      notes: policy.notes || "",
    });
    setShowCreateDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const data = {
      ...formData,
      retention_days: formData.retention_years * 365,
      created_by: user?.email,
    };

    if (editingPolicy) {
      await updatePolicyMutation.mutateAsync({ id: editingPolicy.id, data });
    } else {
      await createPolicyMutation.mutateAsync(data);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Delete this retention policy? This cannot be undone.')) {
      await deletePolicyMutation.mutateAsync(id);
    }
  };

  const defaultPolicies = [
    { entity: "AttendanceRecord", years: 2, legal: "Employment law requires 2-year attendance records" },
    { entity: "Document", years: 3, legal: "ISO 9001 document retention standard" },
    { entity: "DataAudit", years: 1, legal: "GDPR requires 1-year audit trail minimum" },
    { entity: "PayrollRecord", years: 6, legal: "HMRC requires 6-year payroll retention (UK)" },
    { entity: "ClockEvent", years: 2, legal: "Working Time Regulations retention" },
    { entity: "EmailLog", years: 1, legal: "Communication audit requirement" },
    { entity: "MaintenanceTicket", years: 3, legal: "Health & safety compliance" },
    { entity: "ComplianceCheck", years: 5, legal: "Food Safety Act requirement" },
  ];

  if (!isAdmin && !isLoading) {
    return (
      <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-6">
                Only administrators can manage data retention settings
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>Return to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("DataManagement")}>
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
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Clock className="w-8 h-8 text-[#014D40]" />
              Data Retention Policies
            </h1>
            <p className="text-gray-600">
              GDPR-compliant data minimisation and automated purging
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-[#014D40] hover:bg-[#016854]">
            <Plus className="w-4 h-4 mr-2" />
            Add Policy
          </Button>
        </div>

        {/* GDPR Info Banner */}
        <Card className="bg-blue-50 border-blue-200 mb-8">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">GDPR Data Minimisation Principle</h3>
                <p className="text-sm text-blue-800 mb-3">
                  Personal data must be kept only as long as necessary for the purposes for which it is processed.
                </p>
                <div className="bg-white rounded-lg p-4 text-sm text-gray-700">
                  <p className="font-semibold mb-2">Legal Retention Requirements (UK):</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Payroll: 6 years (HMRC)</li>
                    <li>• Attendance: 2 years (Employment law)</li>
                    <li>• Food Safety: 5 years (Food Safety Act)</li>
                    <li>• Audit Logs: 1 year minimum (GDPR)</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Policies */}
        <Card className="bg-white border-none shadow-sm mb-8">
          <CardHeader>
            <CardTitle>Active Retention Policies</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading policies...</div>
            ) : policies.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No retention policies configured</p>
                <Button onClick={() => setShowCreateDialog(true)} variant="outline">
                  Create First Policy
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{policy.policy_name}</h4>
                          <Badge className="bg-[#014D40] text-white">
                            {policy.entity_type}
                          </Badge>
                          {policy.auto_purge_enabled && (
                            <Badge className="bg-green-100 text-green-800">Auto-Purge Active</Badge>
                          )}
                          {!policy.is_active && (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">
                              <strong>Retention Period:</strong> {policy.retention_years || Math.floor(policy.retention_days / 365)} years 
                              ({policy.retention_days} days)
                            </p>
                            {policy.legal_basis && (
                              <p className="text-gray-600 mt-1">
                                <strong>Legal Basis:</strong> {policy.legal_basis}
                              </p>
                            )}
                          </div>
                          <div>
                            {policy.last_purge_date && (
                              <p className="text-gray-600">
                                <strong>Last Purge:</strong> {format(new Date(policy.last_purge_date), 'PPP')}
                              </p>
                            )}
                            {policy.records_purged_count > 0 && (
                              <p className="text-gray-600 mt-1">
                                <strong>Total Purged:</strong> {policy.records_purged_count.toLocaleString()} records
                              </p>
                            )}
                          </div>
                        </div>

                        {policy.notes && (
                          <p className="text-xs text-gray-500 mt-2 italic">{policy.notes}</p>
                        )}
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(policy)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(policy.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommended Policies */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader>
            <CardTitle>Recommended Retention Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Based on UK legal requirements and GDPR best practices
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {defaultPolicies.map((rec, idx) => (
                <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-900">{rec.entity}</h4>
                    <Badge className="bg-blue-100 text-blue-800">{rec.years} years</Badge>
                  </div>
                  <p className="text-xs text-gray-600">{rec.legal}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingPolicy ? 'Edit Retention Policy' : 'Create Retention Policy'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="policy_name">Policy Name *</Label>
                <Input
                  id="policy_name"
                  value={formData.policy_name}
                  onChange={(e) => setFormData({ ...formData, policy_name: e.target.value })}
                  placeholder="e.g., Standard Attendance Retention"
                  required
                />
              </div>

              <div>
                <Label htmlFor="entity_type">Entity Type *</Label>
                <select
                  id="entity_type"
                  value={formData.entity_type}
                  onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
                  className="w-full border border-gray-300 rounded-md p-2"
                  required
                >
                  <option value="AttendanceRecord">Attendance Record</option>
                  <option value="Document">Document</option>
                  <option value="DataAudit">Data Audit</option>
                  <option value="PayrollRecord">Payroll Record</option>
                  <option value="ClockEvent">Clock Event</option>
                  <option value="ChatMessage">Chat Message</option>
                  <option value="EmailLog">Email Log</option>
                  <option value="MaintenanceTicket">Maintenance Ticket</option>
                  <option value="ComplianceCheck">Compliance Check</option>
                </select>
              </div>

              <div>
                <Label htmlFor="retention_years">Retention Period (Years) *</Label>
                <Input
                  id="retention_years"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.retention_years}
                  onChange={(e) => setFormData({ ...formData, retention_years: parseInt(e.target.value) })}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Equivalent to {formData.retention_years * 365} days
                </p>
              </div>

              <div>
                <Label htmlFor="legal_basis">Legal Basis</Label>
                <Input
                  id="legal_basis"
                  value={formData.legal_basis}
                  onChange={(e) => setFormData({ ...formData, legal_basis: e.target.value })}
                  placeholder="e.g., HMRC requires 6 years"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  placeholder="Additional information about this policy"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <Switch
                  checked={formData.auto_purge_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_purge_enabled: checked })}
                />
                <div>
                  <Label>Enable Auto-Purge</Label>
                  <p className="text-xs text-gray-600">
                    Automatically delete records older than retention period
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#014D40] hover:bg-[#016854]">
                  <Save className="w-4 h-4 mr-2" />
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}