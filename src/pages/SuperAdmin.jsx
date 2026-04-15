import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Building2, Phone, MapPin, Globe, Users, ShieldCheck } from 'lucide-react';

const SUPER_ADMIN_EMAIL = 'valerio.miros85@gmail.com';

export default function SuperAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(user => {
      setCurrentUser(user);
      if (user?.email === SUPER_ADMIN_EMAIL) {
        return base44.entities.BusinessSettings.list('-created_date');
      }
      return [];
    }).then(list => {
      setCompanies(list || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (currentUser?.email !== SUPER_ADMIN_EMAIL) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <ShieldCheck className="h-12 w-12 opacity-30" />
        <p className="text-lg font-medium">Acceso restringido</p>
        <p className="text-sm">Solo el super administrador puede ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          Super Admin — Empresas Registradas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista global de todas las empresas conectadas al sistema.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{companies.length}</p>
              <p className="text-xs text-muted-foreground">Empresas registradas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Globe className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{companies.filter(c => c.language === 'en').length}</p>
              <p className="text-xs text-muted-foreground">En inglés</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold font-heading">{companies.filter(c => c.language === 'es').length}</p>
              <p className="text-xs text-muted-foreground">En español</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Companies list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {companies.length === 0 && (
          <p className="text-sm text-muted-foreground col-span-2 text-center py-10">No hay empresas registradas aún.</p>
        )}
        {companies.map(company => (
          <Card key={company.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-bold text-base truncate">{company.business_name || '—'}</p>
                  <p className="text-xs text-muted-foreground truncate">{company.created_by || '—'}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  {company.language === 'es' ? '🇪🇸 ES' : '🇺🇸 EN'}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                {company.business_phone && (
                  <p className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" /> {company.business_phone}
                  </p>
                )}
                {company.business_address && (
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" /> {company.business_address}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                <span>Labor: <strong className="text-foreground">${company.default_labor_rate}/hr</strong></span>
                <span>Overhead: <strong className="text-foreground">{company.default_overhead_pct}%</strong></span>
                <span>Profit: <strong className="text-foreground">{company.default_profit_pct}%</strong></span>
              </div>

              <p className="text-xs text-muted-foreground">
                Registrada: {company.created_date?.split('T')[0] || '—'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}