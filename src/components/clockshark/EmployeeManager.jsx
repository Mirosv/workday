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
import { UserPlus, Edit2, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';

const empty = { full_name: '', email: '', phone: '', position: '', hourly_rate: '', role: 'employee', status: 'active', notes: '' };

export default function EmployeeManager({ ownerEmail }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', ownerEmail],
    queryFn: () => base44.entities.Employee.filter({ business_owner_email: ownerEmail }),
  });

  const save = useMutation({
    mutationFn: (data) => editId
      ? base44.entities.Employee.update(editId, data)
      : base44.entities.Employee.create({ ...data, business_owner_email: ownerEmail }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); setOpen(false); toast.success(editId ? 'Empleado actualizado' : 'Empleado agregado'); },
    onError: () => toast.error('Error al guardar'),
  });

  const remove = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['employees'] }); toast.success('Empleado eliminado'); },
  });

  const openAdd = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (emp) => { setForm({ ...emp }); setEditId(emp.id); setOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{employees.length} empleado(s)</p>
        <Button size="sm" onClick={openAdd}><UserPlus className="h-4 w-4 mr-1" />Agregar</Button>
      </div>

      {employees.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-36 gap-2 text-muted-foreground">
            <Users className="h-8 w-8" />
            <p className="text-sm">No hay empleados aún</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <Card key={emp.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{emp.full_name}</p>
                    <Badge variant={emp.status === 'active' ? 'default' : 'secondary'} className="text-xs">{emp.status === 'active' ? 'Activo' : 'Inactivo'}</Badge>
                    {emp.role === 'admin' && <Badge className="text-xs bg-amber-500">Admin</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{emp.email} {emp.position ? `· ${emp.position}` : ''}</p>
                  {emp.hourly_rate > 0 && <p className="text-xs text-muted-foreground">${emp.hourly_rate}/hr</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(emp)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove.mutate(emp.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
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