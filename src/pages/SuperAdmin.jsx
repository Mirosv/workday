import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Building2, Phone, MapPin, Globe, Users, ShieldCheck,
  Edit2, Trash2, PauseCircle, PlayCircle, Crown, Zap, Star, Settings2, KeyRound, Save, Eye, EyeOff
} from 'lucide-react';
import { toast } from 'sonner';

const SUPER_ADMIN_EMAIL = 'valerio.miros85@gmail.com';

const PLANS = {
  free: { label: 'Free', price: '$0', color: 'bg-muted text-muted-foreground', icon: Zap },
  pro: { label: 'Pro', price: '$25/mo', color: 'bg-blue-100 text-blue-700', icon: Star },
  premium: { label: 'Premium', price: '$50/mo', color: 'bg-amber-100 text-amber-700', icon: Crown },
};

const PLAN_FEATURES = {
  free: {
    label: 'Free — $0',
    features: [
      { key: 'quotes', label: 'Quotes / Estimates', limit: '5 per month' },
      { key: 'invoices', label: 'Invoices', limit: '3 per month' },
      { key: 'jobs', label: 'CRM Jobs', limit: '10 total' },
      { key: 'expenses', label: 'Money Tracker', limit: 'Basic (no project link)' },
      { key: 'booking', label: 'Booking Page', limit: '❌ Not included' },
      { key: 'material', label: 'Material Converter', limit: '✅ Included' },
      { key: 'branding', label: 'Custom Logo/Branding', limit: '❌ Not included' },
      { key: 'reports', label: 'Revenue Reports', limit: '❌ Not included' },
    ]
  },
  pro: {
    label: 'Pro — $25/mo',
    features: [
      { key: 'quotes', label: 'Quotes / Estimates', limit: 'Unlimited' },
      { key: 'invoices', label: 'Invoices', limit: 'Unlimited' },
      { key: 'jobs', label: 'CRM Jobs', limit: 'Unlimited' },
      { key: 'expenses', label: 'Money Tracker', limit: 'Full + project linking' },
      { key: 'booking', label: 'Booking Page', limit: '✅ Included' },
      { key: 'material', label: 'Material Converter', limit: '✅ Included' },
      { key: 'branding', label: 'Custom Logo/Branding', limit: '✅ Included' },
      { key: 'reports', label: 'Revenue Reports', limit: 'Basic charts' },
    ]
  },
  premium: {
    label: 'Premium — $50/mo',
    features: [
      { key: 'quotes', label: 'Quotes / Estimates', limit: 'Unlimited' },
      { key: 'invoices', label: 'Invoices', limit: 'Unlimited + PDF export' },
      { key: 'jobs', label: 'CRM Jobs', limit: 'Unlimited + priority flags' },
      { key: 'expenses', label: 'Money Tracker', limit: 'Full + history + categories' },
      { key: 'booking', label: 'Booking Page', limit: '✅ + custom URL' },
      { key: 'material', label: 'Material Converter', limit: '✅ Included' },
      { key: 'branding', label: 'Custom Logo/Branding', limit: '✅ Included' },
      { key: 'reports', label: 'Revenue Reports', limit: 'Full KPI dashboard' },
    ]
  }
};

const STATUS_CONFIG = {
  active: { label: 'Active', class: 'bg-green-100 text-green-700' },
  suspended: { label: 'Suspended', class: 'bg-orange-100 text-orange-700' },
  deleted: { label: 'Deleted', class: 'bg-red-100 text-red-600' },
};

