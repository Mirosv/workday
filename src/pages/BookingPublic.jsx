import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, CheckCircle2, ChevronLeft, TreePine, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingPublic() {
  const [step, setStep] = useState(1); // 1=pick date, 2=fill form, 3=success
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [form, setForm] = useState({ client_name: '', client_phone: '', client_email: '', service: '', notes: '' });
  const u = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['public-slots'],
    queryFn: () => base44.entities.AvailableSlot.filter({ is_active: true }, 'date'),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['public-bookings'],
    queryFn: () => base44.entities.Booking.filter({ status: ['pending', 'confirmed'] }),
  });

  const { data: settingsArr = [] } = useQuery({
    queryKey: ['biz-settings'],
    queryFn: () => base44.entities.BusinessSettings.list(),
  });
  const settings = settingsArr[0] || { business_name: 'COREPROTECH' };

  const createBooking = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => setStep(3),
  });

  // Group available (not full) slots by date
  const availableSlots = useMemo(() => {
    return slots.filter(slot => {
      const booked = bookings.filter(b => b.date === slot.date && b.time_slot === slot.time_slot).length;
      return booked < (slot.max_bookings || 1) && new Date(slot.date) >= new Date(new Date().toDateString());
    });
  }, [slots, bookings]);

  const groupedByDate = useMemo(() => {
    return availableSlots.reduce((acc, slot) => {
      if (!acc[slot.date]) acc[slot.date] = [];
      acc[slot.date].push(slot);
      return acc;
    }, {});
  }, [availableSlots]);

  const handleBook = () => {
    if (!form.client_name) { toast.error('Ingresa tu nombre'); return; }
    createBooking.mutate({
      ...form,
      date: selectedSlot.date,
      time_slot: selectedSlot.time_slot,
      service: form.service || selectedSlot.service_label || '',
      status: 'pending',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-sidebar border-b border-sidebar-border px-6 py-4 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-sidebar-primary/20 flex items-center justify-center">
          <TreePine className="h-5 w-5 text-sidebar-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-sidebar-foreground">{settings.business_name}</h1>
          <p className="text-xs text-sidebar-foreground/60">Reserva tu cita</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto p-6 space-y-6">
        {/* Step 1: Pick a slot */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="font-heading font-bold text-xl flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" /> Elige fecha y hora
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Selecciona un horario disponible</p>
            </div>

            {loadingSlots ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : Object.keys(groupedByDate).length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarDays className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay horarios disponibles por ahora.</p>
                <p className="text-xs mt-1">Por favor comunícate directamente con nosotros.</p>
                {settings.business_phone && <p className="text-sm font-medium mt-3 text-primary">📞 {settings.business_phone}</p>}
              </div>
            ) : (
              Object.entries(groupedByDate).sort().map(([date, dateSlots]) => (
                <div key={date} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {dateSlots.sort((a, b) => a.time_slot.localeCompare(b.time_slot)).map(slot => (
                      <button
                        key={slot.id}
                        onClick={() => { setSelectedSlot(slot); setStep(2); }}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left text-sm font-medium"
                      >
                        <Clock className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          <p>{slot.time_slot}</p>
                          {slot.service_label && <p className="text-xs text-muted-foreground">{slot.service_label}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Step 2: Fill form */}
        {step === 2 && (
          <div className="space-y-5">
            <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" /> Cambiar horario
            </button>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-sm">
                    {new Date(selectedSlot.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedSlot.time_slot}{selectedSlot.service_label ? ` — ${selectedSlot.service_label}` : ''}</p>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="font-heading font-bold text-xl">Tus datos</h2>
              <p className="text-sm text-muted-foreground mt-1">Para confirmar tu reserva</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nombre completo *</Label>
                <Input value={form.client_name} onChange={e => u('client_name', e.target.value)} placeholder="Juan García" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Teléfono</Label>
                  <Input value={form.client_phone} onChange={e => u('client_phone', e.target.value)} placeholder="(000) 000-0000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <Input value={form.client_email} onChange={e => u('client_email', e.target.value)} placeholder="correo@email.com" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Servicio requerido</Label>
                <Input value={form.service} onChange={e => u('service', e.target.value)} placeholder="Ej: Instalación de grava, consulta..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notas adicionales</Label>
                <Textarea value={form.notes} onChange={e => u('notes', e.target.value)} placeholder="Dirección, detalles del proyecto..." rows={3} />
              </div>
            </div>

            <Button className="w-full" onClick={handleBook} disabled={createBooking.isPending || !form.client_name}>
              {createBooking.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar reserva
            </Button>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center py-12 space-y-4">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
            <h2 className="font-heading font-bold text-2xl">¡Reserva enviada!</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
              Tu solicitud fue recibida. Te contactaremos pronto para confirmar tu cita.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 inline-block text-left space-y-1">
              <p className="text-sm font-semibold">{selectedSlot?.date} — {selectedSlot?.time_slot}</p>
              <p className="text-xs text-muted-foreground">{form.client_name}</p>
            </div>
            <Button variant="outline" onClick={() => { setStep(1); setForm({ client_name: '', client_phone: '', client_email: '', service: '', notes: '' }); setSelectedSlot(null); }}>
              Hacer otra reserva
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}