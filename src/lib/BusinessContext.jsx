import React, { createContext, useContext, useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const BusinessContext = createContext(null);

const DEFAULT_SETTINGS = {
  business_name: 'Mi Empresa',
  business_phone: '',
  business_address: '',
  default_labor_rate: 0,
  default_overhead_pct: 0,
  default_profit_pct: 0,
  language: 'en',
};

export function BusinessProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.BusinessSettings.list().then(list => {
      if (list && list.length > 0) {
        const s = list[0];
        setSettings({ ...DEFAULT_SETTINGS, ...s });
        setSettingsId(s.id);
      }
      setLoading(false);
    });
  }, []);

  const saveSettings = async (newSettings) => {
    if (settingsId) {
      const updated = await base44.entities.BusinessSettings.update(settingsId, newSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...updated });
    } else {
      const created = await base44.entities.BusinessSettings.create(newSettings);
      setSettings({ ...DEFAULT_SETTINGS, ...created });
      setSettingsId(created.id);
    }
  };

  return (
    <BusinessContext.Provider value={{ settings, saveSettings, loading }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within BusinessProvider');
  return ctx;
}