import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FileText, Calculator, Briefcase, DollarSign, Menu, X, TreePine, Settings, LogOut, Receipt, ShieldCheck, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBusiness, SUPER_ADMIN_EMAIL } from '@/lib/BusinessContext';
import { base44 } from '@/api/base44Client';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');
  const location = useLocation();
  const { settings, tr } = useBusiness();

  const [currentUserRole, setCurrentUserRole] = useState('');
  const [roleLoaded, setRoleLoaded] = useState(false);

  // Derived role levels — only valid after roleLoaded
  const isSuperAdmin = currentUserEmail === SUPER_ADMIN_EMAIL;
  const isAdmin = currentUserRole === 'admin' && !isSuperAdmin;
  const isEmployee = roleLoaded && currentUserRole !== 'admin';

  const allNavItems = [
    { path: '/quotes', label: tr('quoteBuilder'), icon: FileText, adminOnly: true },
    { path: '/invoices', label: tr('invoiceBuilder'), icon: Receipt, adminOnly: true },
    { path: '/material-converter', label: tr('materialConverter'), icon: Calculator, adminOnly: true },
    { path: '/job-tracker', label: tr('crmPipeline'), icon: Briefcase, adminOnly: true },
    { path: '/money-tracker', label: tr('moneyTracker'), icon: DollarSign, adminOnly: true },

    { path: '/settings', label: tr('settings'), icon: Settings, adminOnly: true },
    { path: '/help', label: 'Ayuda', icon: HelpCircle, adminOnly: false },
  ];

  // Show all nav until role loads; then filter for employees
  const navItems = (!roleLoaded || isSuperAdmin || isAdmin)
    ? allNavItems
    : allNavItems.filter(item => !item.adminOnly);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUserEmail(u?.email || '');
      setCurrentUserRole(u?.role || '');
      setRoleLoaded(true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-background font-body">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TreePine className="h-6 w-6 text-sidebar-primary" />
          <span className="font-heading font-bold text-sidebar-foreground text-lg">{settings.business_name}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="text-sidebar-foreground">
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 z-40 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="p-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center overflow-hidden shrink-0">
              {settings.logo_url
                ? <img src={settings.logo_url} alt="Logo" className="h-full w-full object-contain" />
                : <TreePine className="h-5 w-5 text-sidebar-primary" />}
            </div>
            <div>
              <h1 className="font-heading font-bold text-sidebar-foreground text-lg leading-tight">{settings.business_name}</h1>
              <p className="text-xs text-sidebar-foreground/60">{settings.business_phone || tr('configureBusiness')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {currentUserEmail === SUPER_ADMIN_EMAIL && (
            <Link
              to="/super-admin"
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mt-2 border border-sidebar-border",
                location.pathname === '/super-admin'
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Super Admin
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3">
          <p className="text-xs text-sidebar-foreground/40 text-center">{settings.business_address || ''}</p>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="h-4 w-4 mr-2" /> {tr('logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}