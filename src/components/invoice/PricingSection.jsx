import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { DollarSign } from 'lucide-react';

export default function PricingSection({ data, onChange, totals }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  const addonField = (label, amountKey, toggleKey) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <Switch
          checked={data[toggleKey]}
          onCheckedChange={v => update(toggleKey, v)}
        />
        <Label className="text-sm">{label}</Label>
      </div>
      {data[toggleKey] && (
        <Input
          type="number"
          inputMode="decimal"
          pattern="[0-9]*"
          value={data[amountKey]}
          onChange={e => update(amountKey, parseFloat(e.target.value) || 0)}
          className="w-24 h-8 text-xs text-right"
          placeholder="0.00"
        />
      )}
      {!data[toggleKey] && (
        <span className="text-xs text-muted-foreground">Off</span>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-base flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" /> Pricing Settings & Totals
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Labor $/hr</Label>
          <Input inputMode="decimal" pattern="[0-9]*" type="number" value={data.labor_rate} onChange={e => update('labor_rate', parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Labor hours</Label>
          <Input inputMode="decimal" pattern="[0-9]*" type="number" value={data.labor_hours} onChange={e => update('labor_hours', parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Overhead %</Label>
          <Input inputMode="decimal" pattern="[0-9]*" type="number" value={data.overhead_pct} onChange={e => update('overhead_pct', parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Profit %</Label>
          <Input inputMode="decimal" pattern="[0-9]*" type="number" value={data.profit_pct} onChange={e => update('profit_pct', parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Min job fee $</Label>
          <Input inputMode="decimal" pattern="[0-9]*" type="number" value={data.minimum_fee} onChange={e => update('minimum_fee', parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Discount $</Label>
          <Input inputMode="decimal" pattern="[0-9]*" type="number" value={data.discount} onChange={e => update('discount', parseFloat(e.target.value) || 0)} className="h-9" />
        </div>
      </div>

      <Separator />

      {/* Add-ons */}
      <div className="space-y-1">
        {addonField('Equipment wear & tear', 'equipment_wear', 'equipment_wear_on')}
        {addonField('Materials & consumables', 'materials_consumables', 'materials_on')}
        {addonField('Disposal fees', 'disposal_fees', 'disposal_on')}
        {addonField('Travel & mobilization', 'travel_mobilization', 'travel_on')}
      </div>

      <Separator />

      {/* Totals */}
      <div className="space-y-2 text-sm">
        <TotalRow label={`Services subtotal`} value={totals.servicesSubtotal} sub={`${totals.serviceCount} item(s)`} />
        <TotalRow label="Labor" value={totals.labor} sub={`${data.labor_hours} hr × $${data.labor_rate.toFixed(2)}/hr`} />
        {data.equipment_wear_on && <TotalRow label="Equipment wear & tear" value={data.equipment_wear} />}
        {data.materials_on && <TotalRow label="Materials & consumables" value={data.materials_consumables} />}
        {data.disposal_on && <TotalRow label="Disposal fees" value={data.disposal_fees} />}
        {data.travel_on && <TotalRow label="Travel & mobilization" value={data.travel_mobilization} />}
        <TotalRow label="Overhead" value={totals.overhead} sub={`${data.overhead_pct}%`} />
        <TotalRow label="Profit" value={totals.profit} sub={`${data.profit_pct}%`} />
        {data.discount > 0 && <TotalRow label="Discount" value={-data.discount} sub="—" isNeg />}
        
        <Separator />
        
        <div className="flex justify-between items-center pt-2">
          <span className="font-heading font-bold text-lg">Grand Total</span>
          <span className="font-heading font-bold text-xl text-primary">${totals.grandTotal.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function TotalRow({ label, value, sub, isNeg }) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <span className="font-medium">{label}</span>
        {sub && <span className="text-xs text-muted-foreground ml-2">{sub}</span>}
      </div>
      <span className={isNeg ? 'text-destructive font-medium' : 'font-medium'}>
        {isNeg ? '-' : ''}${Math.abs(value || 0).toFixed(2)}
      </span>
    </div>
  );
}