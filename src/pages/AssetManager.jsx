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
  Package,
  Plus,
  Search,
  Camera,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { format, addDays, differenceInDays } from 'date-fns';

export default function AssetManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [showMaintenanceLog, setShowMaintenanceLog] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [formData, setFormData] = useState({
    name: '',
    category: 'kitchen_equipment',
    photo_url: '',
    location: '',
    serial_number: '',
    purchase_date: '',
    purchase_cost: '',
    supplier_name: '',
    supplier_contact: '',
    warranty_expiry: '',
    last_service_date: '',
    next_service_date: '',
    service_frequency_days: 90,
    condition: 'good',
    status: 'active',
    assigned_to_email: '',
    assigned_to_name: '',
    notes: '',
    is_critical: false,
    maintenance_logs: [],
  });

  const [maintenanceEntry, setMaintenanceEntry] = useState({
    actions_taken: '',
    cost: '',
    next_due: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.AssetItem.list('-created_date'),
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => base44.entities.User.list(),
  });

  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.AssetItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      resetForm();
      alert('✅ Asset created successfully!');
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssetItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      resetForm();
      alert('✅ Asset updated successfully!');
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (id) => base44.entities.AssetItem.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      alert('✅ Asset deleted successfully!');
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingAsset(null);
    setFormData({
      name: '',
      category: 'kitchen_equipment',
      photo_url: '',
      location: '',
      serial_number: '',
      purchase_date: '',
      purchase_cost: '',
      supplier_name: '',
      supplier_contact: '',
      warranty_expiry: '',
      last_service_date: '',
      next_service_date: '',
      service_frequency_days: 90,
      condition: 'good',
      status: 'active',
      assigned_to_email: '',
      assigned_to_name: '',
      notes: '',
      is_critical: false,
      maintenance_logs: [],
    });
  };

  const handleEdit = (asset) => {
    setEditingAsset(asset);
    setFormData({
      ...asset,
      purchase_cost: asset.purchase_cost?.toString() || '',
      service_frequency_days: asset.service_frequency_days || 90,
    });
    setShowForm(true);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, photo_url: file_url }));
    } catch (error) {
      console.error('Photo upload failed:', error);
      alert('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const data = {
      ...formData,
      purchase_cost: formData.purchase_cost ? parseFloat(formData.purchase_cost) : null,
      service_frequency_days: parseInt(formData.service_frequency_days),
    };

    if (editingAsset) {
      await updateAssetMutation.mutateAsync({ id: editingAsset.id, data });
    } else {
      await createAssetMutation.mutateAsync(data);
    }
  };

  const handleAddMaintenance = async (asset) => {
    if (!maintenanceEntry.actions_taken) {
      alert('Please describe the maintenance actions taken');
      return;
    }

    const newLog = {
      date: new Date().toISOString(),
      performed_by: user?.full_name,
      actions_taken: maintenanceEntry.actions_taken,
      cost: maintenanceEntry.cost ? parseFloat(maintenanceEntry.cost) : 0,
      next_due: maintenanceEntry.next_due || null,
      attachments: [],
    };

    const updatedLogs = [...(asset.maintenance_logs || []), newLog];

    await updateAssetMutation.mutateAsync({
      id: asset.id,
      data: {
        maintenance_logs: updatedLogs,
        last_service_date: format(new Date(), 'yyyy-MM-dd'),
        next_service_date: maintenanceEntry.next_due || null,
        status: 'active',
      }
    });

    setShowMaintenanceLog(null);
    setMaintenanceEntry({ actions_taken: '', cost: '', next_due: '' });
  };

  // Filters
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchQuery ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || asset.location === filterLocation;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    
    return matchesSearch && matchesLocation && matchesStatus;
  });

  const totalAssets = assets.length;
  const underMaintenance = assets.filter(a => a.status === 'under_maintenance').length;
  const serviceDueSoon = assets.filter(a => {
    if (!a.next_service_date) return false;
    const daysUntil = differenceInDays(new Date(a.next_service_date), new Date());
    return daysUntil >= 0 && daysUntil <= 30;
  }).length;

  const locations = [...new Set(assets.map(a => a.location).filter(Boolean))];

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-300';
      case 'under_maintenance': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'out_of_service': return 'bg-red-100 text-red-800 border-red-300';
      case 'retired': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition) => {
    switch (condition) {
      case 'excellent': return 'text-green-700';
      case 'good': return 'text-blue-700';
      case 'fair': return 'text-yellow-700';
      case 'poor': return 'text-orange-700';
      case 'needs_repair': return 'text-red-700';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Asset Manager</h1>
            <p className="text-gray-600">Track equipment, maintenance, and service schedules</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Asset
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <Package className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold mb-1">{totalAssets}</p>
              <p className="text-sm opacity-90">Total Assets</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <Wrench className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold mb-1">{underMaintenance}</p>
              <p className="text-sm opacity-90">Under Maintenance</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-none shadow-lg">
            <CardContent className="p-6">
              <Clock className="w-10 h-10 mb-3 opacity-90" />
              <p className="text-3xl font-bold mb-1">{serviceDueSoon}</p>
              <p className="text-sm opacity-90">Service Due (30 days)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white shadow-md mb-6">
          <CardContent className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search assets..."
                  className="pl-10"
                />
              </div>

              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                  <SelectItem value="out_of_service">Out of Service</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Assets Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">No assets found</p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Asset
              </Button>
            </div>
          ) : (
            filteredAssets.map((asset) => {
              const daysUntilService = asset.next_service_date
                ? differenceInDays(new Date(asset.next_service_date), new Date())
                : null;
              
              const isServiceDue = daysUntilService !== null && daysUntilService <= 7;
              const isOverdue = daysUntilService !== null && daysUntilService < 0;

              return (
                <Card key={asset.id} className="bg-white border-2 border-gray-200 hover:shadow-xl transition-all">
                  {asset.photo_url && (
                    <div className="h-48 overflow-hidden rounded-t-lg">
                      <img
                        src={asset.photo_url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{asset.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{asset.category.replace('_', ' ')}</p>
                      </div>
                      {asset.is_critical && (
                        <Badge className="bg-red-100 text-red-800">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Critical
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mb-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <MapPin className="w-4 h-4" />
                        {asset.location}
                      </div>
                      {asset.assigned_to_name && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <Package className="w-4 h-4" />
                          {asset.assigned_to_name}
                        </div>
                      )}
                      {asset.next_service_date && (
                        <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-700 font-semibold' : isServiceDue ? 'text-orange-700' : 'text-gray-700'}`}>
                          <Calendar className="w-4 h-4" />
                          Service: {format(new Date(asset.next_service_date), 'MMM d, yyyy')}
                          {isOverdue && ' (OVERDUE)'}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 mb-4">
                      <Badge className={getStatusColor(asset.status)}>
                        {asset.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getConditionColor(asset.condition)}>
                        {asset.condition}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => setShowMaintenanceLog(asset)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Wrench className="w-4 h-4 mr-1" />
                        Maintenance ({asset.maintenance_logs?.length || 0})
                      </Button>
                      <Button
                        onClick={() => handleEdit(asset)}
                        variant="ghost"
                        size="icon"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm(`Delete ${asset.name}?`)) {
                            deleteAssetMutation.mutate(asset.id);
                          }
                        }}
                        variant="ghost"
                        size="icon"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Add/Edit Asset Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAsset ? 'Edit Asset' : 'Add New Asset'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Asset Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Commercial Oven #1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kitchen_equipment">Kitchen Equipment</SelectItem>
                    <SelectItem value="refrigeration">Refrigeration</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
                    <SelectItem value="cleaning_equipment">Cleaning Equipment</SelectItem>
                    <SelectItem value="vehicles">Vehicles</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Main Kitchen, Bar Area"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  placeholder="Model/Serial number"
                />
              </div>

              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Purchase Cost (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Supplier Name</Label>
                <Input
                  value={formData.supplier_name}
                  onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                  placeholder="Supplier or manufacturer"
                />
              </div>

              <div className="space-y-2">
                <Label>Supplier Contact</Label>
                <Input
                  value={formData.supplier_contact}
                  onChange={(e) => setFormData({ ...formData, supplier_contact: e.target.value })}
                  placeholder="Phone or email"
                />
              </div>

              <div className="space-y-2">
                <Label>Warranty Expiry</Label>
                <Input
                  type="date"
                  value={formData.warranty_expiry}
                  onChange={(e) => setFormData({ ...formData, warranty_expiry: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Next Service Date</Label>
                <Input
                  type="date"
                  value={formData.next_service_date}
                  onChange={(e) => setFormData({ ...formData, next_service_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Service Frequency (days)</Label>
                <Input
                  type="number"
                  value={formData.service_frequency_days}
                  onChange={(e) => setFormData({ ...formData, service_frequency_days: e.target.value })}
                  placeholder="90"
                />
              </div>

              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={formData.condition} onValueChange={(value) => setFormData({ ...formData, condition: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="fair">Fair</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                    <SelectItem value="needs_repair">Needs Repair</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select value={formData.assigned_to_email} onValueChange={(value) => {
                  const selectedStaff = staff.find(s => s.email === value);
                  setFormData({
                    ...formData,
                    assigned_to_email: value,
                    assigned_to_name: selectedStaff?.full_name || ''
                  });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>None</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.email} value={s.email}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Photo</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('asset-photo-upload').click()}
                  disabled={uploadingPhoto}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {uploadingPhoto ? 'Uploading...' : formData.photo_url ? 'Change Photo' : 'Upload Photo'}
                </Button>
                <input
                  id="asset-photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>
              {formData.photo_url && (
                <img src={formData.photo_url} alt="Asset" className="h-32 object-cover rounded-lg mt-2" />
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_critical"
                checked={formData.is_critical}
                onChange={(e) => setFormData({ ...formData, is_critical: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_critical">Critical Asset (affects operations if down)</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancel
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">
                {editingAsset ? 'Update Asset' : 'Create Asset'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Maintenance Log Dialog */}
      <Dialog open={!!showMaintenanceLog} onOpenChange={(open) => !open && setShowMaintenanceLog(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-600" />
              Maintenance Log: {showMaintenanceLog?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            {/* Add New Maintenance Entry */}
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Record New Maintenance</h3>
                <div className="space-y-3">
                  <div>
                    <Label>Actions Taken *</Label>
                    <Textarea
                      value={maintenanceEntry.actions_taken}
                      onChange={(e) => setMaintenanceEntry({ ...maintenanceEntry, actions_taken: e.target.value })}
                      placeholder="Describe maintenance performed..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Cost (£)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={maintenanceEntry.cost}
                        onChange={(e) => setMaintenanceEntry({ ...maintenanceEntry, cost: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Next Service Due</Label>
                      <Input
                        type="date"
                        value={maintenanceEntry.next_due}
                        onChange={(e) => setMaintenanceEntry({ ...maintenanceEntry, next_due: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => handleAddMaintenance(showMaintenanceLog)}
                    className="w-full bg-emerald-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Maintenance Record
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Maintenance History */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Maintenance History</h3>
              {showMaintenanceLog?.maintenance_logs?.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No maintenance records yet</p>
              ) : (
                <div className="space-y-3">
                  {showMaintenanceLog?.maintenance_logs?.map((log, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{log.performed_by}</p>
                            <p className="text-sm text-gray-600">{format(new Date(log.date), 'PPP')}</p>
                          </div>
                          {log.cost > 0 && (
                            <Badge className="bg-blue-100 text-blue-800">
                              £{log.cost.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{log.actions_taken}</p>
                        {log.next_due && (
                          <p className="text-sm text-gray-600">
                            Next due: {format(new Date(log.next_due), 'MMM d, yyyy')}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}