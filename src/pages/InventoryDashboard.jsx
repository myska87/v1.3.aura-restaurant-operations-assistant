import React from 'react';
import { Package, Truck, Calculator, ShoppingCart, TrendingUp } from 'lucide-react';
import DashboardTabsLayout from '../components/DashboardTabsLayout';
import InventoryManagement from './InventoryManagement';
import IngredientStock from './IngredientStock';
import SupplierManagement from './SupplierManagement';
import ProductionPlanning from './ProductionPlanning';
import OrderHistory from './OrderHistory';

export default function InventoryDashboard() {
  const tabs = [
    {
      value: 'inventory',
      label: 'Inventory',
      icon: Package,
      component: <InventoryManagement />,
    },
    {
      value: 'ingredients',
      label: 'Ingredients',
      icon: Package,
      component: <IngredientStock />,
    },
    {
      value: 'suppliers',
      label: 'Suppliers',
      icon: Truck,
      component: <SupplierManagement />,
    },
    {
      value: 'production',
      label: 'Production',
      icon: Calculator,
      component: <ProductionPlanning />,
    },
    {
      value: 'orders',
      label: 'Order History',
      icon: ShoppingCart,
      component: <OrderHistory />,
    },
  ];

  return (
    <DashboardTabsLayout
      title="Inventory Hub"
      description="Stock management, suppliers, and ordering"
      icon={Package}
      tabs={tabs}
      defaultTab="inventory"
      helpText="Complete inventory management from stock tracking to supplier orders and production planning."
      searchPlaceholder="Search inventory..."
    />
  );
}