import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { t } from '@/lib/i18n';

const BusinessContext = createContext(null);

// 3 levels:
// super_admin  → email === SUPER_ADMIN_EMAIL, role: 'admin'  (platform owner)
// admin        → role: 'admin', normal business owner
// employee     → role: 'user', works for an admin
export const SUPER_ADMIN_EMAIL = 'valerio.miros85@gmail.com';

const DEFAULT_SETTINGS = {
  business_name: 'Mi Empresa',
  business_phone: '',
  business_address: '',
  logo_url: '',
  default_labor_rate: 0,
  default_overhead_pct: 0,
  default_profit_pct: 0,
  language: 'en',
};

export function BusinessProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);

      const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;

      if (isSuperAdmin) return; // no business settings needed

      if (user.role === 'admin') {
        // Admin (business owner): RLS ensures list() only returns their own records
        const list = await base44.entities.BusinessSettings.list();
        if (list && list.length > 0) {
          const s = list[0];
          setSettings({ ...DEFAULT_SETTINGS, ...s });
          setSettingsId(s.id);
        }
      } else {
        // Employee: find which business they belong to via their employee record
        const empList = await base44.entities.Employee.filter({ email: user.email });
        if (empList && empList.length > 0) {
          const ownerEmail = empList[0].business_owner_email;
          // Use owner_email field to find the right settings record
          const list = await base44.entities.BusinessSettings.filter({ owner_email: ownerEmail });
          if (list && list.length > 0) {
            const s = list[0];
            setSettings({ ...DEFAULT_SETTINGS, ...s });
            setSettingsId(s.id);
          }
        }
      }
    };

    load().catch(console.error).finally(() => setLoading(false));
  }, []);

  const saveSettings = async (newSettings) => {
    // Always persist owner_email so employees can look up their admin's settings
    const payload = { ...newSettings, owner_email: currentUser?.email };
    if (settingsId) {
      const updated = await base44.entities.BusinessSettings.update(settingsId, payload);
      setSettings({ ...DEFAULT_SETTINGS, ...updated });
    } else {
      const created = await base44.entities.BusinessSettings.create(payload);
      setSettings({ ...DEFAULT_SETTINGS, ...created });
      setSettingsId(created.id);
    }
  };

  const lang = settings.language || 'en';
  const tr = (key) => t(lang, key);

  return (
    <BusinessContext.Provider value={{ settings, saveSettings, loading, currentUser, lang, tr }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}