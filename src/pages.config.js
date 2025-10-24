import Dashboard from './pages/Dashboard';
import Compliance from './pages/Compliance';
import Inventory from './pages/Inventory';
import Maintenance from './pages/Maintenance';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import ChecklistTemplates from './pages/ChecklistTemplates';
import MyChecklists from './pages/MyChecklists';
import ExecuteChecklist from './pages/ExecuteChecklist';
import ChecklistMonitor from './pages/ChecklistMonitor';
import MenuManagement from './pages/MenuManagement';
import SupplierManagement from './pages/SupplierManagement';
import IngredientStock from './pages/IngredientStock';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Compliance": Compliance,
    "Inventory": Inventory,
    "Maintenance": Maintenance,
    "Staff": Staff,
    "Reports": Reports,
    "ChecklistTemplates": ChecklistTemplates,
    "MyChecklists": MyChecklists,
    "ExecuteChecklist": ExecuteChecklist,
    "ChecklistMonitor": ChecklistMonitor,
    "MenuManagement": MenuManagement,
    "SupplierManagement": SupplierManagement,
    "IngredientStock": IngredientStock,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};