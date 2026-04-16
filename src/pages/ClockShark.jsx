import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useBusiness } from '@/lib/BusinessContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmployeeManager from '@/components/clockshark/EmployeeManager';
import ClockInPanel from '@/components/clockshark/ClockInPanel';
import TimeSheet from '@/components/clockshark/TimeSheet';
import TimeOffManager from '@/components/clockshark/TimeOffManager';
import { Clock, Users, Calendar, FileText, MapPin } from 'lucide-react';

export default function ClockShark() {
  const { settings } = useBusiness();
  const [currentUser, setCurrentUser] = useState(null);
  const [myEmployee, setMyEmployee] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      setCurrentUser(u);
    });
  }, []);

  // Use settings.owner_email if available, otherwise fall back to current admin's email
  const ownerEmail = settings.owner_email || (currentUser?.role === 'admin' ? currentUser?.email : null);

  // Check if current user is an employee of this business
  useEffect(() => {
    if (!currentUser || !ownerEmail) return;
    base44.entities.Employee.filter({ business_owner_email: ownerEmail, email: currentUser.email })
      .then(results => {
        if (results && results.length > 0) setMyEmployee(results[0]);
      });
  }, [currentUser, ownerEmail]);

  const isAdmin = currentUser?.role === 'admin';
  const isEmployee = myEmployee && myEmployee.status === 'active';

  if (!currentUser) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin && !isEmployee) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <Clock className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Sin acceso</h2>
        <p className="text-muted-foreground text-sm max-w-xs">No estás registrado como empleado de esta empresa. Pide al administrador que te agregue.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> TimeTrack
          </h1>
          <p className="text-sm text-muted-foreground">Control de tiempo y empleados</p>
        </div>
        <Badge variant={isAdmin ? 'default' : 'secondary'}>
          {isAdmin ? 'Administrador' : 'Empleado'}
        </Badge>
      </div>

      <Tabs defaultValue={isEmployee ? 'clock' : 'employees'}>
        <TabsList className="flex-wrap h-auto gap-1">
          {isEmployee && <TabsTrigger value="clock"><Clock className="h-3.5 w-3.5 mr-1" />Mi Tiempo</TabsTrigger>}
          {isAdmin && <TabsTrigger value="employees"><Users className="h-3.5 w-3.5 mr-1" />Empleados</TabsTrigger>}
          {isAdmin && <TabsTrigger value="live"><MapPin className="h-3.5 w-3.5 mr-1" />En Vivo</TabsTrigger>}
          <TabsTrigger value="timesheet"><FileText className="h-3.5 w-3.5 mr-1" />Registros</TabsTrigger>
          <TabsTrigger value="timeoff"><Calendar className="h-3.5 w-3.5 mr-1" />Tiempo Libre</TabsTrigger>
        </TabsList>

        {isEmployee && (
          <TabsContent value="clock" className="mt-4">
            <ClockInPanel ownerEmail={ownerEmail} employee={myEmployee} currentUser={currentUser} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="employees" className="mt-4">
            <EmployeeManager ownerEmail={ownerEmail} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="live" className="mt-4">
            <LiveTracker ownerEmail={ownerEmail} />
          </TabsContent>
        )}

        <TabsContent value="timesheet" className="mt-4">
          <TimeSheet ownerEmail={ownerEmail} currentUser={currentUser} myEmployee={myEmployee} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="timeoff" className="mt-4">
          <TimeOffManager ownerEmail={ownerEmail} currentUser={currentUser} myEmployee={myEmployee} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LiveTracker({ ownerEmail }) {
  const { data: activeEntries = [] } = useQuery({
    queryKey: ['live-entries', ownerEmail],
    queryFn: () => base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail, status: 'active' }),
    refetchInterval: 30000,
  });

  if (activeEntries.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
          <MapPin className="h-8 w-8" />
          <p className="text-sm">Nadie trabajando en este momento</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{activeEntries.length} empleado(s) trabajando ahora</p>
      {activeEntries.map(entry => {
        const since = entry.clock_in ? Math.floor((Date.now() - new Date(entry.clock_in)) / 60000) : 0;
        return (
          <Card key={entry.id} className="border-green-200 bg-green-50">
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{entry.employee_name}</p>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Desde {new Date(entry.clock_in).toLocaleTimeString()} · {since} min
                </p>
                {entry.clock_in_address && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {entry.clock_in_address}
                  </p>
                )}
                {entry.clock_in_lat && (
                  <a
                    href={`https://maps.google.com/?q=${entry.clock_in_lat},${entry.clock_in_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary underline mt-1 block"
                  >
                    Ver en mapa
                  </a>
                )}
              </div>
              <Badge className="bg-green-500 text-white text-xs">Activo</Badge>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}