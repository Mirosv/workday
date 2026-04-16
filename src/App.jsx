import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import QuoteBuilder from '@/pages/QuoteBuilder';
import InvoiceBuilderPage from '@/pages/InvoiceBuilderPage';
import MaterialConverter from '@/pages/MaterialConverter';
import JobTracker from '@/pages/JobTracker';
import MoneyTracker from '@/pages/MoneyTracker';
import BusinessSettingsPage from '@/pages/BusinessSettings';
import BookingAdmin from '@/pages/BookingAdmin';
import BookingPublic from '@/pages/BookingPublic';
import { BusinessProvider } from '@/lib/BusinessContext';
import SuperAdmin from '@/pages/SuperAdmin';
import ClockShark from '@/pages/ClockShark';
import MileageLog from '@/pages/MileageLog';
import OwnerTransactions from '@/pages/OwnerTransactions';
import TaxExport from '@/pages/TaxExport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <BusinessProvider>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<QuoteBuilder />} />
          <Route path="/quotes" element={<QuoteBuilder />} />
          <Route path="/invoices" element={<InvoiceBuilderPage />} />
          <Route path="/material-converter" element={<MaterialConverter />} />
          <Route path="/job-tracker" element={<JobTracker />} />
          <Route path="/money-tracker" element={<MoneyTracker />} />
          <Route path="/settings" element={<BusinessSettingsPage />} />
          <Route path="/booking" element={<BookingAdmin />} />
          <Route path="/super-admin" element={<SuperAdmin />} />
          <Route path="/clockshark" element={<ClockShark />} />
          <Route path="/mileage" element={<MileageLog />} />
          <Route path="/owner-transactions" element={<OwnerTransactions />} />
          <Route path="/tax-export" element={<TaxExport />} />
        </Route>
        <Route path="/booking/public" element={<BookingPublic />} />
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
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App