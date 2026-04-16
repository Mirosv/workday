import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit2, Trash2, Users, Mail, Loader2, Clock } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const empty = { full_name: '', email: '', phone: '', position: '', hourly_rate: '', role: 'employee', status: 'active', lunch_break_minutes: 30, lunch_paid: false, notes: '' };

export default function EmployeeManager({ ownerEmail }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [inviting, setInviting] = useState(null);
  const [inviteOnlyOpen, setInviteOnlyOpen] = useState(false);
  const [inviteOnlyEmail, setInviteOnlyEmail] = useState('');
  const [invitingOnly, setInvitingOnly] = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', ownerEmail],
    queryFn: () => base44.entities.Employee.filter({ business_owner_email: ownerEmail }),
  });

  // Fetch time entries to compute labor cost per employee (current month)
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeentries', ownerEmail],
    queryFn: () => base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail, status: 'completed' }, '-clock_in', 500),
  });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  function getLaborCost(empId, hourlyRate) {
    const entries = timeEntries.filter(e => {
      if (e.employee_id !== empId) return false;
      const d = new Date(e.clock_in);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalMins = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
    const hours = totalMins / 60;
    return { hours: hours.toFixed(1), cost: (hours * (hourlyRate || 0)).toFixed(2) };
  }

  const save = useMutation({
    mutationFn: (data) => editId
      ? base44.entities.Employee.update(editId, data)
      : base44.entities.Employee.create({ ...data, business_owner_email: ownerEmail }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      setOpen(false);
      toast.success(editId ? 'Empleado actualizado' : 'Empleado agregado');
    },
    onError: () => toast.error('Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Empleado eliminado'); },
  });

  const handleInvite = async (emp) => {
    if (!emp.email) { toast.error('El empleado no tiene email'); return; }
    setInviting(emp.id);
    try {
      await base44.users.inviteUser(emp.email, 'user');
      toast.success(`Invitación enviada a ${emp.email}`);
    } catch (e) {
      toast.error('Error al enviar invitación');
    } finally {
      setInviting(null);
    }
  };

  const handleInviteOnly = async () => {
    if (!inviteOnlyEmail) { toast.error('Ingresa un email'); return; }
    setInvitingOnly(true);
    try {
      await base44.users.inviteUser(inviteOnlyEmail, 'user');
      toast.success(`Invitación enviada a ${inviteOnlyEmail}`);
      setInviteOnlyEmail('');
      setInviteOnlyOpen(false);
    } catch (e) {
      toast.error('Error al enviar invitación');
    } finally {
      setInvitingOnly(false);
    }
  };

  const openAdd = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (emp) => { setForm({ ...emp }); setEditId(emp.id); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">{employees.length} empleado(s)</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setInviteOnlyOpen(true)}>
            <Mail className="h-4 w-4 mr-1" />Solo invitar
          </Button>
          <Button size="sm" onClick={openAdd}><UserPlus className="h-4 w-4 mr-1" />Agregar</Button>
        </div>
      </div>

      {/* Invite Only Dialog */}
      <Dialog open={inviteOnlyOpen} onOpenChange={setInviteOnlyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enviar invitación</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">Envía una invitación de acceso a la app sin agregar un perfil de empleado.</p>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                placeholder="empleado@email.com"
                value={inviteOnlyEmail}
                onChange={e => setInviteOnlyEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setInviteOnlyOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={handleInviteOnly} disabled={invitingOnly || !inviteOnlyEmail}>
                {invitingOnly ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
                Enviar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-36 gap-2 text-muted-foreground">
            <Users className="h-8 w-8" />
            <p className="text-sm">No hay empleados aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => {
            const { hours, cost } = getLaborCost(emp.id, emp.hourly_rate);
            return (
              <Card key={emp.id}>
                <CardContent className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{emp.full_name}</p>
                      <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                        {emp.status === 'active' ? 'Activo' : 'Inactivo'}
                      </Badge>
                      {emp.role === 'admin' && <Badge className="text-xs bg-amber-500">Admin</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{emp.email}{emp.position ? ` · ${emp.position}` : ''}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {emp.hourly_rate > 0 && <span>${emp.hourly_rate}/hr</span>}
                      {parseFloat(hours) > 0 && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Clock className="h-3 w-3" />
                          {hours}h este mes · <span className="text-destructive">${cost}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                    {emp.email && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1"
                        onClick={() => handleInvite(emp)}
                        disabled={inviting === emp.id}
                      >
                        {inviting === emp.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Mail className="h-3 w-3" />}
                        Invitar
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(emp.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'Editar Empleado' : 'Nuevo Empleado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {[['Nombre completo', 'full_name', 'text'], ['Email', 'email', 'email'], ['Teléfono', 'phone', 'tel'], ['Puesto', 'position', 'text']].map(([lbl, key, type]) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{lbl}</Label>
                <Input type={type} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Tarifa por hora ($)</Label>
              <Input type="number" value={form.hourly_rate || ''} onChange={e => setForm(f => ({ ...f, hourly_rate: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Rol</Label>
                <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Empleado</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estado</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Lunch settings */}
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-xs font-medium text-foreground">⏱ Configuración de Lunch</p>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium">Lunch pagado</p>
                  <p className="text-xs text-muted-foreground">Si está activado, el lunch NO se descuenta de las horas</p>
                </div>
                <Switch
                  checked={!!form.lunch_paid}
                  onCheckedChange={v => setForm(f => ({ ...f, lunch_paid: v }))}
                />
              </div>
              {!form.lunch_paid && (
                <div className="space-y-1">
                  <Label className="text-xs">Minutos de lunch a descontar</Label>
                  <Select
                    value={String(form.lunch_break_minutes ?? 30)}
                    onValueChange={v => setForm(f => ({ ...f, lunch_break_minutes: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Sin descuento</SelectItem>
                      <SelectItem value="15">15 minutos</SelectItem>
                      <SelectItem value="30">30 minutos</SelectItem>
                      <SelectItem value="45">45 minutos</SelectItem>
                      <SelectItem value="60">60 minutos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground bg-muted rounded p-2">
              💡 Después de agregar al empleado, usa el botón "Invitar" para enviarle acceso a la app.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button className="flex-1" onClick={() => save.mutate(form)} disabled={save.isPending || !form.full_name}>
                {save.isPending ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}