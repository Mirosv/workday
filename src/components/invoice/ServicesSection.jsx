import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Package } from 'lucide-react';
import { SERVICES_CATALOG } from '@/lib/services-data';

export default function ServicesSection({ services, onChange }) {
  const [selectedService, setSelectedService] = useState('');
  const [customName, setCustomName] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [startPrice, setStartPrice] = useState(0);

  const addService = (name, unit, price) => {
    const newService = { name, unit, qty: 1, unit_price: price, line_total: price };
    onChange([...services, newService]);
  };

  const addFromCatalog = () => {
    if (!selectedService) return;
    const svc = SERVICES_CATALOG.find(s => s.name === selectedService);
    if (svc) {
      addService(svc.name, svc.unit, startPrice);
      setSelectedService('');
      setStartPrice(0);
    }
  };

  const addCustom = () => {
    if (!customName) return;
    addService(customName, customUnit || 'unit', startPrice);
    setCustomName('');
    setCustomUnit('');
    setStartPrice(0);
  };

  const updateService = (index, field, value) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'qty' || field === 'unit_price') {
      updated[index].line_total = (updated[index].qty || 0) * (updated[index].unit_price || 0);
    }
    onChange(updated);
  };

  const removeService = (index) => {
    onChange(services.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <h3 className="font-heading font-semibold text-base flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" /> Add Service
      </h3>

      {/* Catalog select */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selectedService} onValueChange={setSelectedService}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Select a service…" />
          </SelectTrigger>
          <SelectContent>
            {SERVICES_CATALOG.map(s => (
              <SelectItem key={s.name} value={s.name}>{s.name} ({s.unit})</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={addFromCatalog} disabled={!selectedService} className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>

      {/* Custom service */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Input placeholder="Custom job name" value={customName} onChange={e => setCustomName(e.target.value)} className="col-span-2 sm:col-span-1" />
        <Input placeholder="Custom unit" value={customUnit} onChange={e => setCustomUnit(e.target.value)} />
        <Input type="number" placeholder="Starting $" value={startPrice || ''} onChange={e => setStartPrice(parseFloat(e.target.value) || 0)} />
        <Button onClick={addCustom} disabled={!customName} variant="outline" className="shrink-0">
          <Plus className="h-4 w-4 mr-1" /> Custom
        </Button>
      </div>

      {/* Services list - cards on mobile, table on desktop */}
      {services.length > 0 && (
        <div className="space-y-3">
          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-3 text-xs font-medium text-muted-foreground">
            <div className="col-span-4">Service</div>
            <div className="col-span-2">Unit</div>
            <div className="col-span-1">Qty</div>
            <div className="col-span-2">Unit $</div>
            <div className="col-span-2">Line $</div>
            <div className="col-span-1"></div>
          </div>

          {services.map((svc, i) => (
            <div key={i} className="bg-muted/50 rounded-lg p-3 md:p-2">
              {/* Mobile card */}
              <div className="md:hidden space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{svc.name}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeService(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit</Label>
                    <Input value={svc.unit} onChange={e => updateService(i, 'unit', e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input type="number" value={svc.qty} onChange={e => updateService(i, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Unit $</Label>
                    <Input type="number" value={svc.unit_price} onChange={e => updateService(i, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                  </div>
                </div>
                <div className="text-right font-semibold text-sm text-primary">
                  ${svc.line_total.toFixed(2)}
                </div>
              </div>

              {/* Desktop row */}
              <div className="hidden md:grid grid-cols-12 gap-2 items-center">
                <div className="col-span-4 text-sm font-medium">{svc.name}</div>
                <div className="col-span-2">
                  <Input value={svc.unit} onChange={e => updateService(i, 'unit', e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="col-span-1">
                  <Input type="number" value={svc.qty} onChange={e => updateService(i, 'qty', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2">
                  <Input type="number" value={svc.unit_price} onChange={e => updateService(i, 'unit_price', parseFloat(e.target.value) || 0)} className="h-8 text-xs" />
                </div>
                <div className="col-span-2 text-sm font-semibold text-primary">${svc.line_total.toFixed(2)}</div>
                <div className="col-span-1 text-right">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeService(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}