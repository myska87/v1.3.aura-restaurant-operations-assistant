import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Star,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ArrowLeft,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";

const safeNumber = (value, decimals = 1) => {
  const num = parseFloat(value);
  return isNaN(num) || num === null || num === undefined ? 0 : parseFloat(num.toFixed(decimals));
};

export default function LeafeVenues() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingVenue, setEditingVenue] = useState(null);
  const [formData, setFormData] = useState({
    venue_name: "",
    venue_code: "",
    area: "other",
    address: "",
    manager_email: "",
    manager_name: "",
    area_manager_email: "",
    contact_phone: "",
    hygiene_rating: 5,
    status: "active",
  });

  const { data: venues = [], isLoading } = useQuery({
    queryKey: ['leafeVenues'],
    queryFn: () => base44.entities.LeafeVenue.list(),
  });

  const { data: hygieneScores = [] } = useQuery({
    queryKey: ['hygieneScores'],
    queryFn: () => base44.entities.LeafeHygieneScore.list(),
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const createVenueMutation = useMutation({
    mutationFn: (data) => base44.entities.LeafeVenue.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leafeVenues'] });
      resetForm();
    },
  });

  const updateVenueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeafeVenue.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leafeVenues'] });
      resetForm();
    },
  });

  const deleteVenueMutation = useMutation({
    mutationFn: (id) => base44.entities.LeafeVenue.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leafeVenues'] });
    },
  });

  const resetForm = () => {
    setShowDialog(false);
    setEditingVenue(null);
    setFormData({
      venue_name: "",
      venue_code: "",
      area: "other",
      address: "",
      manager_email: "",
      manager_name: "",
      area_manager_email: "",
      contact_phone: "",
      hygiene_rating: 5,
      status: "active",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingVenue) {
      await updateVenueMutation.mutateAsync({ id: editingVenue.id, data: formData });
    } else {
      await createVenueMutation.mutateAsync(formData);
    }
  };

  const handleEdit = (venue) => {
    setEditingVenue(venue);
    setFormData({
      venue_name: venue.venue_name,
      venue_code: venue.venue_code,
      area: venue.area,
      address: venue.address || "",
      manager_email: venue.manager_email,
      manager_name: venue.manager_name || "",
      area_manager_email: venue.area_manager_email || "",
      contact_phone: venue.contact_phone || "",
      hygiene_rating: venue.hygiene_rating || 5,
      status: venue.status,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this venue?')) {
      await deleteVenueMutation.mutateAsync(id);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("LeafeDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Leafe
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-[#014D40]" />
              Venue Management
            </h1>
            <p className="text-gray-600">Manage your kitchen locations and hygiene performance</p>
          </div>
          <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-[#014D40] to-emerald-600">
            <Plus className="w-4 h-4 mr-2" />
            Add Venue
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#014D40] mx-auto" />
          </div>
        ) : venues.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No venues added yet</p>
              <Button onClick={() => setShowDialog(true)} className="bg-gradient-to-r from-[#014D40] to-emerald-600">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Venue
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {venues.map((venue) => {
              const venueScore = hygieneScores.find(s => s.venue_id === venue.id);
              const score = safeNumber(venueScore?.score || 0, 1);

              return (
                <Card key={venue.id} className="bg-white hover:shadow-lg transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg mb-1">{venue.venue_name}</CardTitle>
                        <p className="text-sm text-gray-600">{venue.venue_code}</p>
                      </div>
                      <Badge className={venue.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {venue.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-700 capitalize">{venue.area?.replace('_', ' ')}</span>
                      </div>

                      {venue.manager_name && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{venue.manager_name}</span>
                        </div>
                      )}

                      {venue.contact_phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-500" />
                          <span className="text-gray-700">{venue.contact_phone}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t">
                        <div>
                          <p className="text-xs text-gray-600">Leafe Score</p>
                          <p className={`text-2xl font-bold ${getScoreColor(score)}`}>
                            {score.toFixed(1)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">FSA Rating</p>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < (venue.hygiene_rating || 0)
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {venue.next_audit_due && (
                        <div className="flex items-center gap-2 text-sm bg-blue-50 p-2 rounded">
                          <Calendar className="w-4 h-4 text-blue-600" />
                          <span className="text-blue-700">
                            Next Audit: {format(new Date(venue.next_audit_due), 'MMM d, yyyy')}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(venue)} className="flex-1">
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleDelete(venue.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="venue_name">Venue Name *</Label>
                  <Input
                    id="venue_name"
                    value={formData.venue_name}
                    onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="venue_code">Venue Code *</Label>
                  <Input
                    id="venue_code"
                    value={formData.venue_code}
                    onChange={(e) => setFormData({ ...formData, venue_code: e.target.value })}
                    placeholder="e.g., LON-01"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">Area *</Label>
                <Select
                  value={formData.area}
                  onValueChange={(value) => setFormData({ ...formData, area: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="south_west">South West</SelectItem>
                    <SelectItem value="north_east">North East</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="london">London</SelectItem>
                    <SelectItem value="scotland">Scotland</SelectItem>
                    <SelectItem value="wales">Wales</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manager_email">Manager Email *</Label>
                  <Input
                    id="manager_email"
                    type="email"
                    value={formData.manager_email}
                    onChange={(e) => setFormData({ ...formData, manager_email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_name">Manager Name</Label>
                  <Input
                    id="manager_name"
                    value={formData.manager_name}
                    onChange={(e) => setFormData({ ...formData, manager_name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area_manager_email">Area Manager Email</Label>
                  <Input
                    id="area_manager_email"
                    type="email"
                    value={formData.area_manager_email}
                    onChange={(e) => setFormData({ ...formData, area_manager_email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact_phone">Contact Phone</Label>
                  <Input
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="hygiene_rating">FSA Hygiene Rating</Label>
                  <Select
                    value={String(formData.hygiene_rating)}
                    onValueChange={(value) => setFormData({ ...formData, hygiene_rating: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 - Very Good</SelectItem>
                      <SelectItem value="4">4 - Good</SelectItem>
                      <SelectItem value="3">3 - Generally Satisfactory</SelectItem>
                      <SelectItem value="2">2 - Improvement Necessary</SelectItem>
                      <SelectItem value="1">1 - Major Improvement Necessary</SelectItem>
                      <SelectItem value="0">0 - Urgent Improvement Necessary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createVenueMutation.isPending || updateVenueMutation.isPending}
                  className="bg-gradient-to-r from-[#014D40] to-emerald-600"
                >
                  {editingVenue ? 'Update Venue' : 'Add Venue'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}