export default function SuperAdmin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCompany, setEditingCompany] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    const user = await base44.auth.me();
    setCurrentUser(user);
    if (user?.email === SUPER_ADMIN_EMAIL) {
      const list = await base44.entities.BusinessSettings.list('-created_date');
      setCompanies(list || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.BusinessSettings.update(editingCompany.id, {
      plan: editingCompany.plan,
      status: editingCompany.status,
      plan_expires_at: editingCompany.plan_expires_at,
      notes: editingCompany.notes,
      business_name: editingCompany.business_name,
      business_phone: editingCompany.business_phone,
      business_address: editingCompany.business_address,
    });
    toast.success('Empresa actualizada');
    setEditingCompany(null);
    setSaving(false);
    load();
  };

  const handleSuspend = async (company) => {
    const newStatus = company.status === 'suspended' ? 'active' : 'suspended';
    await base44.entities.BusinessSettings.update(company.id, { status: newStatus });
    toast.success(newStatus === 'suspended' ? 'Empresa suspendida' : 'Empresa reactivada');
    load();
  };

  const handleDelete = async (company) => {
    await base44.entities.BusinessSettings.update(company.id, { status: 'deleted' });
    toast.success('Empresa eliminada (lógicamente)');
    setConfirmDelete(null);
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
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

  const active = companies.filter(c => c.status !== 'deleted' && c.status !== 'suspended');
  const suspended = companies.filter(c => c.status === 'suspended');
  const deleted = companies.filter(c => c.status === 'deleted');
  const byPlan = { free: companies.filter(c => c.plan === 'free' || !c.plan).length, pro: companies.filter(c => c.plan === 'pro').length, premium: companies.filter(c => c.plan === 'premium').length };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" />
          Super Admin
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de empresas, planes y accesos.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatPill label="Empresas activas" value={active.length} color="text-primary" icon={Building2} />
        <StatPill label="Suspendidas" value={suspended.length} color="text-orange-600" icon={PauseCircle} />
        <StatPill label="Free" value={byPlan.free} color="text-muted-foreground" icon={Zap} />
        <StatPill label="Pro + Premium" value={byPlan.pro + byPlan.premium} color="text-amber-600" icon={Crown} />
      </div>

      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Empresas ({companies.length})</TabsTrigger>
          <TabsTrigger value="plans">Planes de Acceso</TabsTrigger>
          <TabsTrigger value="stripe">⚙️ Stripe Config</TabsTrigger>
        </TabsList>

        {/* COMPANIES TAB */}
        <TabsContent value="companies" className="space-y-3 mt-4">
          {companies.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-10">No hay empresas registradas aún.</p>
          )}
          {companies.map(company => {
            const plan = PLANS[company.plan || 'free'];
            const PlanIcon = plan.icon;
            const status = STATUS_CONFIG[company.status || 'active'];
            return (
              <Card key={company.id} className={company.status === 'deleted' ? 'opacity-40' : company.status === 'suspended' ? 'border-orange-200 bg-orange-50/30' : ''}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    {/* Logo + info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-11 w-11 rounded-xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
                        {company.logo_url
                          ? <img src={company.logo_url} alt="Logo" className="h-full w-full object-contain" />
                          : <Building2 className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading font-bold text-sm truncate">{company.business_name || '—'}</p>
                        <p className="text-xs text-muted-foreground truncate">{company.owner_email || company.created_by || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {company.business_phone && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><Phone className="h-2.5 w-2.5" />{company.business_phone}</span>}
                          {company.business_address && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{company.business_address}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${plan.color}`}>
                        <PlanIcon className="h-3 w-3" /> {plan.label} {plan.price}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.class}`}>
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{company.language === 'es' ? '🇪🇸' : '🇺🇸'}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" className="h-8 px-2.5" onClick={() => setEditingCompany({ ...company })}>
                        <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                      {company.status !== 'deleted' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className={`h-8 px-2.5 ${company.status === 'suspended' ? 'text-green-600 border-green-300' : 'text-orange-600 border-orange-300'}`}
                          onClick={() => handleSuspend(company)}
                        >
                          {company.status === 'suspended'
                            ? <><PlayCircle className="h-3.5 w-3.5 mr-1" /> Activar</>
                            : <><PauseCircle className="h-3.5 w-3.5 mr-1" /> Suspender</>}
                        </Button>
                      )}
                      {company.status !== 'deleted' && (
                        <Button variant="ghost" size="sm" className="h-8 px-2.5 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(company)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {company.notes && (
                    <p className="text-xs text-muted-foreground mt-2 border-t pt-2">📝 {company.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* PLANS TAB */}
        <TabsContent value="plans" className="mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Object.entries(PLAN_FEATURES).map(([planKey, planData]) => {
              const plan = PLANS[planKey];
              const PlanIcon = plan.icon;
              return (
                <Card key={planKey} className={planKey === 'premium' ? 'border-amber-300 shadow-md' : planKey === 'pro' ? 'border-blue-200' : ''}>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PlanIcon className={`h-5 w-5 ${planKey === 'premium' ? 'text-amber-500' : planKey === 'pro' ? 'text-blue-500' : 'text-muted-foreground'}`} />
                      {plan.label}
                    </CardTitle>
                    <p className={`text-2xl font-heading font-bold ${planKey === 'premium' ? 'text-amber-600' : planKey === 'pro' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                      {plan.price}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {byPlan[planKey]} empresa{byPlan[planKey] !== 1 ? 's' : ''} activa{byPlan[planKey] !== 1 ? 's' : ''}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {planData.features.map(f => (
                        <div key={f.key} className="flex flex-col">
                          <span className="text-xs font-medium text-foreground">{f.label}</span>
                          <span className="text-xs text-muted-foreground">{f.limit}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <Card className="mt-4 border-dashed">
            <CardContent className="p-4 text-sm text-muted-foreground text-center">
              <Settings2 className="h-5 w-5 mx-auto mb-2 opacity-50" />
              Para cambiar el plan de una empresa, edítala desde la pestaña <strong>Empresas</strong> → botón <strong>Editar</strong>.
            </CardContent>
          </Card>
        </TabsContent>
        {/* STRIPE CONFIG TAB */}
        <TabsContent value="stripe" className="mt-4">
          <StripeConfigPanel />
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {editingCompany && (
        <Dialog open onOpenChange={() => setEditingCompany(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-4 w-4" /> Editar Empresa
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre del negocio</Label>
                <Input value={editingCompany.business_name || ''} onChange={e => setEditingCompany({ ...editingCompany, business_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                <Input value={editingCompany.business_phone || ''} onChange={e => setEditingCompany({ ...editingCompany, business_phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Dirección</Label>
                <Input value={editingCompany.business_address || ''} onChange={e => setEditingCompany({ ...editingCompany, business_address: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Plan</Label>
                  <Select value={editingCompany.plan || 'free'} onValueChange={v => setEditingCompany({ ...editingCompany, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">🔋 Free ($0)</SelectItem>
                      <SelectItem value="pro">⭐ Pro ($25/mo)</SelectItem>
                      <SelectItem value="premium">👑 Premium ($50/mo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select value={editingCompany.status || 'active'} onValueChange={v => setEditingCompany({ ...editingCompany, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">✅ Activo</SelectItem>
                      <SelectItem value="suspended">⏸ Suspendido</SelectItem>
                      <SelectItem value="deleted">🗑 Eliminado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Plan expira (opcional)</Label>
                <Input type="date" value={editingCompany.plan_expires_at || ''} onChange={e => setEditingCompany({ ...editingCompany, plan_expires_at: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notas internas</Label>
                <Input value={editingCompany.notes || ''} onChange={e => setEditingCompany({ ...editingCompany, notes: e.target.value })} placeholder="Notas para el equipo admin..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingCompany(null)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />} Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <Dialog open onOpenChange={() => setConfirmDelete(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" /> Eliminar empresa
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              ¿Estás seguro que deseas eliminar <strong>{confirmDelete.business_name}</strong>? Esta acción es lógica (no se borra la data).
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => handleDelete(confirmDelete)}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StripeConfigPanel() {
  const [fields, setFields] = useState({
    STRIPE_SECRET_KEY: '',
    STRIPE_WEBHOOK_SECRET: '',
    STRIPE_PRICE_PRO: '',
    STRIPE_PRICE_PREMIUM: '',
  });
  const [show, setShow] = useState({});
  const [saving, setSaving] = useState(false);

  const LABELS = {
    STRIPE_SECRET_KEY: 'Stripe Secret Key (sk_...)',
    STRIPE_WEBHOOK_SECRET: 'Webhook Secret (whsec_...)',
    STRIPE_PRICE_PRO: 'Price ID — Plan Pro (price_...)',
    STRIPE_PRICE_PREMIUM: 'Price ID — Plan Premium (price_...)',
  };

  const handleSave = async () => {
    setSaving(true);
    const toSave = Object.entries(fields).filter(([, v]) => v.trim() !== '');
    if (toSave.length === 0) {
      toast.error('Ingresa al menos un valor para guardar.');
      setSaving(false);
      return;
    }
    try {
      await Promise.all(
        toSave.map(([key, value]) =>
          base44.functions.invoke('saveStripeSecret', { key, value })
        )
      );
      toast.success('Configuración guardada. Los campos en blanco no se modificaron.');
      setFields({ STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', STRIPE_PRICE_PRO: '', STRIPE_PRICE_PREMIUM: '' });
    } catch (err) {
      toast.error('Error al guardar: ' + (err?.message || 'desconocido'));
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-primary" /> Configuración de Stripe
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Actualiza las claves de Stripe. Deja en blanco los campos que no deseas cambiar.
          Los valores actuales son privados y no se muestran por seguridad.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(LABELS).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-xs font-medium">{label}</Label>
            <div className="flex gap-2">
              <Input
                type={show[key] ? 'text' : 'password'}
                placeholder={`Nuevo valor para ${key}`}
                value={fields[key]}
                onChange={e => setFields(f => ({ ...f, [key]: e.target.value }))}
                className="font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                type="button"
                onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
              >
                {show[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        ))}
        <div className="pt-2 border-t">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Guardar cambios
          </Button>
        </div>
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">🔗 Links útiles de Stripe:</p>
          <p>• <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-primary underline">API Keys</a> — Obtén tu Secret Key</p>
          <p>• <a href="https://dashboard.stripe.com/products" target="_blank" rel="noreferrer" className="text-primary underline">Products</a> — Copia los Price IDs (price_...)</p>
          <p>• <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noreferrer" className="text-primary underline">Webhooks</a> — Configura el endpoint y copia el Webhook Secret</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StatPill({ label, value, color, icon: Icon }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <Icon className={`h-5 w-5 ${color}`} />
        <div>
          <p className={`text-2xl font-bold font-heading ${color}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}