import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/BusinessContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Loader2, Briefcase, BarChart3, Receipt, Users, Clock, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const today = new Date().toISOString().split('T')[0];

// First day of current month
const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

const CATEGORIES = ['materials', 'fuel', 'tools', 'labor', 'disposal', 'other'];
const CAT_COLORS = {
  materials: '#3b82f6',
  fuel: '#f59e0b',
  tools: '#8b5cf6',
  labor: '#10b981',
  disposal: '#ef4444',
  other: '#6b7280',
};

function inRange(dateStr, from, to) {
  if (!dateStr) return false;
  return dateStr >= from && dateStr <= to;
}

export default function MoneyTracker() {
  const { tr } = useBusiness();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', amount: '', date: today, job_id: '', job_name: '', category: 'other' });
  const [filterProject, setFilterProject] = useState('all');
  const [dateFrom, setDateFrom] = useState(firstOfMonth);
  const [dateTo, setDateTo] = useState(today);

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Expense.filter({ created_by: user.email }, '-date');
    },
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Job.filter({ created_by: user.email }, '-created_date');
    },
  });

  const { settings, currentUser } = useBusiness();
  // Admin uses their own email; employee uses the business owner's email from settings
  const ownerEmail = settings.owner_email || currentUser?.email;

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', ownerEmail],
    queryFn: () => base44.entities.Employee.filter({ business_owner_email: ownerEmail }),
    enabled: !!ownerEmail,
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['timeentries-money', ownerEmail],
    queryFn: () => base44.entities.TimeEntry.filter({ business_owner_email: ownerEmail, status: 'completed' }, '-clock_in', 500),
    enabled: !!ownerEmail,
  });

  const createExpense = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setForm({ name: '', amount: '', date: today, job_id: '', job_name: '', category: 'other' });
      toast.success(tr('expenseSaved'));
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(tr('expenseDeleted'));
    },
  });

  // Stats calculated over the selected date range
  const stats = useMemo(() => {
    const rangeJobs = jobs.filter(j => j.status === 'paid' && j.date && inRange(j.date, dateFrom, dateTo));
    const income = rangeJobs.reduce((s, j) => s + (j.grand_total || j.total_price || 0), 0);

    const rangeExpenses = expenses.filter(e => e.date && inRange(e.date, dateFrom, dateTo));
    const totalExpenses = rangeExpenses.reduce((s, e) => s + (e.amount || 0), 0);

    // Labor cost in range (by clock_in date)
    const empMap = {};
    employees.forEach(emp => {
      const entries = timeEntries.filter(e => {
        if (e.employee_id !== emp.id) return false;
        if (!e.clock_in) return false;
        // Normalize to YYYY-MM-DD regardless of ISO format
        const raw = e.clock_in;
        let d;
        if (typeof raw === 'string' && raw.length >= 10) {
          d = raw.substring(0, 10);
        } else {
          d = new Date(raw).toISOString().split('T')[0];
        }
        return inRange(d, dateFrom, dateTo);
      });
      const totalMins = entries.reduce((s, e) => s + (e.duration_minutes || 0), 0);
      const hours = totalMins / 60;
      const cost = hours * (emp.hourly_rate || 0);
      if (hours > 0) {
        empMap[emp.id] = { name: emp.full_name, hours: hours.toFixed(1), cost, hourly_rate: emp.hourly_rate || 0 };
      }
    });
    const totalLaborCost = Object.values(empMap).reduce((s, e) => s + e.cost, 0);

    const totalCosts = totalExpenses + totalLaborCost;
    const profit = income - totalCosts;
    const margin = income > 0 ? ((profit / income) * 100).toFixed(1) : '0.0';

    // By category (range)
    const byCat = {};
    rangeExpenses.forEach(e => {
      const cat = e.category || 'other';
      byCat[cat] = (byCat[cat] || 0) + (e.amount || 0);
    });

    // By project (range)
    const byProject = {};
    rangeExpenses.forEach(e => {
      const key = e.job_id ? (e.job_name || e.job_id) : 'general';
      byProject[key] = (byProject[key] || 0) + (e.amount || 0);
    });

    return { income, totalExpenses, totalLaborCost, totalCosts, profit, margin, byCat, byProject, empMap };
  }, [jobs, expenses, employees, timeEntries, dateFrom, dateTo]);

  // Last 6 months chart data (always shows full months, independent of filter)
  const chartData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth();
      const y = d.getFullYear();
      const label = d.toLocaleDateString('en', { month: 'short' });
      const rev = jobs.filter(j => j.status === 'paid' && j.date && new Date(j.date).getMonth() === m && new Date(j.date).getFullYear() === y)
        .reduce((s, j) => s + (j.grand_total || j.total_price || 0), 0);
      const exp = expenses.filter(e => e.date && new Date(e.date).getMonth() === m && new Date(e.date).getFullYear() === y)
        .reduce((s, e) => s + (e.amount || 0), 0);
      months.push({ label, revenue: rev, expenses: exp, profit: rev - exp });
    }
    return months;
  }, [jobs, expenses]);

  const filteredExpenses = useMemo(() => {
    let list = expenses;
    if (filterProject !== 'all') {
      list = filterProject === 'general' ? list.filter(e => !e.job_id) : list.filter(e => e.job_id === filterProject);
    }
    // Also filter by date range
    return list.filter(e => e.date && inRange(e.date, dateFrom, dateTo));
  }, [expenses, filterProject, dateFrom, dateTo]);

  const isLoading = loadingExpenses || loadingJobs;

  const handleJobSelect = (jobId) => {
    if (jobId === 'general') {
      setForm({ ...form, job_id: '', job_name: '' });
    } else {
      const job = jobs.find(j => j.id === jobId);
      setForm({ ...form, job_id: jobId, job_name: job ? `${job.client_name} — ${job.job_name}` : '' });
    }
  };

  const setPreset = (preset) => {
    const now = new Date();
    if (preset === 'this_month') {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
      setDateTo(today);
    } else if (preset === 'last_month') {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(first.toISOString().split('T')[0]);
      setDateTo(last.toISOString().split('T')[0]);
    } else if (preset === 'this_year') {
      setDateFrom(`${now.getFullYear()}-01-01`);
      setDateTo(today);
    } else if (preset === 'last_7') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (preset === 'last_30') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          {tr('moneyTrackerTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{tr('moneyTrackerDesc')}</p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <CalendarRange className="h-4 w-4 text-primary mt-1 hidden sm:block" />
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
                { key: 'this_year', label: 'Este año' },
              ].map(p => (
                <Button key={p.key} variant="outline" size="sm" className="h-8 text-xs" onClick={() => setPreset(p.key)}>
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Ingresos" value={stats.income} icon={TrendingUp} positive />
        <div className="space-y-2">
          <StatCard label="Gastos" value={stats.totalExpenses} icon={TrendingDown} compact />
          <StatCard label="Nómina" value={stats.totalLaborCost} icon={Users} compact />
        </div>
        <StatCard label="Ganancia neta" value={stats.profit} icon={DollarSign} positive={stats.profit >= 0} highlight />
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Margen %</p>
            <p className={`font-heading font-bold text-2xl mt-1 ${stats.profit >= 0 ? 'text-primary' : 'text-destructive'}`}>
              {stats.margin}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Total costos: ${stats.totalCosts.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Add expense form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" /> {tr('addExpense')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('expenseName')}</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gas, mulch, tool repair..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('amount')}</Label>
              <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('date')}</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('category')}</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{tr(`cat_${c}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="h-3 w-3" /> {tr('linkToProject')}
            </Label>
            <Select value={form.job_id || 'general'} onValueChange={handleJobSelect}>
              <SelectTrigger className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{tr('generalExpense')}</SelectItem>
                {jobs.map(j => (
                  <SelectItem key={j.id} value={j.id}>{j.client_name} — {j.job_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => createExpense.mutate({ ...form, amount: parseFloat(form.amount) || 0 })} disabled={createExpense.isPending || !form.name}>
            <Plus className="h-4 w-4 mr-1" /> {tr('addExpense')}
          </Button>
        </CardContent>
      </Card>

      {/* Revenue vs Expenses Chart — last 6 months */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> {tr('revenueVsExpenses')} — últimos 6 meses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={2}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip formatter={(v) => `$${v.toFixed(2)}`} />
                <Bar dataKey="revenue" name="Revenue" fill="hsl(152,45%,28%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(0,72%,51%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="hsl(36,80%,50%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="flex gap-4 mt-2 justify-center text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Revenue</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-destructive inline-block" /> Expenses</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-accent inline-block" /> Profit</span>
          </div>
        </CardContent>
      </Card>

      {/* By Category */}
      {Object.keys(stats.byCat).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{tr('category')} — rango seleccionado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats.byCat).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
                const pct = stats.totalExpenses > 0 ? (amt / stats.totalExpenses) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{tr(`cat_${cat}`)}</span>
                      <span className="text-muted-foreground">${amt.toFixed(2)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: CAT_COLORS[cat] || '#6b7280' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Project */}
      {Object.keys(stats.byProject).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" /> {tr('projectBreakdown')} — rango seleccionado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Object.entries(stats.byProject).sort((a, b) => b[1] - a[1]).map(([proj, amt]) => (
                <div key={proj} className="flex justify-between py-2 text-sm">
                  <span className="font-medium">{proj === 'general' ? tr('noProject') : proj}</span>
                  <span className="text-destructive font-semibold">-${amt.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payroll / Labor Costs */}
      {Object.keys(stats.empMap).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Nómina — rango seleccionado
              <span className="ml-auto text-destructive font-bold text-sm">-${stats.totalLaborCost.toFixed(2)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {Object.values(stats.empMap).map(emp => (
                <div key={emp.name} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{emp.hours}h · ${emp.hourly_rate}/hr
                    </p>
                  </div>
                  <span className="text-destructive font-semibold">-${emp.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expense History */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-heading font-semibold text-lg">{tr('expenseHistory')}</h2>
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tr('allExpenses')}</SelectItem>
              <SelectItem value="general">{tr('generalExpense')}</SelectItem>
              {jobs.map(j => (
                <SelectItem key={j.id} value={j.id}>{j.client_name} — {j.job_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filteredExpenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">{tr('noExpenses')}</CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map(exp => (
              <Card key={exp.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CAT_COLORS[exp.category || 'other'] }} />
                    <div>
                      <p className="font-medium text-sm">{exp.name}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-xs text-muted-foreground">{exp.date}</p>
                        {exp.job_name && (
                          <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Briefcase className="h-2.5 w-2.5" />{exp.job_name}
                          </span>
                        )}
                        {exp.category && (
                          <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">{tr(`cat_${exp.category}`)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-base text-destructive">-${(exp.amount || 0).toFixed(2)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteExpense.mutate(exp.id)}>
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

function StatCard({ label, value, icon: Icon, positive, highlight, compact }) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className={`h-4 w-4 ${positive ? 'text-primary' : 'text-destructive'}`} />
        </div>
        <p className={`font-heading font-bold ${compact ? 'text-lg' : 'text-2xl'} mt-1 ${positive ? 'text-primary' : 'text-destructive'}`}>
          ${(value || 0).toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}