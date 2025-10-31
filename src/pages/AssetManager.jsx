import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Wrench,
  AlertTriangle,
  CheckCircle,
  Calendar,
  MapPin,
  Upload,
  FileText,
  Download,
  Clock,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import AccessGuard from '../components/AccessGuard';

const CATEGORY_ICONS = {
  kitchen_equipment: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  refrigeration: { icon: Package, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  hvac: { icon: Package, color: 'text-purple-600', bg: 'bg-purple-100' },
  furniture: { icon: Package, color: 'text-amber-600', bg: 'bg-amber-100' },
  technology: { icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-100' },
  cleaning_equipment: { icon: Package, color: 'text-green-600', bg: 'bg-green-100' },
  bar_equipment: { icon: Package, color: 'text-pink-600', bg: 'bg-pink-100' },
  safety_equipment: { icon: Package, color: 'text-red-600', bg: 'bg-red-100' },
  other: { icon: Package, color: 'text-gray-600', bg: 'bg-gray-100' },
};

export default function AssetManager() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showMaintenanceLog, setShowMaintenanceLog] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '',
    category: 'kitchen_equipment',
    location: '',
    serial_number: '',
    purchase_date: '',
    service_due_date: '',
    condition: 'good',
    status: 'active',
    supplier_name: '',
    supplier_contact: '',
    notes: '',
    photo_url: '',
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets'],
    queryFn: () => base44.entities.AssetItem.list('-created_date'),
  });

  const createAssetMutation = useMutation({
    mutationFn: (data) => base44.entities.AssetItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setShowAddAsset(false);
      setNewAsset({
        name: '',
        category: 'kitchen_equipment',
        location: '',
        serial_number: '',
        purchase_date: '',
        service_due_date: '',
        condition: 'good',
        status: 'active',
        supplier_name: '',
        supplier_contact: '',
        notes: '',
        photo_url: '',
      });
    },
  });

  const updateAssetMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AssetItem.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      setSelectedAsset(null);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setNewAsset(prev => ({ ...prev, photo_url: file_url }));
    } catch (error) {
      alert('Failed to upload photo');
    }
    setUploadingPhoto(false);
  };

  const handleCreateAsset = () => {
    if (!newAsset.name || !newAsset.location) {
      alert('Please fill in asset name and location');
      return;
    }

    createAssetMutation.mutate({
      ...newAsset,
      assigned_to: user?.email,
      assigned_to_name: user?.full_name,
      maintenance_logs: [],
    });
  };

  const handleAddMaintenanceLog = async (asset, logEntry) => {
    const updatedLogs = [...(asset.maintenance_logs || []), logEntry];
    
    await updateAssetMutation.mutateAsync({
      id: asset.id,
      data: {
        maintenance_logs: updatedLogs,
        last_service_date: logEntry.date,
        service_due_date: logEntry.next_due,
      }
    });

    setShowMaintenanceLog(false);
  };

  // Filter assets
  const filteredAssets = assets.filter(asset => {
    const matchesSearch = !searchQuery ||
      asset.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = filterLocation === 'all' || asset.location === filterLocation;
    const matchesCategory = filterCategory === 'all' || asset.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || asset.status === filterStatus;
    
    return matchesSearch && matchesLocation && matchesCategory && matchesStatus;
  });

  // Stats
  const totalAssets = assets.length;
  const underMaintenance = assets.filter(a => a.status === 'under_maintenance').length;
  const upcomingServices = assets.filter(a => {
    if (!a.service_due_date) return false;
    const daysUntil = differenceInDays(new Date(a.service_due_date), new Date());
    return daysUntil > 0 && daysUntil <= 30;
  }).length;
  const overdueServices = assets.filter(a => {
    if (!a.service_due_date) return false;
    return new Date(a.service_due_date) < new Date();
  }).length;

  const uniqueLocations = [...new Set(assets.map(a => a.location).filter(Boolean))];

  return (
    <AccessGuard allowedRoles={['admin']} allowedPositions={['owner', 'manager']}>
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#004C3F] to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <Package className="w-9 h-9 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">Asset Manager</h1>
                  <p className="text-gray-600 text-lg">Track, maintain, and manage all physical assets</p>
                </div>
              </div>

              <Button
                onClick={() => setShowAddAsset(true)}
                className="bg-gradient-to-r from-[#004C3F] to-emerald-600 hover:from-[#003830] hover:to-emerald-700"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Asset
              </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-none shadow-lg">
                <CardContent className="p-6">
                  <Package className="w-10 h-10 mb-3 opacity-90" />
                  <p className="text-3xl font-bold">{totalAssets}</p>
                  <p className="text-sm opacity-90">Total Assets</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-none shadow-lg">
                <CardContent className="p-6">
                  <Wrench className="w-10 h-10 mb-3 opacity-90" />
                  <p className="text-3xl font-bold">{underMaintenance}</p>
                  <p className="text-sm opacity-90">Under Maintenance</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-none shadow-lg">
                <CardContent className="p-6">
                  <Calendar className="w-10 h-10 mb-3 opacity-90" />
                  <p className="text-3xl font-bold">{upcomingServices}</p>
                  <p className="text-sm opacity-90">Services Due (30 days)</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-500 to-pink-600 text-white border-none shadow-lg">
                <CardContent className="p-6">
                  <AlertTriangle className="w-10 h-10 mb-3 opacity-90" />
                  <p className="text-3xl font-bold">{overdueServices}</p>
                  <p className="text-sm opacity-90">Overdue Services</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <Card className="bg-white shadow-md mb-6">
            <CardContent className="p-4">
              <div className="grid md:grid-cols-4 gap-4">
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
                    {uniqueLocations.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="kitchen_equipment">Kitchen Equipment</SelectItem>
                    <SelectItem value="refrigeration">Refrigeration</SelectItem>
                    <SelectItem value="hvac">HVAC</SelectItem>
                    <SelectItem value="furniture">Furniture</SelectItem>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="cleaning_equipment">Cleaning Equipment</SelectItem>
                    <SelectItem value="bar_equipment">Bar Equipment</SelectItem>
                    <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
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
                    <SelectItem value="retired">Retired</SelectItem>
                    <SelectItem value="broken">Broken</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Assets Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssets.map((asset) => {
              const daysUntilService = asset.service_due_date 
                ? differenceInDays(new Date(asset.service_due_date), new Date())
                : null;
              
              const isOverdue = daysUntilService !== null && daysUntilService < 0;
              const isDueSoon = daysUntilService !== null && daysUntilService >= 0 && daysUntilService <= 7;

              const statusColors = {
                active: 'bg-green-100 text-green-800 border-green-300',
                under_maintenance: 'bg-orange-100 text-orange-800 border-orange-300',
                retired: 'bg-gray-100 text-gray-800 border-gray-300',
                broken: 'bg-red-100 text-red-800 border-red-300',
              };

              const conditionColors = {
                excellent: 'bg-green-100 text-green-800',
                good: 'bg-blue-100 text-blue-800',
                fair: 'bg-yellow-100 text-yellow-800',
                poor: 'bg-orange-100 text-orange-800',
                needs_replacement: 'bg-red-100 text-red-800',
              };

              return (
                <Card
                  key={asset.id}
                  className="bg-white border-2 border-gray-200 hover:border-[#004C3F] hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedAsset(asset)}
                >
                  {asset.photo_url && (
                    <div className="h-48 w-full overflow-hidden rounded-t-xl">
                      <img
                        src={asset.photo_url}
                        alt={asset.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{asset.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span>{asset.location}</span>
                        </div>
                      </div>
                      <Badge className={statusColors[asset.status]} variant="outline">
                        {asset.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-2 mb-4">
                      <Badge className={conditionColors[asset.condition]}>
                        {asset.condition}
                      </Badge>
                      <Badge variant="outline" className="ml-2 capitalize">
                        {asset.category.replace('_', ' ')}
                      </Badge>
                    </div>

                    {asset.service_due_date && (
                      <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
                        isOverdue ? 'bg-red-50 text-red-800' :
                        isDueSoon ? 'bg-amber-50 text-amber-800' :
                        'bg-green-50 text-green-800'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        <div>
                          <p className="font-semibold">
                            {isOverdue ? `⚠️ Overdue ${Math.abs(daysUntilService)} days` :
                             isDueSoon ? `Due in ${daysUntilService} days` :
                             `Service due ${format(new Date(asset.service_due_date), 'MMM d')}`}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                        }}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Details
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-[#004C3F] hover:bg-[#003830]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAsset(asset);
                          setShowMaintenanceLog(true);
                        }}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Service Log
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {filteredAssets.length === 0 && (
              <div className="col-span-full text-center py-16">
                <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium text-lg">No assets found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {assets.length === 0 ? 'Start by adding your first asset' : 'Try adjusting your filters'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add Asset Dialog */}
        <Dialog open={showAddAsset} onOpenChange={setShowAddAsset}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-6 h-6 text-emerald-600" />
                Add New Asset
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Asset Name *</label>
                  <Input
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder="e.g., Commercial Oven #1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Location *</label>
                  <Input
                    value={newAsset.location}
                    onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })}
                    placeholder="e.g., Main Kitchen"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select value={newAsset.category} onValueChange={(value) => setNewAsset({ ...newAsset, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kitchen_equipment">Kitchen Equipment</SelectItem>
                      <SelectItem value="refrigeration">Refrigeration</SelectItem>
                      <SelectItem value="hvac">HVAC</SelectItem>
                      <SelectItem value="furniture">Furniture</SelectItem>
                      <SelectItem value="technology">Technology</SelectItem>
                      <SelectItem value="cleaning_equipment">Cleaning Equipment</SelectItem>
                      <SelectItem value="bar_equipment">Bar Equipment</SelectItem>
                      <SelectItem value="safety_equipment">Safety Equipment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Serial Number</label>
                  <Input
                    value={newAsset.serial_number}
                    onChange={(e) => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                    placeholder="e.g., SN-12345"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Purchase Date</label>
                  <Input
                    type="date"
                    value={newAsset.purchase_date}
                    onChange={(e) => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <Select value={newAsset.condition} onValueChange={(value) => setNewAsset({ ...newAsset, condition: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                      <SelectItem value="needs_replacement">Needs Replacement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={newAsset.status} onValueChange={(value) => setNewAsset({ ...newAsset, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="under_maintenance">Under Maintenance</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="broken">Broken</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier Name</label>
                  <Input
                    value={newAsset.supplier_name}
                    onChange={(e) => setNewAsset({ ...newAsset, supplier_name: e.target.value })}
                    placeholder="e.g., KitchenPro Ltd"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Supplier Contact</label>
                  <Input
                    value={newAsset.supplier_contact}
                    onChange={(e) => setNewAsset({ ...newAsset, supplier_contact: e.target.value })}
                    placeholder="Phone or email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Service Due Date</label>
                <Input
                  type="date"
                  value={newAsset.service_due_date}
                  onChange={(e) => setNewAsset({ ...newAsset, service_due_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Photo</label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('asset-photo-upload').click()}
                    disabled={uploadingPhoto}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </Button>
                  <input
                    id="asset-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                {newAsset.photo_url && (
                  <img src={newAsset.photo_url} alt="Preview" className="h-32 w-32 object-cover rounded-lg border mt-2" />
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Notes</label>
                <Textarea
                  value={newAsset.notes}
                  onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })}
                  placeholder="Additional information..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddAsset(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateAsset}
                  disabled={createAssetMutation.isPending}
                  className="bg-gradient-to-r from-[#004C3F] to-emerald-600"
                >
                  {createAssetMutation.isPending ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Asset Details Dialog */}
        {selectedAsset && !showMaintenanceLog && (
          <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="w-6 h-6 text-emerald-600" />
                  {selectedAsset.name}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {selectedAsset.photo_url && (
                  <img
                    src={selectedAsset.photo_url}
                    alt={selectedAsset.name}
                    className="w-full h-64 object-cover rounded-xl"
                  />
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-semibold text-gray-900">{selectedAsset.location}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-semibold text-gray-900 capitalize">{selectedAsset.category.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Serial Number</p>
                    <p className="font-semibold text-gray-900">{selectedAsset.serial_number || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Condition</p>
                    <Badge className={`capitalize ${
                      selectedAsset.condition === 'excellent' ? 'bg-green-100 text-green-800' :
                      selectedAsset.condition === 'good' ? 'bg-blue-100 text-blue-800' :
                      selectedAsset.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedAsset.condition}
                    </Badge>
                  </div>
                  {selectedAsset.purchase_date && (
                    <div>
                      <p className="text-sm text-gray-600">Purchase Date</p>
                      <p className="font-semibold text-gray-900">{format(new Date(selectedAsset.purchase_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {selectedAsset.service_due_date && (
                    <div>
                      <p className="text-sm text-gray-600">Next Service Due</p>
                      <p className="font-semibold text-gray-900">{format(new Date(selectedAsset.service_due_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>

                {selectedAsset.notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Notes</p>
                    <p className="text-gray-900 bg-gray-50 p-4 rounded-lg">{selectedAsset.notes}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-[#004C3F]"
                    onClick={() => setShowMaintenanceLog(true)}
                  >
                    <Wrench className="w-4 h-4 mr-2" />
                    View Maintenance Log
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Maintenance Log Dialog */}
        {showMaintenanceLog && selectedAsset && (
          <MaintenanceLogDialog
            asset={selectedAsset}
            onClose={() => {
              setShowMaintenanceLog(false);
              setSelectedAsset(null);
            }}
            onAddLog={handleAddMaintenanceLog}
          />
        )}
      </div>
    </AccessGuard>
  );
}

function MaintenanceLogDialog({ asset, onClose, onAddLog }) {
  const [showAddLog, setShowAddLog] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split('T')[0],
    performed_by: '',
    actions_taken: '',
    next_due: '',
    cost: 0,
  });

  const handleAdd = () => {
    if (!newLog.actions_taken) {
      alert('Please describe the actions taken');
      return;
    }

    onAddLog(asset, {
      ...newLog,
      date: new Date(newLog.date).toISOString(),
      performed_by: newLog.performed_by,
      attachments: [],
    });

    setNewLog({
      date: new Date().toISOString().split('T')[0],
      performed_by: '',
      actions_taken: '',
      next_due: '',
      cost: 0,
    });
    setShowAddLog(false);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-6 h-6 text-emerald-600" />
            Maintenance Log: {asset.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Button
            onClick={() => setShowAddLog(!showAddLog)}
            className="bg-[#004C3F]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Maintenance Record
          </Button>

          {showAddLog && (
            <Card className="bg-blue-50 border-2 border-blue-300">
              <CardContent className="p-4 space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={newLog.date}
                      onChange={(e) => setNewLog({ ...newLog, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Performed By</label>
                    <Input
                      value={newLog.performed_by}
                      onChange={(e) => setNewLog({ ...newLog, performed_by: e.target.value })}
                      placeholder="Technician name"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Actions Taken</label>
                  <Textarea
                    value={newLog.actions_taken}
                    onChange={(e) => setNewLog({ ...newLog, actions_taken: e.target.value })}
                    placeholder="Describe maintenance performed..."
                    rows={3}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium">Next Service Due</label>
                    <Input
                      type="date"
                      value={newLog.next_due}
                      onChange={(e) => setNewLog({ ...newLog, next_due: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Cost (£)</label>
                    <Input
                      type="number"
                      value={newLog.cost}
                      onChange={(e) => setNewLog({ ...newLog, cost: parseFloat(e.target.value) })}
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddLog(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAdd} className="bg-emerald-600">
                    Save Log
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Maintenance History */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Maintenance History</h3>
            {asset.maintenance_logs && asset.maintenance_logs.length > 0 ? (
              asset.maintenance_logs.map((log, idx) => (
                <Card key={idx} className="border-l-4 border-l-emerald-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{format(new Date(log.date), 'PPP')}</p>
                        <p className="text-sm text-gray-600">By {log.performed_by}</p>
                      </div>
                      {log.cost > 0 && (
                        <Badge className="bg-amber-100 text-amber-800">£{log.cost}</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{log.actions_taken}</p>
                    {log.next_due && (
                      <p className="text-xs text-gray-500 mt-2">Next service: {format(new Date(log.next_due), 'MMM d, yyyy')}</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="bg-gray-50">
                <CardContent className="p-8 text-center">
                  <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No maintenance records yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}