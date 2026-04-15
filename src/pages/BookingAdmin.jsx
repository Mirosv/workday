import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, Plus, Trash2, Check, X, Clock, User, Phone, Mail, StickyNote, Link, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG = {
  pending:   { label: 'Pendiente',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed: { label: 'Confirmado',  color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Completado',  color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelado',   color: 'bg-red-100 text-red-700 border-red-200' },
};

const TIME_SLOTS = ['7:00 AM','8:00 AM','9:00 AM','10:00 AM','11:00 AM','12:00 PM','1:00 PM','2:00 PM','3:00 PM','4:00 PM','5:00 PM','6:00 PM'];
const today = new Date().toISOString().split('T')[0];

export default function BookingAdmin() {
  const queryClient = useQueryClient();
  const [slotForm, setSlotForm] = useState({ date: today, time_slot: '9:00 AM', service_label: '', max_bookings: 1 });
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: bookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => base44.entities.Booking.list('-created_date'),
  });

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['slots'],
    queryFn: () => base44.entities.AvailableSlot.list('date'),
  });

  const createSlot = useMutation({
    mutationFn: (data) => base44.entities.AvailableSlot.create({ ...data, is_active: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['slots'] }); toast.success('Slot agregado'); },
  });

  const deleteSlot = useMutation({
    mutationFn: (id) => base44.entities.AvailableSlot.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['slots'] }); toast.success('Slot eliminado'); },
  });

  const updateBooking = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bookings'] }); toast.success('Actualizado'); },
  });

  const filteredBookings = useMemo(() =>
    filterStatus === 'all' ? bookings : bookings.filter(b => b.status === filterStatus),
    [bookings, filterStatus]
  );

  const bookingLink = `${window.location.origin}/booking`;

  // Stats
  const stats = {
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    total: bookings.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
            <CalendarDays className="h-7 w-7 text-primary" />
            Booking Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Administra tus disponibilidades y reservas</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(bookingLink); toast.success('Link copiado!'); }}>
          <Link className="h-4 w-4 mr-2" /> Copiar link público
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Total reservas</p>
          <p className="font-heading font-bold text-2xl mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Pendientes</p>
          <p className="font-heading font-bold text-2xl text-yellow-700 mt-0.5">{stats.pending}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs text-muted-foreground">Confirmadas</p>
          <p className="font-heading font-bold text-2xl text-blue-700 mt-0.5">{stats.confirmed}</p>
        </div>
      </div>

      <Tabs defaultValue="bookings">
        <TabsList className="grid grid-cols-2 w-full max-w-sm">
          <TabsTrigger value="bookings">Reservas</TabsTrigger>
          <TabsTrigger value="slots">Disponibilidad</TabsTrigger>
        </TabsList>

        {/* BOOKINGS */}
        <TabsContent value="bookings" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {['all','pending','confirmed','completed','cancelled'].map(s => (
              <Button key={s} size="sm" variant={filterStatus === s ? 'default' : 'outline'} onClick={() => setFilterStatus(s)} className="capitalize text-xs h-7">
                {s === 'all' ? 'Todas' : STATUS_CONFIG[s]?.label}
              </Button>
            ))}
          </div>

          {loadingBookings ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">No hay reservas aún.</div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map(b => {
                const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                return (
                  <Card key={b.id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">{b.client_name}</span>
                            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />{b.date} — {b.time_slot}</span>
                            {b.client_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.client_phone}</span>}
                            {b.client_email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.client_email}</span>}
                          </div>
                          {b.service && <p className="text-xs text-muted-foreground">Servicio: {b.service}</p>}
                          {b.notes && <p className="text-xs italic text-muted-foreground">"{b.notes}"</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {b.status === 'pending' && (
                            <>
                              <Button size="sm" className="h-7 text-xs" onClick={() => updateBooking.mutate({ id: b.id, data: { status: 'confirmed' } })}>
                                <Check className="h-3 w-3 mr-1" /> Confirmar
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateBooking.mutate({ id: b.id, data: { status: 'cancelled' } })}>
                                <X className="h-3 w-3 mr-1" /> Cancelar
                              </Button>
                            </>
                          )}
                          {b.status === 'confirmed' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateBooking.mutate({ id: b.id, data: { status: 'completed' } })}>
                              <Check className="h-3 w-3 mr-1" /> Completar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* SLOTS */}
        <TabsContent value="slots" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agregar disponibilidad</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Fecha</Label>
                  <Input type="date" value={slotForm.date} onChange={e => setSlotForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hora</Label>
                  <Select value={slotForm.time_slot} onValueChange={v => setSlotForm(p => ({ ...p, time_slot: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Servicio (opcional)</Label>
                  <Input value={slotForm.service_label} onChange={e => setSlotForm(p => ({ ...p, service_label: e.target.value }))} placeholder="Ej: Consulta gratis" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Máx. reservas</Label>
                  <Input type="number" min={1} value={slotForm.max_bookings} onChange={e => setSlotForm(p => ({ ...p, max_bookings: parseInt(e.target.value) || 1 }))} />
                </div>
              </div>
              <Button size="sm" onClick={() => createSlot.mutate(slotForm)} disabled={createSlot.isPending}>
                <Plus className="h-4 w-4 mr-1" /> Agregar slot
              </Button>
            </CardContent>
          </Card>

          {loadingSlots ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : slots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No hay slots. Agrega disponibilidad arriba.</div>
          ) : (
            <div className="space-y-2">
              {slots.filter(s => s.is_active).map(slot => {
                const booked = bookings.filter(b => b.date === slot.date && b.time_slot === slot.time_slot && b.status !== 'cancelled').length;
                const isFull = booked >= (slot.max_bookings || 1);
                return (
                  <div key={slot.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${isFull ? 'border-orange-200 bg-orange-50' : 'bg-card border-border'}`}>
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <span className="font-medium text-sm">{slot.date} — {slot.time_slot}</span>
                        {slot.service_label && <span className="text-xs text-muted-foreground ml-2">({slot.service_label})</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${isFull ? 'text-orange-600' : 'text-muted-foreground'}`}>{booked}/{slot.max_bookings} reservas</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteSlot.mutate(slot.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}