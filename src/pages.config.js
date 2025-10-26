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
import TaskReports from './pages/TaskReports';
import SmartScheduler from './pages/SmartScheduler';
import AttendanceReports from './pages/AttendanceReports';
import DailyChecklists from './pages/DailyChecklists';
import ActiveChecklist from './pages/ActiveChecklist';
import ChecklistBuilder from './pages/ChecklistBuilder';
import ChecklistReview from './pages/ChecklistReview';
import WeeklyPayrollReport from './pages/WeeklyPayrollReport';
import StaffWagesReport from './pages/StaffWagesReport';
import DocumentManagement from './pages/DocumentManagement';
import DataManagement from './pages/DataManagement';
import BackupSettings from './pages/BackupSettings';
import NotFound from './pages/NotFound';
import Menu from './pages/Menu';
import AllergyTable from './pages/AllergyTable';
import EmailLog from './pages/EmailLog';
import PrivacyCenter from './pages/PrivacyCenter';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Layout from './Layout.jsx';

export const pages = [
  { name: 'Dashboard', path: '/', file: 'Dashboard.jsx', component: Dashboard, public: false },
  { name: 'Compliance', path: '/compliance', file: 'Compliance.jsx', component: Compliance, public: false },
  { name: 'Inventory', path: '/inventory', file: 'Inventory.jsx', component: Inventory, public: false },
  { name: 'Maintenance', path: '/maintenance', file: 'Maintenance.jsx', component: Maintenance, public: false },
  { name: 'Staff', path: '/staff', file: 'Staff.jsx', component: Staff, public: false },
  { name: 'Reports', path: '/reports', file: 'Reports.jsx', component: Reports, public: false },
  { name: 'ChecklistTemplates', path: '/checklist-templates', file: 'ChecklistTemplates.jsx', component: ChecklistTemplates, public: false },
  { name: 'MyChecklists', path: '/my-checklists', file: 'MyChecklists.jsx', component: MyChecklists, public: false },
  { name: 'ExecuteChecklist', path: '/execute-checklist', file: 'ExecuteChecklist.jsx', component: ExecuteChecklist, public: false },
  { name: 'ChecklistMonitor', path: '/checklist-monitor', file: 'ChecklistMonitor.jsx', component: ChecklistMonitor, public: false },
  { name: 'MenuManagement', path: '/menu-management', file: 'MenuManagement.jsx', component: MenuManagement, public: false },
  { name: 'SupplierManagement', path: '/supplier-management', file: 'SupplierManagement.jsx', component: SupplierManagement, public: false },
  { name: 'IngredientStock', path: '/ingredient-stock', file: 'IngredientStock.jsx', component: IngredientStock, public: false },
  { name: 'ProductionPlanning', path: '/production-planning', file: 'ProductionPlanning.jsx', component: ProductionPlanning, public: false },
  { name: 'Ordering', path: '/ordering', file: 'Ordering.jsx', component: Ordering, public: false },
  { name: 'OrderHistory', path: '/order-history', file: 'OrderHistory.jsx', component: OrderHistory, public: false },
  { name: 'MenuAnalysis', path: '/menu-analysis', file: 'MenuAnalysis.jsx', component: MenuAnalysis, public: false },
  { name: 'StaffRota', path: '/staff-rota', file: 'StaffRota.jsx', component: StaffRota, public: false },
  { name: 'MyShifts', path: '/my-shifts', file: 'MyShifts.jsx', component: MyShifts, public: false },
  { name: 'ClockInOut', path: '/clock-in-out', file: 'ClockInOut.jsx', component: ClockInOut, public: false },
  { name: 'ManageAvailability', path: '/manage-availability', file: 'ManageAvailability.jsx', component: ManageAvailability, public: false },
  { name: 'WeeklyRota', path: '/weekly-rota', file: 'WeeklyRota.jsx', component: WeeklyRota, public: false },
  { name: 'WeeklyRotaSchedule', path: '/weekly-rota-schedule', file: 'WeeklyRotaSchedule.jsx', component: WeeklyRotaSchedule, public: false },
  { name: 'InventoryManagement', path: '/inventory-management', file: 'InventoryManagement.jsx', component: InventoryManagement, public: false },
  { name: 'StaffModel', path: '/staff-model', file: 'StaffModel.jsx', component: StaffModel, public: false },
  { name: 'CultureBuilding', path: '/culture-building', file: 'CultureBuilding.jsx', component: CultureBuilding, public: false },
  { name: 'OnboardingTraining', path: '/onboarding-training', file: 'OnboardingTraining.jsx', component: OnboardingTraining, public: false },
  { name: 'PerformanceGrowth', path: '/performance-growth', file: 'PerformanceGrowth.jsx', component: PerformanceGrowth, public: false },
  { name: 'CoachingDashboard', path: '/coaching-dashboard', file: 'CoachingDashboard.jsx', component: CoachingDashboard, public: false },
  { name: 'StartCoachingSession', path: '/start-coaching-session', file: 'StartCoachingSession.jsx', component: StartCoachingSession, public: false },
  { name: 'CommunicationFeedback', path: '/communication-feedback', file: 'CommunicationFeedback.jsx', component: CommunicationFeedback, public: false },
  { name: 'TeamChat', path: '/team-chat', file: 'TeamChat.jsx', component: TeamChat, public: false },
  { name: 'Announcements', path: '/announcements', file: 'Announcements.jsx', component: Announcements, public: false },
  { name: 'SuggestionBox', path: '/suggestion-box', file: 'SuggestionBox.jsx', component: SuggestionBox, public: false },
  { name: 'TeamDirectory', path: '/team-directory', file: 'TeamDirectory.jsx', component: TeamDirectory, public: false },
  { name: 'AdvancedChecklists', path: '/advanced-checklists', file: 'AdvancedChecklists.jsx', component: AdvancedChecklists, public: false },
  { name: 'RestaurantRoutines', path: '/restaurant-routines', file: 'RestaurantRoutines.jsx', component: RestaurantRoutines, public: false },
  { name: 'FormBuilder', path: '/form-builder', file: 'FormBuilder.jsx', component: FormBuilder, public: false },
  { name: 'FormLibrary', path: '/form-library', file: 'FormLibrary.jsx', component: FormLibrary, public: false },
  { name: 'ManagerDashboard', path: '/manager-dashboard', file: 'ManagerDashboard.jsx', component: ManagerDashboard, public: false },
  { name: 'StaffProfile', path: '/staff-profile', file: 'StaffProfile.jsx', component: StaffProfile, public: false },
  { name: 'MyTasks', path: '/my-tasks', file: 'MyTasks.jsx', component: MyTasks, public: false },
  { name: 'TaskReports', path: '/task-reports', file: 'TaskReports.jsx', component: TaskReports, public: false },
  { name: 'SmartScheduler', path: '/smart-scheduler', file: 'SmartScheduler.jsx', component: SmartScheduler, public: false },
  { name: 'AttendanceReports', path: '/attendance-reports', file: 'AttendanceReports.jsx', component: AttendanceReports, public: false },
  { name: 'DailyChecklists', path: '/daily-checklists', file: 'DailyChecklists.jsx', component: DailyChecklists, public: false },
  { name: 'ActiveChecklist', path: '/active-checklist', file: 'ActiveChecklist.jsx', component: ActiveChecklist, public: false },
  { name: 'ChecklistBuilder', path: '/checklist-builder', file: 'ChecklistBuilder.jsx', component: ChecklistBuilder, public: false },
  { name: 'ChecklistReview', path: '/checklist-review', file: 'ChecklistReview.jsx', component: ChecklistReview, public: false },
  { name: 'WeeklyPayrollReport', path: '/weekly-payroll-report', file: 'WeeklyPayrollReport.jsx', component: WeeklyPayrollReport, public: false },
  { name: 'StaffWagesReport', path: '/staff-wages-report', file: 'StaffWagesReport.jsx', component: StaffWagesReport, public: false },
  { name: 'DocumentManagement', path: '/document-management', file: 'DocumentManagement.jsx', component: DocumentManagement, public: false },
  { name: 'DataManagement', path: '/data-management', file: 'DataManagement.jsx', component: DataManagement, public: false },
  { name: 'BackupSettings', path: '/backup-settings', file: 'BackupSettings.jsx', component: BackupSettings, public: false },
  { name: 'NotFound', path: '/404', file: 'NotFound.jsx', component: NotFound, public: true },
  { name: 'Menu', path: '/menu', file: 'Menu.jsx', component: Menu, public: false },
  { name: 'AllergyTable', path: '/allergy-table', file: 'AllergyTable.jsx', component: AllergyTable, public: false },
  { name: 'EmailLog', path: '/email-log', file: 'EmailLog.jsx', component: EmailLog, public: false },
  { name: 'PrivacyCenter', path: '/privacy-center', file: 'PrivacyCenter.jsx', component: PrivacyCenter, public: false },
  { name: 'PrivacyPolicy', path: '/privacy-policy', file: 'PrivacyPolicy.jsx', component: PrivacyPolicy, public: true },
];

export const pagesConfig = pages;

export { Layout };

export default pages;