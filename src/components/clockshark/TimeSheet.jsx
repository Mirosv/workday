import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, MapPin } from 'lucide-react';

function formatDur(mins) {
  if (!mins) return '—';
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function TimeSheet({ ownerEmail, currentUser, myEmployee, isAdmin }) {
  const [filterEmp, setFilterEmp] = useState('all');

  const { data: entries = [] } = useQuery({
    queryKey: ['timeentries', ownerEmail, isAdmin ? 'all' : myEmployee?.id],
    queryFn: () => isAdmin
      ? base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail }, '-clock_in', 100)
      : base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail, employee_id: myEmployee?.id }, '-clock_in', 50),
    enabled: isAdmin ? !!ownerEmail : !!myEmployee?.id,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', ownerEmail],
    queryFn: () => base44.entities.Employee.filter({ business_owner_email: ownerEmail }),
    enabled: isAdmin,
  });

  const filtered = isAdmin && filterEmp !== 'all'
    ? entries.filter(e => e.employee_id === filterEmp)
    : entries;

  const totalMins = filtered.filter(e => e.status === 'completed').reduce((a, e) => a + (e.duration_minutes || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
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
        <div className="text-sm text-muted-foreground ml-auto">
          Total: <span className="font-semibold text-foreground">{formatDur(totalMins)}</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Sin registros de tiempo
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(entry => (
            <Card key={entry.id} className={entry.status === 'active' ? 'border-green-300 bg-green-50' : ''}>
              <CardContent className="p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
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
    </div>
  );
}