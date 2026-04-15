import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { FileText, Calculator, Briefcase, DollarSign, Menu, X, TreePine, Settings, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useBusiness } from '@/lib/BusinessContext';

const navItems = [
  { path: '/', label: 'Invoice Builder', icon: FileText },
  { path: '/material-converter', label: 'Material Converter', icon: Calculator },
  { path: '/job-tracker', label: 'CRM Pipeline', icon: Briefcase },
  { path: '/money-tracker', label: 'Money Tracker', icon: DollarSign },
  { path: '/booking', label: 'Booking', icon: CalendarDays },
  { path: '/settings', label: 'Configuración', icon: Settings },
];

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { settings } = useBusiness();

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
            <div className="h-10 w-10 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
              <TreePine className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-sidebar-foreground text-lg leading-tight">{settings.business_name}</h1>
              <p className="text-xs text-sidebar-foreground/60">{settings.business_phone || 'Configure tu negocio'}</p>
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
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 text-center">{settings.business_address || ''}</p>
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