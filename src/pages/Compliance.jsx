import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Camera, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Compliance() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    check_type: "temperature_log",
    area: "",
    temperature_value: "",
    status: "passed",
    notes: "",
    photo_urls: [],
    check_date: new Date().toISOString(),
  });

  const { data: checks = [], isLoading } = useQuery({
    queryKey: ['complianceChecks'],
    queryFn: () => base44.entities.ComplianceCheck.list("-check_date"),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createCheckMutation = useMutation({
    mutationFn: (data) => base44.entities.ComplianceCheck.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complianceChecks'] });
      setShowForm(false);
      setFormData({
        check_type: "temperature_log",
        area: "",
        temperature_value: "",
        status: "passed",
        notes: "",
        photo_urls: [],
        check_date: new Date().toISOString(),
      });
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({
        ...prev,
        photo_urls: [...prev.photo_urls, file_url]
      }));
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createCheckMutation.mutateAsync({
      ...formData,
      checked_by: user?.full_name || user?.email,
      temperature_value: formData.temperature_value ? parseFloat(formData.temperature_value) : null,
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'needs_attention':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'needs_attention':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Compliance & Hygiene</h1>
            <p className="text-gray-600">Track daily checks and maintain safety standards</p>
          </div>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                New Check
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Compliance Check</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="check_type">Check Type</Label>
                    <Select
                      value={formData.check_type}
                      onValueChange={(value) => setFormData({ ...formData, check_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="temperature_log">Temperature Log</SelectItem>
                        <SelectItem value="cleaning_checklist">Cleaning Checklist</SelectItem>
                        <SelectItem value="hygiene_audit">Hygiene Audit</SelectItem>
                        <SelectItem value="safety_inspection">Safety Inspection</SelectItem>
                        <SelectItem value="food_handling">Food Handling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Area / Equipment</Label>
                    <Input
                      id="area"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="e.g., Walk-in Fridge, Kitchen Sink"
                      required
                    />
                  </div>
                </div>

                {formData.check_type === "temperature_log" && (
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature (°C)</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={formData.temperature_value}
                      onChange={(e) => setFormData({ ...formData, temperature_value: e.target.value })}
                      placeholder="e.g., 4.5"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passed">Passed</SelectItem>
                      <SelectItem value="needs_attention">Needs Attention</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional observations..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photos</Label>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload').click()}
                      disabled={uploading}
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Add Photo'}
                    </Button>
                    <input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {formData.photo_urls.length > 0 && (
                      <span className="text-sm text-gray-600">
                        {formData.photo_urls.length} photo(s) added
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCheckMutation.isPending}>
                    {createCheckMutation.isPending ? 'Saving...' : 'Save Check'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Checks List */}
        <div className="space-y-4">
          {isLoading ? (
            <Card className="bg-white">
              <CardContent className="p-6">
                <div className="animate-pulse space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-gray-200 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : checks.length === 0 ? (
            <Card className="bg-white">
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">No compliance checks recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            checks.map((check) => (
              <Card key={check.id} className="bg-white border-none shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(check.status)}
                        <h3 className="font-semibold text-gray-900">
                          {check.check_type.replace(/_/g, ' ').toUpperCase()} - {check.area}
                        </h3>
                        <Badge className={getStatusColor(check.status)}>
                          {check.status.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <p>Checked by: {check.checked_by}</p>
                        <p>Date: {format(new Date(check.check_date), "PPpp")}</p>
                        {check.temperature_value && (
                          <p>Temperature: {check.temperature_value}°C</p>
                        )}
                        {check.notes && <p>Notes: {check.notes}</p>}
                      </div>
                    </div>
                    {check.photo_urls?.length > 0 && (
                      <div className="flex gap-2">
                        {check.photo_urls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt="Evidence"
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}