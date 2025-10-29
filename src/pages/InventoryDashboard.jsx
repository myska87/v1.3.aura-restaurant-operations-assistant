import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Package, BarChart3, Settings } from 'lucide-react';

// Lazy load components
const InventoryManagement = React.lazy(() => import('./InventoryManagement'));
const IngredientStock = React.lazy(() => import('./IngredientStock'));
const SupplierManagement = React.lazy(() => import('./SupplierManagement'));
const Ordering = React.lazy(() => import('./Ordering'));
const OrderHistory = React.lazy(() => import('./OrderHistory'));
const ProductionPlanning = React.lazy(() => import('./ProductionPlanning'));
const MenuAnalysis = React.lazy(() => import('./MenuAnalysis'));

const LoadingFallback = () => (
  <Card>
    <CardContent className="p-12 text-center">
      <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </CardContent>
  </Card>
);

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Inventory Hub</h1>
                <p className="text-gray-600">Stock control, suppliers, and menu costing</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">
                <Package className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="manage">
                <Settings className="w-4 h-4 mr-2" />
                Manage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <React.Suspense fallback={<LoadingFallback />}>
                <InventoryManagement />
              </React.Suspense>
            </TabsContent>

            <TabsContent value="analytics">
              <React.Suspense fallback={<LoadingFallback />}>
                <MenuAnalysis />
              </React.Suspense>
            </TabsContent>

            <TabsContent value="manage">
              <Tabs defaultValue="ingredients" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                  <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                  <TabsTrigger value="ordering">Orders</TabsTrigger>
                  <TabsTrigger value="production">Production</TabsTrigger>
                </TabsList>

                <TabsContent value="ingredients">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <IngredientStock />
                  </React.Suspense>
                </TabsContent>

                <TabsContent value="suppliers">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <SupplierManagement />
                  </React.Suspense>
                </TabsContent>

                <TabsContent value="ordering">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <div className="space-y-6">
                      <Ordering />
                      <OrderHistory />
                    </div>
                  </React.Suspense>
                </TabsContent>

                <TabsContent value="production">
                  <React.Suspense fallback={<LoadingFallback />}>
                    <ProductionPlanning />
                  </React.Suspense>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}