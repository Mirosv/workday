import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Printer, Eye, TreePine } from 'lucide-react';
import { toast } from 'sonner';
import JobDetailsSection from '@/components/invoice/JobDetailsSection';
import ServicesSection from '@/components/invoice/ServicesSection';
import PricingSection from '@/components/invoice/PricingSection';
import { useBusiness } from '@/lib/BusinessContext';

const today = new Date().toISOString().split('T')[0];

const buildDefault = (settings) => ({
  business_name: settings.business_name || '',
  business_phone: settings.business_phone || '',
  business_address: settings.business_address || '',
  client_name: '',
  job_address: '',
  invoice_number: 'QT-0001',
  date: today,
  notes: '',
  labor_rate: settings.default_labor_rate || 0,
  labor_hours: 0,
  overhead_pct: settings.default_overhead_pct || 0,
  profit_pct: settings.default_profit_pct || 0,
  minimum_fee: 0,
  discount: 0,
  equipment_wear: 0,
  equipment_wear_on: false,
  materials_consumables: 0,
  materials_on: false,
  disposal_fees: 0,
  disposal_on: false,
  travel_mobilization: 0,
  travel_on: false,
});

export default function InvoiceBuilder() {
  const { settings, loading } = useBusiness();
  const [data, setData] = useState(() => buildDefault({}));
  const [services, setServices] = useState([]);
  const [clientMode, setClientMode] = useState(false);
  const queryClient = useQueryClient();

  // Once settings load, pre-fill with business defaults
  useEffect(() => {
    if (!loading) {
      setData(buildDefault(settings));
    }
  }, [loading]);

  const totals = useMemo(() => {
    const servicesSubtotal = services.reduce((s, svc) => s + (svc.line_total || 0), 0);
    const labor = data.labor_hours * data.labor_rate;
    const addons = (data.equipment_wear_on ? data.equipment_wear : 0)
      + (data.materials_on ? data.materials_consumables : 0)
      + (data.disposal_on ? data.disposal_fees : 0)
      + (data.travel_on ? data.travel_mobilization : 0);
    const subtotalBeforeMargin = servicesSubtotal + labor + addons;
    const overhead = subtotalBeforeMargin * (data.overhead_pct / 100);
    const profit = subtotalBeforeMargin * (data.profit_pct / 100);
    let grandTotal = subtotalBeforeMargin + overhead + profit - data.discount;
    if (grandTotal < data.minimum_fee && data.minimum_fee > 0) grandTotal = data.minimum_fee;
    return { servicesSubtotal, serviceCount: services.length, labor, overhead, profit, grandTotal: Math.max(grandTotal, 0) };
  }, [services, data]);

  const saveJob = useMutation({
    mutationFn: () => base44.entities.Job.create({
      ...data,
      services,
      grand_total: totals.grandTotal,
      total_price: totals.grandTotal,
      job_name: `${data.invoice_number} - ${data.client_name}`,
      status: 'estimate',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Quote saved as estimate!');
    },
  });

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <TreePine className="h-7 w-7 text-primary" />
            Invoice / Quote Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Labor + Add-ons + Overhead + Profit</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setClientMode(!clientMode)}>
            <Eye className="h-4 w-4 mr-1" /> {clientMode ? 'Edit Mode' : 'Client Mode'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          <Button size="sm" onClick={() => saveJob.mutate()} disabled={saveJob.isPending || !data.client_name}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </div>
      </div>

      {clientMode ? (
        <ClientView data={data} services={services} totals={totals} />
      ) : (
        <>
          <Card>
            <CardContent className="p-5 space-y-6">
              <JobDetailsSection data={data} onChange={setData} />
              <Separator />
              <ServicesSection services={services} onChange={setServices} />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <PricingSection data={data} onChange={setData} totals={totals} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ClientView({ data, services, totals }) {
  return (
    <Card className="print:shadow-none">
      <CardContent className="p-6 md:p-10 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-heading font-bold text-2xl text-primary">{data.business_name}</h2>
            <p className="text-sm text-muted-foreground">{data.business_phone} • {data.business_address}</p>
          </div>
          <div className="text-right">
            <p className="font-heading font-bold text-lg">{data.invoice_number}</p>
            <p className="text-sm text-muted-foreground">{data.date}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Customer</p>
            <p className="font-medium">{data.client_name || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Job Address</p>
            <p className="font-medium">{data.job_address || '—'}</p>
          </div>
        </div>

        {data.notes && (
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">{data.notes}</div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2">Service</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Unit $</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 font-medium">{svc.name} <span className="text-muted-foreground text-xs">({svc.unit})</span></td>
                  <td className="text-center py-2">{svc.qty}</td>
                  <td className="text-right py-2">${svc.unit_price.toFixed(2)}</td>
                  <td className="text-right py-2 font-medium">${svc.line_total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Separator />

        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>${totals.servicesSubtotal.toFixed(2)}</span></div>
            {totals.labor > 0 && <div className="flex justify-between"><span>Labor</span><span>${totals.labor.toFixed(2)}</span></div>}
            {totals.overhead > 0 && <div className="flex justify-between"><span>Overhead</span><span>${totals.overhead.toFixed(2)}</span></div>}
            {totals.profit > 0 && <div className="flex justify-between"><span>Profit</span><span>${totals.profit.toFixed(2)}</span></div>}
            <Separator />
            <div className="flex justify-between font-heading font-bold text-lg pt-1">
              <span>Total</span>
              <span className="text-primary">${totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}