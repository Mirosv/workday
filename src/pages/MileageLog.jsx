import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Plus, Trash2, Download, CalendarRange, MapPin, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

// IRS standard mileage rate 2024-2025
const IRS_RATE = 0.67;

const today = new Date().toISOString().split('T')[0];
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const firstOfYear = `${new Date().getFullYear()}-01-01`;

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

const EMPTY_FORM = {
  date: today,
  description: '',
  from_location: '',
  to_location: '',
  odometer_start: '',
  odometer_end: '',
  business_miles: '',
  vehicle: '',
  job_id: '',
  job_name: '',
  notes: '',
};

export default function MileageLogPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [dateFrom, setDateFrom] = useState(firstOfYear);
  const [dateTo, setDateTo] = useState(today);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['mileage-logs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.MileageLog.filter({ created_by: user.email }, '-date', 500);
    },
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Job.filter({ created_by: user.email }, '-created_date');
    },
  });

  const createLog = useMutation({
    mutationFn: (data) => base44.entities.MileageLog.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage-logs'] });
      setForm(EMPTY_FORM);
      toast.success('Trip logged!');
    },
  });

  const deleteLog = useMutation({
    mutationFn: (id) => base44.entities.MileageLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mileage-logs'] });
      toast.success('Record deleted');
    },
  });

  // Auto-calculate miles from odometer
  const calcMiles = (start, end) => {
    const s = parseFloat(start);
    const e = parseFloat(end);
    if (!isNaN(s) && !isNaN(e) && e > s) return (e - s).toFixed(1);
    return form.business_miles;
  };

  const handleOdometerChange = (field, val) => {
    const updated = { ...form, [field]: val };
    const miles = calcMiles(
      field === 'odometer_start' ? val : form.odometer_start,
      field === 'odometer_end' ? val : form.odometer_end
    );
    setForm({ ...updated, business_miles: miles });
  };

  const handleJobSelect = (jobId) => {
    if (jobId === 'none') {
      setForm({ ...form, job_id: '', job_name: '' });
    } else {
      const job = jobs.find(j => j.id === jobId);
      setForm({ ...form, job_id: jobId, job_name: job ? `${job.client_name} — ${job.job_name}` : '' });
    }
  };

  const handleSubmit = () => {
    const payload = {
      ...form,
      odometer_start: parseFloat(form.odometer_start) || 0,
      odometer_end: parseFloat(form.odometer_end) || 0,
      business_miles: parseFloat(form.business_miles) || 0,
    };
    createLog.mutate(payload);
  };

  const setPreset = (preset) => {
    const now = new Date();
    if (preset === 'this_month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setDateTo(today);
    } else if (preset === 'last_month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0]);
      setDateTo(new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      setDateFrom(firstOfYear);
      setDateTo(today);
    } else if (preset === 'last_30') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    }
  };

  const filtered = useMemo(() => {
    return logs.filter(l => inRange(l.date, dateFrom, dateTo));
  }, [logs, dateFrom, dateTo]);

  const totalMiles = filtered.reduce((s, l) => s + (l.business_miles || 0), 0);
  const totalDeduction = totalMiles * IRS_RATE;

  const exportCSV = () => {
    const header = ['Date', 'Description', 'From', 'To', 'Vehicle', 'Odometer Start', 'Odometer End', 'Business Miles', 'IRS Deduction ($)', 'Job', 'Notes'];
    const rows = filtered.map(l => [
      l.date,
      `"${l.description || ''}"`,
      `"${l.from_location || ''}"`,
      `"${l.to_location || ''}"`,
      `"${l.vehicle || ''}"`,
      l.odometer_start || 0,
      l.odometer_end || 0,
      l.business_miles || 0,
      ((l.business_miles || 0) * IRS_RATE).toFixed(2),
      `"${l.job_name || ''}"`,
      `"${l.notes || ''}"`,
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mileage-log-${dateFrom}-to-${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" /> Mileage Log
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">IRS-compliant vehicle mileage record · Rate: ${IRS_RATE}/mi (2025)</p>
        </div>
        <Button variant="outline" onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Date Range */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-end gap-3">
            <CalendarRange className="h-4 w-4 text-primary mt-5 hidden sm:block" />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: 'last_30', label: '30 days' },
                { key: 'this_month', label: 'This month' },
                { key: 'last_month', label: 'Last month' },
                { key: 'this_year', label: 'This year' },
              ].map(p => (
                <Button key={p.key} variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPreset(p.key)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Business Miles</p>
            <p className="font-heading font-bold text-2xl mt-1 text-primary">{totalMiles.toFixed(1)} mi</p>
            <p className="text-xs text-muted-foreground">{filtered.length} trips in range</p>
          </CardContent>
        </Card>
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">IRS Deduction (${IRS_RATE}/mi)</p>
            <p className="font-heading font-bold text-2xl mt-1 text-primary">${totalDeduction.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Schedule C · Part II</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">YTD Miles</p>
            <p className="font-heading font-bold text-2xl mt-1 text-foreground">
              {logs.filter(l => l.date >= firstOfYear).reduce((s, l) => s + (l.business_miles || 0), 0).toFixed(1)} mi
            </p>
            <p className="text-xs text-muted-foreground">All trips this year</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Trip Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Log a Trip
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs text-muted-foreground">Business Purpose *</Label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Client visit, supply pickup, estimate..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Vehicle</Label>
              <Input value={form.vehicle} onChange={e => setForm({ ...form, vehicle: e.target.value })} placeholder="2021 Ford F-150..." />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />From</Label>
              <Input value={form.from_location} onChange={e => setForm({ ...form, from_location: e.target.value })} placeholder="Office, home..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />To</Label>
              <Input value={form.to_location} onChange={e => setForm({ ...form, to_location: e.target.value })} placeholder="Client address..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Odometer Start</Label>
              <Input type="number" value={form.odometer_start} onChange={e => handleOdometerChange('odometer_start', e.target.value)} placeholder="12500" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Odometer End</Label>
              <Input type="number" value={form.odometer_end} onChange={e => handleOdometerChange('odometer_end', e.target.value)} placeholder="12535" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Business Miles *</Label>
              <Input
                type="number"
                value={form.business_miles}
                onChange={e => setForm({ ...form, business_miles: e.target.value })}
                placeholder="Enter or auto-calculated"
              />
              {form.business_miles > 0 && (
                <p className="text-xs text-primary font-medium">
                  IRS deduction: ${(parseFloat(form.business_miles) * IRS_RATE).toFixed(2)}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Briefcase className="h-3 w-3" />Link to Job</Label>
              <Select value={form.job_id || 'none'} onValueChange={handleJobSelect}>
                <SelectTrigger><SelectValue placeholder="No job" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific job</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.client_name} — {j.job_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional..." />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={createLog.isPending || !form.description || !form.business_miles}>
            <Plus className="h-4 w-4 mr-1" /> Log Trip
          </Button>
        </CardContent>
      </Card>

      {/* Trip List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-lg">Trip History</h2>
          <span className="text-sm text-muted-foreground">{filtered.length} trips · {totalMiles.toFixed(1)} mi</span>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No trips in this range. Log your first trip above.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(log => (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{log.description}</p>
                      {log.job_name && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Briefcase className="h-2.5 w-2.5" />{log.job_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-1">
                      <span className="text-xs text-muted-foreground">{log.date}</span>
                      {log.vehicle && <span className="text-xs text-muted-foreground flex items-center gap-1"><Car className="h-3 w-3" />{log.vehicle}</span>}
                      {(log.from_location || log.to_location) && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[log.from_location, log.to_location].filter(Boolean).join(' → ')}
                        </span>
                      )}
                      {log.odometer_start > 0 && log.odometer_end > 0 && (
                        <span className="text-xs text-muted-foreground">{log.odometer_start.toLocaleString()} → {log.odometer_end.toLocaleString()}</span>
                      )}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{log.notes}"</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="font-heading font-bold text-base text-primary">{(log.business_miles || 0).toFixed(1)} mi</p>
                      <p className="text-xs text-muted-foreground">${((log.business_miles || 0) * IRS_RATE).toFixed(2)} deduction</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteLog.mutate(log.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}