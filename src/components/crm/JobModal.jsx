import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Save, Trash2, Phone, Mail, MapPin, DollarSign, Calendar, FileText, StickyNote, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'estimate', label: 'Estimate', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-600' },
  { value: 'medium', label: 'Medium', color: 'bg-orange-100 text-orange-600' },
  { value: 'high', label: '🔥 High', color: 'bg-red-100 text-red-600' },
];

export default function JobModal({ job, open, onClose }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState({ ...job });
  const u = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const updateJob = useMutation({
    mutationFn: (data) => base44.entities.Job.update(job.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Guardado');
      onClose();
    },
  });

  const deleteJob = useMutation({
    mutationFn: () => base44.entities.Job.delete(job.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job eliminado');
      onClose();
    },
  });

  const statusCfg = STATUS_OPTIONS.find(s => s.value === form.status) || STATUS_OPTIONS[0];
  const priorityCfg = PRIORITY_OPTIONS.find(p => p.value === form.priority) || PRIORITY_OPTIONS[1];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <DialogTitle className="text-xl font-heading font-bold">{form.client_name}</DialogTitle>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={statusCfg.color}>{statusCfg.label}</Badge>
              <Badge variant="outline" className={priorityCfg.color}>{priorityCfg.label}</Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="job">Job</TabsTrigger>
            <TabsTrigger value="notes">Notas</TabsTrigger>
          </TabsList>

          {/* INFO TAB */}
          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Teléfono</Label>
                <Input value={form.client_phone || ''} onChange={e => u('client_phone', e.target.value)} placeholder="(000) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</Label>
                <Input value={form.client_email || ''} onChange={e => u('client_email', e.target.value)} placeholder="correo@email.com" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Dirección del trabajo</Label>
                <Input value={form.job_address || ''} onChange={e => u('job_address', e.target.value)} placeholder="Dirección" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Fecha</Label>
                <Input type="date" value={form.date || ''} onChange={e => u('date', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Follow-up</Label>
                <Input type="date" value={form.follow_up_date || ''} onChange={e => u('follow_up_date', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* JOB TAB */}
          <TabsContent value="job" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Nombre del trabajo</Label>
                <Input value={form.job_name || ''} onChange={e => u('job_name', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="h-3 w-3" /> Precio total</Label>
                <Input type="number" value={form.total_price || ''} onChange={e => u('total_price', parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={form.status} onValueChange={v => u('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Prioridad</Label>
                <Select value={form.priority || 'medium'} onValueChange={v => u('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Invoice #</Label>
                <Input value={form.invoice_number || ''} onChange={e => u('invoice_number', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          {/* NOTES TAB */}
          <TabsContent value="notes" className="space-y-4 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Notas para el cliente</Label>
              <Textarea value={form.notes || ''} onChange={e => u('notes', e.target.value)} placeholder="Scope, plazos, materiales..." rows={3} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><StickyNote className="h-3 w-3" /> Notas internas</Label>
              <Textarea value={form.internal_notes || ''} onChange={e => u('internal_notes', e.target.value)} placeholder="Observaciones privadas del equipo..." rows={3} />
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        <div className="flex justify-between gap-2 flex-wrap">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteJob.mutate()} disabled={deleteJob.isPending}>
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => { onClose(); navigate(`/?job=${job.id}`); }}>
              <ClipboardList className="h-4 w-4 mr-1" /> Crear Quote
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
            <Button size="sm" onClick={() => updateJob.mutate(form)} disabled={updateJob.isPending}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}