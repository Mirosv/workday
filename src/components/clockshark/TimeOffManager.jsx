import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_LABELS = { vacation: 'Vacaciones', sick: 'Enfermedad', personal: 'Personal', other: 'Otro' };
const STATUS_COLORS = { pending: 'secondary', approved: 'default', denied: 'destructive' };
const STATUS_LABELS = { pending: 'Pendiente', approved: 'Aprobado', denied: 'Denegado' };

export default function TimeOffManager({ ownerEmail, currentUser, myEmployee, isAdmin }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ start_date: '', end_date: '', type: 'vacation', reason: '' });

  const { data: requests = [] } = useQuery({
    queryKey: ['timeoff', ownerEmail, isAdmin ? 'all' : myEmployee?.id],
    queryFn: () => isAdmin
      ? base44.entities.TimeOffRequest.filter({ business_owner_email: ownerEmail }, '-created_date', 100)
      : base44.entities.TimeOffRequest.filter({ business_owner_email: ownerEmail, employee_id: myEmployee?.id }, '-created_date', 50),
    enabled: isAdmin ? !!ownerEmail : !!myEmployee?.id,
  });

  const create = useMutation({
    mutationFn: () => base44.entities.TimeOffRequest.create({
      ...form,
      business_owner_email: ownerEmail,
      employee_id: myEmployee.id,
      employee_name: myEmployee.full_name,
      status: 'pending',
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timeoff'] }); setOpen(false); toast.success('Solicitud enviada'); },
    onError: () => toast.error('Error al enviar'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.TimeOffRequest.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['timeoff'] }); toast.success('Estado actualizado'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{requests.length} solicitud(es)</p>
        {myEmployee && (
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />Nueva Solicitud</Button>
        )}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <Calendar className="h-8 w-8" />
            <p className="text-sm">Sin solicitudes de tiempo libre</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {requests.map(req => (
            <Card key={req.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    {isAdmin && <p className="font-medium text-sm">{req.employee_name}</p>}
                    <p className="text-sm">{TYPE_LABELS[req.type] || req.type}</p>
                    <p className="text-xs text-muted-foreground">{req.start_date} → {req.end_date}</p>
                    {req.reason && <p className="text-xs text-muted-foreground italic">"{req.reason}"</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge variant={STATUS_COLORS[req.status]}>{STATUS_LABELS[req.status]}</Badge>
                    {isAdmin && req.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button size="icon" className="h-7 w-7 bg-green-500 hover:bg-green-600" onClick={() => updateStatus.mutate({ id: req.id, status: 'approved' })}>
                          <Check className="h-3.5 w-3.5 text-white" />
                        </Button>
                        <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => updateStatus.mutate({ id: req.id, status: 'denied' })}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Solicitar Tiempo Libre</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Desde</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Hasta</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Motivo (opcional)</Label>
              <Textarea rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => create.mutate()} disabled={create.isPending || !form.start_date || !form.end_date}>
                {create.isPending ? 'Enviando...' : 'Enviar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}