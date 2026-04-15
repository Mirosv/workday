import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import CRMSearch from '@/components/invoice/CRMSearch';
import { Save, Printer, Eye, FileText, Copy, Users, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import JobDetailsSection from '@/components/invoice/JobDetailsSection';
import ServicesSection from '@/components/invoice/ServicesSection';
import PricingSection from '@/components/invoice/PricingSection';
import DocumentClientView from '@/components/invoice/DocumentClientView';
import { useBusiness } from '@/lib/BusinessContext';

const today = new Date().toISOString().split('T')[0];

const buildDefault = (settings) => ({
  business_name: settings?.business_name || '',
  business_phone: settings?.business_phone || '',
  business_address: settings?.business_address || '',
  client_name: '',
  client_phone: '',
  client_email: '',
  job_address: '',
  job_name: '',
  invoice_number: `QT-${Date.now().toString().slice(-4)}`,
  date: today,
  notes: '',
  labor_rate: settings?.default_labor_rate || 0,
  labor_hours: 0,
  overhead_pct: settings?.default_overhead_pct || 0,
  profit_pct: settings?.default_profit_pct || 0,
  minimum_fee: 0,
  discount: 0,
  equipment_wear: 0, equipment_wear_on: false,
  materials_consumables: 0, materials_on: false,
  disposal_fees: 0, disposal_on: false,
  travel_mobilization: 0, travel_on: false,
});

export default function QuoteBuilder() {
  const { settings, loading, currentUser } = useBusiness();
  const [data, setData] = useState(() => buildDefault({}));
  const [services, setServices] = useState([]);
  const [clientMode, setClientMode] = useState(false);
  const [linkedJobId, setLinkedJobId] = useState(null);
  const queryClient = useQueryClient();

  const { data: crmJobs = [] } = useQuery({
    queryKey: ['jobs', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Job.filter({ created_by: currentUser.email }, '-created_date') : [],
    enabled: !!currentUser,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get('job');
    if (jobId && crmJobs.length > 0) {
      const job = crmJobs.find(j => j.id === jobId);
      if (job) loadFromJob(job);
    }
  }, [crmJobs]);

  useEffect(() => {
    if (!loading) {
      setData(prev => ({
        ...buildDefault(settings),
        ...prev,
        business_name: settings.business_name || prev.business_name,
        business_phone: settings.business_phone || prev.business_phone,
        business_address: settings.business_address || prev.business_address,
      }));
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
      job_name: job.job_name || '',
      notes: job.notes || '',
      invoice_number: job.invoice_number || `QT-${Date.now().toString().slice(-4)}`,
    }));
    if (job.services?.length) setServices(job.services);
    toast.success(`Cliente cargado: ${job.client_name}`);
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
    return { servicesSubtotal, labor, overhead, profit, grandTotal: Math.max(grandTotal, 0) };
  }, [services, data]);

  const saveQuote = useMutation({
    mutationFn: async () => {
      const payload = {
        ...data,
        services,
        grand_total: totals.grandTotal,
        total_price: totals.grandTotal,
        job_name: data.job_name || `${data.invoice_number} - ${data.client_name}`,
        status: 'estimate',
      };
      if (linkedJobId) return base44.entities.Job.update(linkedJobId, payload);
      return base44.entities.Job.create(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      if (!linkedJobId) setLinkedJobId(result.id);
      toast.success(linkedJobId ? 'Quote actualizado en CRM!' : 'Quote guardado en CRM!');
    },
  });

  const handleDuplicate = () => {
    setLinkedJobId(null);
    setData(prev => ({ ...prev, invoice_number: `QT-${Date.now().toString().slice(-4)}` }));
    toast.success('Quote duplicado — edita y guarda como nuevo.');
  };

  const handleConvertToInvoice = () => {
    // Save first if unsaved
    if (!linkedJobId) {
      toast.error('Guarda el quote primero antes de convertirlo a invoice.');
      return;
    }
    window.location.href = `/invoices?job=${linkedJobId}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl text-foreground flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Proposal / Quote Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Crea y envía cotizaciones a tus clientes</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" onClick={() => setClientMode(!clientMode)}>
            <Eye className="h-4 w-4 mr-1" /> {clientMode ? 'Edit Mode' : 'Preview'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" /> Print
          </Button>
          {data.client_name && (
            <Button variant="outline" size="sm" onClick={handleDuplicate}>
              <Copy className="h-4 w-4 mr-1" /> Duplicar
            </Button>
          )}
          {linkedJobId && (
            <Button variant="outline" size="sm" className="border-green-500 text-green-700 hover:bg-green-50" onClick={handleConvertToInvoice}>
              <CheckCircle className="h-4 w-4 mr-1" /> Convertir a Invoice
            </Button>
          )}
          <Button size="sm" onClick={() => saveQuote.mutate()} disabled={saveQuote.isPending || !data.client_name}>
            <Save className="h-4 w-4 mr-1" /> {linkedJobId ? 'Actualizar' : 'Guardar Quote'}
          </Button>
        </div>
      </div>

      <Card className="border border-border">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">CRM — Cargar cliente</span>
          </div>
          <CRMSearch
            jobs={crmJobs}
            linkedJob={linkedJobId ? crmJobs.find(j => j.id === linkedJobId) : null}
            onSelect={(job) => {
              if (!job) { setLinkedJobId(null); setData(buildDefault(settings)); setServices([]); }
              else loadFromJob(job);
            }}
          />
        </CardContent>
      </Card>

      {clientMode ? (
        <DocumentClientView data={data} services={services} totals={totals} docType="PROPOSAL / QUOTE" />
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