import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/client';
import { t } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';

const BusinessContext = createContext(null);

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
  const { user } = useAuth();
  const [settings, setSettings]   = useState(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!user) return;
    if (user.email === SUPER_ADMIN_EMAIL) { setLoading(false); return; }

    const load = async () => {
      try {
        const s = await base44.entities.BusinessSettings.list();
        // API returns the single record for the current tenant
        const record = Array.isArray(s) ? s[0] : s;
        if (record) {
          setSettings({ ...DEFAULT_SETTINGS, ...record });
          setSettingsId(record.id);
        }
      } catch (err) {
        console.error('Failed to load business settings:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user?.id]);

  const saveSettings = async (newSettings) => {
    if (settingsId) {
      const updated = await base44.entities.BusinessSettings.update(settingsId, newSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...updated });
    } else {
      const created = await base44.entities.BusinessSettings.create({
        ...newSettings,
        owner_email: user?.email,
      });
      setSettings({ ...DEFAULT_SETTINGS, ...created });
      setSettingsId(created.id);
    }
  };

  const lang = settings.language || 'en';
  const tr = (key) => t(lang, key);

  return (
    <BusinessContext.Provider value={{ settings, saveSettings, loading, currentUser: user, lang, tr }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}
