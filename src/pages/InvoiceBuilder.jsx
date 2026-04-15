import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import CRMSearch from '@/components/invoice/CRMSearch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Printer, Eye, TreePine, Copy, Users } from 'lucide-react';
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
  const [linkedJobId, setLinkedJobId] = useState(null);
  const queryClient = useQueryClient();

  // Load CRM jobs for selector
  const { data: crmJobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
  });

  // Check if opened from CRM via URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (jobId && crmJobs.length > 0) {
      const job = crmJobs.find(j => j.id === jobId);
      if (job) loadFromJob(job);
    }
  }, [crmJobs]);

  // Once settings load, pre-fill with business defaults
  useEffect(() => {
    if (!loading) {
      setData(prev => ({ ...buildDefault(settings), ...prev, business_name: settings.business_name || prev.business_name, business_phone: settings.business_phone || prev.business_phone, business_address: settings.business_address || prev.business_address }));
    }
  }, [loading]);

  const loadFromJob = (job) => {
    setLinkedJobId(job.id);
    setData(prev => ({
      ...prev,
      client_name: job.client_name || '',
      client_phone: job.client_phone || '',
      client_email: job.client_email || '',
      job_address: job.job_address || '',
      notes: job.notes || '',
      invoice_number: job.invoice_number || `QT-${Date.now().toString().slice(-4)}`,
    }));
    if (job.services?.length) setServices(job.services);
    toast.success(`Cliente cargado: ${job.client_name}`);
  };

  const handleLoadFromCRM = (jobId) => {
    const job = crmJobs.find(j => j.id === jobId);
    if (job) loadFromJob(job);
  };

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
    mutationFn: async () => {
      const payload = {
        ...data,
        services,
        grand_total: totals.grandTotal,
        total_price: totals.grandTotal,
        job_name: data.job_name || `${data.invoice_number} - ${data.client_name}`,
        status: 'estimate',
      };
      if (linkedJobId) {
        return base44.entities.Job.update(linkedJobId, payload);
      } else {
        return base44.entities.Job.create(payload);
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (!linkedJobId) setLinkedJobId(result.id);
      toast.success(linkedJobId ? 'Quote actualizado en CRM!' : 'Quote guardado en CRM!');
    },
  });

  const handlePrint = () => window.print();

  const handleDuplicate = () => {
    setLinkedJobId(null);
    setData(prev => ({
      ...prev,
      invoice_number: `QT-${Date.now().toString().slice(-4)}`,
    }));
    toast.success('Cotización duplicada — edita y guarda como nueva.');
  };

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
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setClientMode(!clientMode)}>
            <Eye className="h-4 w-4 mr-1" /> {clientMode ? 'Edit Mode' : 'Client Mode'}
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {data.client_name && (
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-1" /> Duplicar
            </Button>
          )}
          <Button size="sm" onClick={() => saveJob.mutate()} disabled={saveJob.isPending || !data.client_name}>
            <Save className="h-4 w-4 mr-1" /> {linkedJobId ? 'Actualizar CRM' : 'Guardar en CRM'}
          </Button>
        </div>
      </div>

      {/* CRM Search */}
      <Card className="border border-border">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CRM Pipeline</span>
          </div>
          <CRMSearch
            jobs={crmJobs}
            linkedJob={linkedJobId ? crmJobs.find(j => j.id === linkedJobId) : null}
            onSelect={(job) => {
              if (!job) { setLinkedJobId(null); setData(buildDefault(settings)); setServices([]); }
              else handleLoadFromCRM(job.id);
            }}
          />
        </CardContent>
      </Card>

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