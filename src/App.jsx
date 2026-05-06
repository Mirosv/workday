import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import QuoteBuilder from '@/pages/QuoteBuilder';
import InvoiceBuilderPage from '@/pages/InvoiceBuilderPage';
import MaterialConverter from '@/pages/MaterialConverter';
import JobTracker from '@/pages/JobTracker';
import MoneyTracker from '@/pages/MoneyTracker';
import BusinessSettingsPage from '@/pages/BusinessSettings';
import { BusinessProvider } from '@/lib/BusinessContext';
import SuperAdmin from '@/pages/SuperAdmin';
import Help from '@/pages/Help';
import DataExport from '@/pages/DataExport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <BusinessProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/"                   element={<QuoteBuilder />} />
          <Route path="/quotes"             element={<QuoteBuilder />} />
          <Route path="/invoices"           element={<InvoiceBuilderPage />} />
          <Route path="/material-converter" element={<MaterialConverter />} />
          <Route path="/job-tracker"        element={<JobTracker />} />
          <Route path="/money-tracker"      element={<MoneyTracker />} />
          <Route path="/settings"           element={<BusinessSettingsPage />} />
          <Route path="/super-admin"        element={<SuperAdmin />} />
          <Route path="/help"               element={<Help />} />
          <Route path="/export"             element={<DataExport />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </BusinessProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*"     element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
