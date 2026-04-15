import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/lib/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Settings, Building2, Phone, MapPin, DollarSign, TrendingUp, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BusinessSettings() {
  const { settings, saveSettings, loading } = useBusiness();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(form);
    setSaving(false);
    toast.success('Configuración guardada');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <Settings className="h-7 w-7 text-primary" />
          Configuración del Negocio
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estos datos se usan en todos los presupuestos e invoices automáticamente.
        </p>
      </div>

      {/* Business info */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Información del Negocio
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Nombre del negocio
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
                <Phone className="h-3 w-3" /> Teléfono
              </Label>
              <Input
                value={form.business_phone}
                onChange={e => update('business_phone', e.target.value)}
                placeholder="(000) 000-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Dirección / ZIP
              </Label>
              <Input
                value={form.business_address}
                onChange={e => update('business_address', e.target.value)}
                placeholder="Dirección o código postal"
              />
            </div>
          </div>

          <Separator />

          <h2 className="font-heading font-semibold text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-primary" /> Valores por Defecto (Invoices)
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Estos valores se pre-llenan automáticamente cada vez que creas un nuevo presupuesto.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Labor por hora ($)
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
                <TrendingUp className="h-3 w-3" /> Overhead por defecto (%)
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
                <TrendingUp className="h-3 w-3" /> Profit por defecto (%)
              </Label>
              <Input
                type="number"
                value={form.default_profit_pct}
                onChange={e => update('default_profit_pct', parseFloat(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="bg-primary/5 rounded-lg p-3 text-xs text-muted-foreground border border-primary/10">
            <strong className="text-foreground">Tip escalabilidad:</strong> Si manejas múltiples negocios,
            cada usuario de la app puede tener su propia configuración guardada. Solo cambia el nombre aquí
            y todos los nuevos invoices usarán esa info automáticamente.
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-dashed">
        <CardContent className="p-5 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Vista previa en invoice</p>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
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
        Guardar Configuración
      </Button>
    </div>
  );
}