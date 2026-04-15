import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

export default function AddJobModal({ open, onClose, onSave, isPending }) {
  const [form, setForm] = useState({
    client_name: '', client_phone: '', client_email: '',
    job_name: '', job_address: '', total_price: 0,
    status: 'lead', priority: 'medium', date: today, follow_up_date: '',
  });
  const u = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSave = () => {
    onSave(form);
    setForm({ client_name: '', client_phone: '', client_email: '', job_name: '', job_address: '', total_price: 0, status: 'lead', priority: 'medium', date: today, follow_up_date: '' });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo cliente / trabajo</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Nombre del cliente *</Label>
            <Input value={form.client_name} onChange={e => u('client_name', e.target.value)} placeholder="Juan García" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Teléfono</Label>
            <Input value={form.client_phone} onChange={e => u('client_phone', e.target.value)} placeholder="(000) 000-0000" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Email</Label>
            <Input value={form.client_email} onChange={e => u('client_email', e.target.value)} placeholder="correo@email.com" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Nombre del trabajo *</Label>
            <Input value={form.job_name} onChange={e => u('job_name', e.target.value)} placeholder="Instalación de grava" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">Dirección</Label>
            <Input value={form.job_address} onChange={e => u('job_address', e.target.value)} placeholder="123 Main St" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Precio estimado</Label>
            <Input type="number" value={form.total_price || ''} onChange={e => u('total_price', parseFloat(e.target.value) || 0)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select value={form.status} onValueChange={v => u('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="estimate">Estimate</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Prioridad</Label>
            <Select value={form.priority} onValueChange={v => u('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">🔥 High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Follow-up</Label>
            <Input type="date" value={form.follow_up_date} onChange={e => u('follow_up_date', e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isPending || !form.client_name || !form.job_name}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}