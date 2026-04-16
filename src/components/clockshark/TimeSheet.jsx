import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Clock, MapPin, Pencil, Plus, Trash2, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

function formatDur(mins) {
  if (!mins) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function toLocalDatetimeInput(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function calcDurationMinutes(clockIn, clockOut) {
  if (!clockIn || !clockOut) return 0;
  const diff = (new Date(clockOut) - new Date(clockIn)) / 60000;
  return Math.max(0, Math.round(diff));
}

const EMPTY_FORM = { employee_id: '', clock_in: '', clock_out: '', notes: '' };

export default function TimeSheet({ ownerEmail, currentUser, myEmployee, isAdmin }) {
  const queryClient = useQueryClient();
  const [filterEmp, setFilterEmp] = useState('all');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState(null); // null = add new
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: entries = [] } = useQuery({
    queryKey: ['timeentries', ownerEmail, isAdmin ? 'all' : myEmployee?.id],
    queryFn: () => isAdmin
      ? base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail }, '-clock_in', 300)
      : base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail, employee_id: myEmployee?.id }, '-clock_in', 100),
    enabled: isAdmin ? !!ownerEmail : !!myEmployee?.id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', ownerEmail],
    queryFn: () => base44.entities.Employee.filter({ business_owner_email: ownerEmail }),
    enabled: isAdmin && !!ownerEmail,
  });

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editEntry) {
        return base44.entities.TimeEntry.update(editEntry.id, data);
      } else {
        return base44.entities.TimeEntry.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeentries'] });
      toast.success(editEntry ? 'Registro actualizado' : 'Registro creado');
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TimeEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeentries'] });
      toast.success('Registro eliminado');
    },
  });

  const openAdd = () => {
    setEditEntry(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditEntry(entry);
    setForm({
      employee_id: entry.employee_id || '',
      clock_in: toLocalDatetimeInput(entry.clock_in),
      clock_out: toLocalDatetimeInput(entry.clock_out),
      notes: entry.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    const emp = employees.find(e => e.id === form.employee_id);
    const clockInISO = form.clock_in ? new Date(form.clock_in).toISOString() : null;
    const clockOutISO = form.clock_out ? new Date(form.clock_out).toISOString() : null;
    const duration = calcDurationMinutes(clockInISO, clockOutISO);

    const payload = {
      business_owner_email: ownerEmail,
      employee_id: form.employee_id,
      employee_name: emp?.full_name || editEntry?.employee_name || '',
      clock_in: clockInISO,
      clock_out: clockOutISO || null,
      duration_minutes: duration,
      status: clockOutISO ? 'completed' : 'active',
      notes: form.notes,
    };
    saveMutation.mutate(payload);
  };

  const setPreset = (preset) => {
    const now = new Date();
    if (preset === 'this_month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setDateTo(today);
    } else if (preset === 'last_month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
      setDateTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
    } else if (preset === 'last_7') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (preset === 'last_30') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    }
  };

  const filtered = useMemo(() => {
    return entries.filter(e => {
      const d = e.clock_in ? e.clock_in.substring(0, 10) : null;
      if (!d) return false;
      if (d < dateFrom || d > dateTo) return false;
      if (isAdmin && filterEmp !== 'all' && e.employee_id !== filterEmp) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo, filterEmp, isAdmin]);

  const totalMins = filtered.filter(e => e.status === 'completed').reduce((a, e) => a + (e.duration_minutes || 0), 0);

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <CalendarRange className="h-4 w-4 text-primary mt-5 hidden sm:block" />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'last_7', label: '7 días' },
                { key: 'last_30', label: '30 días' },
                { key: 'this_month', label: 'Este mes' },
                { key: 'last_month', label: 'Mes anterior' },
              ].map(p => (
                <Button key={p.key} variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPreset(p.key)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Select value={filterEmp} onValueChange={setFilterEmp}>
              <SelectTrigger className="w-44 h-8 text-sm">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los empleados</SelectItem>
                {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-sm text-muted-foreground">
            Total: <span className="font-semibold text-foreground">{formatDur(totalMins)}</span>
            <span className="text-xs ml-1">({filtered.length} registros)</span>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={openAdd} className="h-8 text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Agregar
            </Button>
          )}
        </div>
      </div>

      {/* Entries List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Sin registros en este rango de fechas
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <Card key={entry.id} className={entry.status === 'active' ? 'border-green-300 bg-green-50' : ''}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {isAdmin && <p className="font-medium text-sm">{entry.employee_name}</p>}
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.clock_in).toLocaleDateString()} · {new Date(entry.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {entry.clock_out && ` → ${new Date(entry.clock_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold">{formatDur(entry.duration_minutes)}</span>
                    <Badge variant={entry.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                      {entry.status === 'active' ? 'Activo' : 'Completado'}
                    </Badge>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                {(entry.clock_in_address || entry.clock_out_address) && (
                  <div className="flex items-start gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                    <span className="truncate">{entry.clock_in_address || entry.clock_out_address}</span>
                  </div>
                )}
                {entry.notes && <p className="text-xs text-muted-foreground italic">"{entry.notes}"</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Modal (admin only) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Editar registro' : 'Agregar registro'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Empleado</Label>
              <Select value={form.employee_id} onValueChange={v => setForm({ ...form, employee_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona empleado" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entrada (Clock In)</Label>
              <Input
                type="datetime-local"
                value={form.clock_in}
                onChange={e => setForm({ ...form, clock_in: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Salida (Clock Out)</Label>
              <Input
                type="datetime-local"
                value={form.clock_out}
                onChange={e => setForm({ ...form, clock_out: e.target.value })}
              />
              {form.clock_in && form.clock_out && (
                <p className="text-xs text-primary font-medium">
                  Duración: {formatDur(calcDurationMinutes(new Date(form.clock_in).toISOString(), new Date(form.clock_out).toISOString()))}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notas</Label>
              <Input
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Opcional..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending || !form.employee_id || !form.clock_in}>
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}