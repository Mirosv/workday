import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusiness } from '@/lib/BusinessContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];
const currentMonth = new Date().getMonth();
const currentYear = new Date().getFullYear();

function isThisMonth(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
}

export default function MoneyTracker() {
  const { tr } = useBusiness();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', amount: 0, date: today });

  const { data: expenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Expense.filter({ created_by: user.email }, '-created_date');
    },
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Job.filter({ created_by: user.email }, '-created_date');
    },
  });

  const createExpense = useMutation({
    mutationFn: (data) => base44.entities.Expense.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setForm({ name: '', amount: 0, date: today });
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

  const stats = useMemo(() => {
    const paidJobs = jobs.filter(j => j.status === 'paid' && isThisMonth(j.date));
    const income = paidJobs.reduce((s, j) => s + (j.total_price || j.grand_total || 0), 0);
    const monthExpenses = expenses.filter(e => isThisMonth(e.date));
    const totalExpenses = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
    return { income, totalExpenses, profit: income - totalExpenses };
  }, [jobs, expenses]);

  const isLoading = loadingExpenses || loadingJobs;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" />
          {tr('moneyTrackerTitle')}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{tr('moneyTrackerDesc')}</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label={tr('incomeMonth')} value={stats.income} icon={TrendingUp} positive />
        <StatCard label={tr('expensesMonth')} value={stats.totalExpenses} icon={TrendingDown} />
        <StatCard label={tr('profitMonth')} value={stats.profit} icon={DollarSign} positive={stats.profit >= 0} highlight />
      </div>

      {/* Add expense form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('expenseName')}</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gas, mulch, tool repair..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('amount')}</Label>
              <Input type="number" value={form.amount || ''} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{tr('date')}</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{tr('onlyThisMonth')}</p>
          <Button onClick={() => createExpense.mutate(form)} disabled={createExpense.isPending || !form.name}>
            <Plus className="h-4 w-4 mr-1" /> {tr('addExpense')}
          </Button>
        </CardContent>
      </Card>

      {/* Saved expenses */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-3">{tr('savedExpenses')}</h2>
        <p className="text-xs text-muted-foreground mb-4">{tr('onlyThisMonth')}</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : expenses.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              {tr('noExpenses')}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {expenses.map(exp => (
              <Card key={exp.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{exp.name}</p>
                    <p className="text-xs text-muted-foreground">{exp.date}</p>
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

function StatCard({ label, value, icon: Icon, positive, highlight }) {
  return (
    <Card className={highlight ? 'border-primary/30 bg-primary/5' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className={`h-4 w-4 ${positive ? 'text-primary' : 'text-destructive'}`} />
        </div>
        <p className={`font-heading font-bold text-2xl mt-1 ${positive ? 'text-primary' : 'text-destructive'}`}>
          ${value.toFixed(2)}
        </p>
      </CardContent>
    </Card>
  );
}