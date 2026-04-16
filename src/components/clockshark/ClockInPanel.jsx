import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Clock, MapPin, LogIn, LogOut, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function ClockInPanel({ ownerEmail, employee, currentUser }) {
  const qc = useQueryClient();
  const [gettingLocation, setGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const { data: activeEntry } = useQuery({
    queryKey: ['active-entry', employee?.id],
    queryFn: () => base44.entities.TimeEntry.filter({ employee_id: employee.id, status: 'active' }),
    enabled: !!employee?.id,
    select: data => data?.[0] || null,
  });

  // Live timer
  useEffect(() => {
    if (!activeEntry) { setElapsed(0); return; }
    const update = () => setElapsed(Math.floor((Date.now() - new Date(activeEntry.clock_in)) / 60000));
    update();
    const t = setInterval(update, 30000);
    return () => clearInterval(t);
  }, [activeEntry]);

  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ lat: null, lng: null, address: null });
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        let address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await res.json();
          address = data.display_name || address;
        } catch {}
        setGettingLocation(false);
        resolve({ lat, lng, address });
      },
      () => { setGettingLocation(false); resolve({ lat: null, lng: null, address: null }); },
      { timeout: 8000 }
    );
  });

  const clockIn = useMutation({
    mutationFn: async () => {
      const { lat, lng, address } = await getLocation();
      return base44.entities.TimeEntry.create({
        business_owner_email: ownerEmail,
        employee_id: employee.id,
        employee_name: employee.full_name,
        clock_in: new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
        clock_in_address: address,
        status: 'active',
        notes,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['active-entry'] }); qc.invalidateQueries({ queryKey: ['live-entries'] }); toast.success('¡Entrada registrada!'); setNotes(''); },
    onError: () => toast.error('Error al registrar entrada'),
  });

  const clockOut = useMutation({
    mutationFn: async () => {
      const { lat, lng, address } = await getLocation();
      const duration = Math.floor((Date.now() - new Date(activeEntry.clock_in)) / 60000);
      return base44.entities.TimeEntry.update(activeEntry.id, {
        clock_out: new Date().toISOString(),
        clock_out_lat: lat,
        clock_out_lng: lng,
        clock_out_address: address,
        duration_minutes: duration,
        status: 'completed',
        notes: notes || activeEntry.notes,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['active-entry'] }); qc.invalidateQueries({ queryKey: ['live-entries'] }); toast.success('¡Salida registrada!'); setNotes(''); },
    onError: () => toast.error('Error al registrar salida'),
  });

  const isClockedIn = !!activeEntry;
  const loading = clockIn.isPending || clockOut.isPending || gettingLocation;

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <Card className={isClockedIn ? 'border-green-300 bg-green-50' : 'border-slate-200'}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" />
            {isClockedIn ? 'Trabajando ahora' : 'Fuera de turno'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isClockedIn ? (
            <div className="space-y-2">
              <div className="text-3xl font-bold text-green-700 text-center py-2">{formatDuration(elapsed)}</div>
              <div className="text-xs text-muted-foreground text-center">
                Entrada: {new Date(activeEntry.clock_in).toLocaleTimeString()}
              </div>
              {activeEntry.clock_in_address && (
                <div className="flex items-start gap-1.5 text-xs text-muted-foreground bg-white rounded p-2 border">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                  <span>{activeEntry.clock_in_address}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">Presiona para iniciar tu turno</p>
          )}

          <Textarea
            placeholder="Notas (opcional)..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="text-sm"
          />

          <Button
            className={`w-full gap-2 ${isClockedIn ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}
            onClick={() => isClockedIn ? clockOut.mutate() : clockIn.mutate()}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isClockedIn ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {loading ? (gettingLocation ? 'Obteniendo GPS...' : 'Guardando...') : isClockedIn ? 'Registrar Salida' : 'Registrar Entrada'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}