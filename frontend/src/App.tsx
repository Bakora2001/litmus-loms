import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import DebtTracker from './pages/DebtTracker';
import CyberServices from './pages/CyberServices';
import LaptopStore from './pages/LaptopStore';
import Inventory from './pages/Inventory';
import Tasks from './pages/Tasks';
import Invoices from './pages/Invoices';
import BulkSMS from './pages/BulkSMS';
import CalendarPage from './pages/CalendarPage';
import Reports from './pages/Reports';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/debt-tracker" element={<ProtectedRoute><DebtTracker /></ProtectedRoute>} />
      <Route path="/cyber-services" element={<ProtectedRoute><CyberServices /></ProtectedRoute>} />
      <Route path="/laptop-store" element={<ProtectedRoute><LaptopStore /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/bulk-sms" element={<ProtectedRoute><BulkSMS /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/transactions" element={<ProtectedRoute><CyberServices /></ProtectedRoute>} />
    </Routes>
  );
}
