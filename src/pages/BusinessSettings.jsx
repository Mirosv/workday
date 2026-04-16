import React, { useState, useEffect, useRef } from 'react';
import { useBusiness } from '@/lib/BusinessContext';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Building2, Phone, MapPin, DollarSign, TrendingUp, Save, Loader2, ImagePlus, Globe, X, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import PlanSelector from '@/components/billing/PlanSelector';
import { useSearchParams } from 'react-router-dom';

export default function BusinessSettings() {
  const { settings, saveSettings, loading, tr } = useBusiness();
  const [currentUserRole, setCurrentUserRole] = useState('');

  useEffect(() => {
    base44.auth.me().then(u => setCurrentUserRole(u?.role || ''));
  }, []);
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    setForm(settings);
    if (searchParams.get('plan_success') === '1') {
      toast.success('¡Plan actualizado! Tu suscripción está activa.');
    }
  }, [settings]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    update('logo_url', file_url);
    setUploadingLogo(false);
    toast.success(tr('logoUploaded'));
  };

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
    toast.success(tr('settingsSaved'));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (currentUserRole && currentUserRole !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Settings className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Acceso restringido</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Solo los administradores pueden configurar la empresa.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" />
          {tr('settingsTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tr('settingsDesc')}
        </p>
      </div>

      {/* Business info */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> {tr('businessInfo')}
          </h2>

          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ImagePlus className="h-3 w-3" /> {tr('businessLogo')}
            </Label>
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl border-2 border-dashed border-border bg-muted/40 flex items-center justify-center overflow-hidden shrink-0">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-2" />}
                  {uploadingLogo ? tr('uploading') : tr('uploadLogo')}
                </Button>
                {form.logo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive h-7 px-2 text-xs"
                    onClick={() => update('logo_url', '')}
                  >
                    <X className="h-3 w-3 mr-1" /> {tr('removeLogo')}
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">{tr('logoHint')}</p>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> {tr('businessName')}
              </Label>
              <Input
                value={form.business_name}
                onChange={e => update('business_name', e.target.value)}
                placeholder="Nombre de tu empresa"
                className="text-lg font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3 w-3" /> {tr('phone')}
              </Label>
              <Input
                value={form.business_phone}
                onChange={e => update('business_phone', e.target.value)}
                placeholder="(000) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> {tr('address')}
              </Label>
              <Input
                value={form.business_address}
                onChange={e => update('business_address', e.target.value)}
                placeholder="Dirección o código postal"
              />
            </div>
          </div>

          <Separator />

          {/* Language */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Globe className="h-3 w-3" /> {tr('appLanguage')}
            </Label>
            <Select value={form.language || 'en'} onValueChange={v => update('language', v)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">🇺🇸 English</SelectItem>
                <SelectItem value="es">🇪🇸 Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> {tr('defaults')}
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            {tr('defaultsDesc')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> {tr('laborPerHour')}
              </Label>
              <Input
                type="number"
                value={form.default_labor_rate}
                onChange={e => update('default_labor_rate', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> {tr('defaultOverhead')}
              </Label>
              <Input
                type="number"
                value={form.default_overhead_pct}
                onChange={e => update('default_overhead_pct', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> {tr('defaultProfit')}
              </Label>
              <Input
                type="number"
                value={form.default_profit_pct}
                onChange={e => update('default_profit_pct', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardContent className="p-5 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{tr('invoicePreview')}</p>
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
            </div>
            <div>
              <p className="font-heading font-bold text-lg text-primary">{form.business_name || 'Nombre del negocio'}</p>
              <p className="text-sm text-muted-foreground">
                {form.business_phone || 'Teléfono'} {form.business_phone && form.business_address ? '•' : ''} {form.business_address || 'Dirección'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg" className="w-full sm:w-auto">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {tr('saveSettings')}
      </Button>

      {/* Billing / Plans */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Plan y Suscripción
          </h2>
          <PlanSelector currentPlan={settings.plan || 'free'} />
        </CardContent>
      </Card>
    </div>
  );
}