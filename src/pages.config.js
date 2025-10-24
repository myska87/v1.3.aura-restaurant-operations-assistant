import Dashboard from './pages/Dashboard';
import Compliance from './pages/Compliance';
import Inventory from './pages/Inventory';
import Maintenance from './pages/Maintenance';
import Staff from './pages/Staff';
import Reports from './pages/Reports';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Compliance": Compliance,
    "Inventory": Inventory,
    "Maintenance": Maintenance,
    "Staff": Staff,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};