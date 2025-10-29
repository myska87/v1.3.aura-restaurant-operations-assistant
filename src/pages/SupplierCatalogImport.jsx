import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Home,
  ArrowLeft,
  Users,
  Download,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SupplierCatalogImport() {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [catalogFile, setCatalogFile] = useState(null);
  const [importResults, setImportResults] = useState(null);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAuthorized = user?.role === 'admin' || user?.position === 'manager' || user?.position === 'owner';

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
  });

  const { data: catalogItems = [] } = useQuery({
    queryKey: ['supplierCatalog'],
    queryFn: () => base44.entities.SupplierCatalog.list(),
    enabled: isAuthorized,
  });

  const createCatalogMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierCatalog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplierCatalog'] });
    },
  });

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCatalogFile(file);
    }
  };

  const handleImportCatalog = async () => {
    if (!selectedSupplier || !catalogFile) {
      alert('⚠️ Please select a supplier and upload a file');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;

    setProcessing(true);
    setImportResults(null);

    try {
      // Upload file
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: catalogFile });
      setUploading(false);

      // Extract data from file using AI
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  product_name: { type: "string" },
                  sku: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  unit: { type: "string" },
                  unit_price: { type: "number" },
                  pack_size: { type: "string" },
                  minimum_order_quantity: { type: "number" },
                }
              }
            }
          }
        }
      });

      if (extractionResult.status === 'error') {
        alert(`❌ Failed to extract data: ${extractionResult.details}`);
        setProcessing(false);
        return;
      }

      const items = extractionResult.output?.items || [];
      
      if (items.length === 0) {
        alert('⚠️ No items found in the file. Please check the format.');
        setProcessing(false);
        return;
      }

      // Import items into SupplierCatalog
      let successCount = 0;
      let errorCount = 0;

      for (const item of items) {
        try {
          await createCatalogMutation.mutateAsync({
            supplier_id: supplier.id,
            supplier_name: supplier.name,
            product_name: item.product_name || 'Unknown Product',
            sku: item.sku || '',
            description: item.description || '',
            category: item.category || 'other',
            unit: item.unit || 'unit',
            unit_price: item.unit_price || 0,
            pack_size: item.pack_size || '',
            minimum_order_quantity: item.minimum_order_quantity || 1,
            in_stock: true,
            is_active: true,
          });
          successCount++;
        } catch (error) {
          console.error('Error importing item:', error);
          errorCount++;
        }
      }

      setImportResults({
        total: items.length,
        success: successCount,
        errors: errorCount,
        items: items,
      });

      alert(`✅ Import Complete!\n\n${successCount} items imported successfully\n${errorCount} errors`);
      
      // Reset form
      setCatalogFile(null);
      setSelectedSupplier("");
      
    } catch (error) {
      console.error('Error importing catalog:', error);
      alert('❌ Failed to import catalog. Please try again.');
    }
    
    setProcessing(false);
  };

  const downloadTemplate = () => {
    const csvContent = `Product Name,SKU,Description,Category,Unit,Unit Price,Pack Size,Minimum Order Quantity
Milk (Whole),MILK-001,Fresh whole milk,dairy,liters,1.20,2L bottle,5
Tomatoes (Cherry),TOM-CHERRY,Fresh cherry tomatoes,produce,kg,3.50,500g pack,2
Olive Oil,OIL-001,Extra virgin olive oil,dry_goods,liters,8.99,1L bottle,1
Chicken Breast,CHICK-001,Fresh chicken breast,meat,kg,6.50,1kg pack,3`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'supplier-catalog-template.csv';
    a.click();
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-900 mb-2">Access Restricted</h2>
              <p className="text-red-700 mb-6">
                This page is only accessible to Managers and Administrators.
              </p>
              <Link to={createPageUrl("Dashboard")}>
                <Button>
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
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
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <Link to={createPageUrl("SupplierManagement")}>
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              Suppliers
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <Upload className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Supplier Catalog Import</h1>
              <p className="text-gray-600">Import product catalogs from CSV/Excel files</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Import Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Import New Catalog
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Supplier</Label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Upload Catalog File (CSV or Excel)</Label>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('catalog-file-upload').click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {catalogFile ? catalogFile.name : 'Choose File'}
                  </Button>
                  <input
                    id="catalog-file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">📋 File Format Guidelines</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Include columns: Product Name, SKU, Unit Price, Pack Size</li>
                  <li>• Optional: Description, Category, Min Order Qty</li>
                  <li>• Save as CSV or Excel format</li>
                  <li>• Use the template below for best results</li>
                </ul>
              </div>

              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>

              <Button
                onClick={handleImportCatalog}
                disabled={!selectedSupplier || !catalogFile || processing}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                {processing ? 'Importing...' : uploading ? 'Uploading...' : 'Import Catalog'}
              </Button>

              {importResults && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-semibold text-green-900">Import Complete!</h4>
                  </div>
                  <p className="text-sm text-green-800">
                    ✅ {importResults.success} items imported successfully
                  </p>
                  {importResults.errors > 0 && (
                    <p className="text-sm text-red-700">
                      ❌ {importResults.errors} items failed
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Catalog Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Catalog Items ({catalogItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {catalogItems.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No catalog items yet</p>
                  <p className="text-sm text-gray-400 mt-1">Import a catalog to get started</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {catalogItems.slice(0, 20).map((item) => (
                    <div key={item.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start mb-1">
                        <div>
                          <p className="font-semibold text-gray-900">{item.product_name}</p>
                          <p className="text-xs text-gray-600">{item.supplier_name}</p>
                        </div>
                        <Badge className={item.in_stock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {item.in_stock ? 'In Stock' : 'Out of Stock'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                        <div>
                          <p className="text-gray-600">SKU:</p>
                          <p className="font-medium">{item.sku || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Price:</p>
                          <p className="font-medium">£{item.unit_price?.toFixed(2) || '0.00'}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Pack:</p>
                          <p className="font-medium">{item.pack_size || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}