import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Briefcase, DollarSign, Users, Clock, FileText, Database, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

function toCSV(rows, headers) {
  if (!rows || rows.length === 0) return null;
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  rows.forEach(row => lines.push(headers.map(h => escape(row[h])).join(',')));
  return lines.join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const EXPORTS = [
  {
    key: 'jobs',
    label: 'Trabajos / CRM',
    desc: 'Clientes, cotizaciones, facturas y status',
    icon: Briefcase,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    fetch: async (user) => base44.entities.Job.filter({ created_by: user.email }, '-created_date', 1000),
    headers: ['id', 'created_date', 'client_name', 'client_phone', 'client_email', 'job_name', 'job_address', 'status', 'priority', 'date', 'invoice_number', 'total_price', 'grand_total', 'notes'],
    filename: 'jobs_crm.csv',
  },
  {
    key: 'expenses',
    label: 'Gastos',
    desc: 'Todos los gastos registrados con categorías',
    icon: DollarSign,
    color: 'text-red-600',
    bg: 'bg-red-50',
    fetch: async (user) => base44.entities.Expense.filter({ created_by: user.email }, '-date', 1000),
    headers: ['id', 'created_date', 'date', 'name', 'amount', 'category', 'tax_category', 'payment_method', 'receipt_ref', 'job_name'],
    filename: 'gastos.csv',
  },
  {
    key: 'employees',
    label: 'Empleados',
    desc: 'Lista de empleados con tarifas y status',
    icon: Users,
    color: 'text-green-600',
    bg: 'bg-green-50',
    fetch: async (user) => {
      const settings = await base44.entities.BusinessSettings.filter({ owner_email: user.email });
      const ownerEmail = settings[0]?.owner_email || user.email;
      return base44.entities.Employee.filter({ business_owner_email: ownerEmail }, 'full_name', 500);
    },
    headers: ['id', 'created_date', 'full_name', 'email', 'phone', 'position', 'role', 'hourly_rate', 'status', 'lunch_break_minutes', 'lunch_paid'],
    filename: 'empleados.csv',
  },
  {
    key: 'timeentries',
    label: 'Registro de Horas',
    desc: 'Entradas y salidas de todos los empleados',
    icon: Clock,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    fetch: async (user) => {
      const settings = await base44.entities.BusinessSettings.filter({ owner_email: user.email });
      const ownerEmail = settings[0]?.owner_email || user.email;
      return base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail }, '-clock_in', 2000);
    },
    headers: ['id', 'created_date', 'employee_name', 'clock_in', 'clock_out', 'duration_minutes', 'status', 'clock_in_address', 'clock_out_address', 'notes'],
    filename: 'horas_trabajadas.csv',
  },
  {
    key: 'mileage',
    label: 'Registro de Millas',
    desc: 'Viajes y millas de negocio registradas',
    icon: FileText,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    fetch: async (user) => base44.entities.MileageLog.filter({ created_by: user.email }, '-date', 1000),
    headers: ['id', 'created_date', 'date', 'description', 'from_location', 'to_location', 'odometer_start', 'odometer_end', 'business_miles', 'vehicle', 'job_name', 'notes'],
    filename: 'millas.csv',
  },
];

export default function DataExport() {
  const [loading, setLoading] = useState({});
  const [done, setDone] = useState({});

  const handleExport = async (exp) => {
    setLoading(l => ({ ...l, [exp.key]: true }));
    setDone(d => ({ ...d, [exp.key]: false }));
    try {
      const user = await base44.auth.me();
      const rows = await exp.fetch(user);
      if (!rows || rows.length === 0) {
        toast.info(`Sin datos para exportar en "${exp.label}"`);
        setLoading(l => ({ ...l, [exp.key]: false }));
        return;
      }
      const csv = toCSV(rows, exp.headers);
      downloadCSV(csv, exp.filename);
      toast.success(`${rows.length} registros exportados — ${exp.filename}`);
      setDone(d => ({ ...d, [exp.key]: true }));
      setTimeout(() => setDone(d => ({ ...d, [exp.key]: false })), 3000);
    } catch (err) {
      toast.error(`Error al exportar ${exp.label}: ${err.message}`);
    }
    setLoading(l => ({ ...l, [exp.key]: false }));
  };

  const handleExportAll = async () => {
    for (const exp of EXPORTS) {
      await handleExport(exp);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <Database className="h-7 w-7 text-primary" />
          Exportar Datos
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Descarga toda tu información en archivos CSV listos para Excel, Google Sheets o tu contador.
        </p>
      </div>

      {/* Export All */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-base">Exportar todo de una vez</p>
            <p className="text-sm text-muted-foreground">Descarga todos los módulos como archivos CSV separados.</p>
          </div>
          <Button onClick={handleExportAll} className="shrink-0 gap-2">
            <Download className="h-4 w-4" /> Descargar Todo
          </Button>
        </CardContent>
      </Card>

      {/* Individual exports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {EXPORTS.map(exp => {
          const Icon = exp.icon;
          const isLoading = loading[exp.key];
          const isDone = done[exp.key];
          return (
            <Card key={exp.key} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${exp.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-5 w-5 ${exp.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{exp.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{exp.desc}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{exp.filename}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExport(exp)}
                  disabled={isLoading}
                  className={isDone ? 'border-green-400 text-green-700' : ''}
                >
                  {isLoading
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : isDone
                      ? <CheckCircle className="h-4 w-4" />
                      : <Download className="h-4 w-4" />
                  }
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Los archivos CSV se abren con Excel, Google Sheets o cualquier editor de hojas de cálculo.
      </p>
    </div>
  );
}