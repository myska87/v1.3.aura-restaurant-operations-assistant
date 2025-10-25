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
import ProductionPlanning from './pages/ProductionPlanning';
import Ordering from './pages/Ordering';
import OrderHistory from './pages/OrderHistory';
import MenuAnalysis from './pages/MenuAnalysis';
import StaffRota from './pages/StaffRota';
import MyShifts from './pages/MyShifts';
import ClockInOut from './pages/ClockInOut';
import ManageAvailability from './pages/ManageAvailability';
import WeeklyRota from './pages/WeeklyRota';
import WeeklyRotaSchedule from './pages/WeeklyRotaSchedule';
import InventoryManagement from './pages/InventoryManagement';
import StaffModel from './pages/StaffModel';
import CultureBuilding from './pages/CultureBuilding';
import OnboardingTraining from './pages/OnboardingTraining';
import PerformanceGrowth from './pages/PerformanceGrowth';
import CoachingDashboard from './pages/CoachingDashboard';
import StartCoachingSession from './pages/StartCoachingSession';
import CommunicationFeedback from './pages/CommunicationFeedback';
import TeamChat from './pages/TeamChat';
import Announcements from './pages/Announcements';
import SuggestionBox from './pages/SuggestionBox';
import TeamDirectory from './pages/TeamDirectory';
import AdvancedChecklists from './pages/AdvancedChecklists';
import RestaurantRoutines from './pages/RestaurantRoutines';
import FormBuilder from './pages/FormBuilder';
import FormLibrary from './pages/FormLibrary';
import ManagerDashboard from './pages/ManagerDashboard';
import StaffProfile from './pages/StaffProfile';
import MyTasks from './pages/MyTasks';
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
    "ProductionPlanning": ProductionPlanning,
    "Ordering": Ordering,
    "OrderHistory": OrderHistory,
    "MenuAnalysis": MenuAnalysis,
    "StaffRota": StaffRota,
    "MyShifts": MyShifts,
    "ClockInOut": ClockInOut,
    "ManageAvailability": ManageAvailability,
    "WeeklyRota": WeeklyRota,
    "WeeklyRotaSchedule": WeeklyRotaSchedule,
    "InventoryManagement": InventoryManagement,
    "StaffModel": StaffModel,
    "CultureBuilding": CultureBuilding,
    "OnboardingTraining": OnboardingTraining,
    "PerformanceGrowth": PerformanceGrowth,
    "CoachingDashboard": CoachingDashboard,
    "StartCoachingSession": StartCoachingSession,
    "CommunicationFeedback": CommunicationFeedback,
    "TeamChat": TeamChat,
    "Announcements": Announcements,
    "SuggestionBox": SuggestionBox,
    "TeamDirectory": TeamDirectory,
    "AdvancedChecklists": AdvancedChecklists,
    "RestaurantRoutines": RestaurantRoutines,
    "FormBuilder": FormBuilder,
    "FormLibrary": FormLibrary,
    "ManagerDashboard": ManagerDashboard,
    "StaffProfile": StaffProfile,
    "MyTasks": MyTasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};