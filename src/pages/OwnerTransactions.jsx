import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Trash2, Download, TrendingUp, TrendingDown, ArrowLeftRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];
const currentYear = new Date().getFullYear();

const TRANSACTION_TYPES = {
  owner_contribution:       { label: 'Owner Contribution',          color: 'bg-emerald-100 text-emerald-800', direction: 'in' },
  owner_distribution:       { label: 'Owner Distribution',          color: 'bg-orange-100 text-orange-800',   direction: 'out' },
  owner_loan_to_business:   { label: 'Loan to Business (from owner)', color: 'bg-blue-100 text-blue-800',    direction: 'in' },
  owner_loan_from_business: { label: 'Loan from Business (to owner)', color: 'bg-purple-100 text-purple-800', direction: 'out' },
  owner_payment_personal:   { label: 'Personal Expense Paid by LLC', color: 'bg-red-100 text-red-800',       direction: 'out' },
  owner_reimbursement:      { label: 'Owner Reimbursement',         color: 'bg-yellow-100 text-yellow-800',   direction: 'in' },
  related_party_sale:       { label: 'Sale to Related Party',       color: 'bg-teal-100 text-teal-800',       direction: 'in' },
  related_party_purchase:   { label: 'Purchase from Related Party', color: 'bg-pink-100 text-pink-800',       direction: 'out' },
  other:                    { label: 'Other Reportable',            color: 'bg-gray-100 text-gray-700',        direction: 'other' },
};

const PAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'check',         label: 'Check' },
  { value: 'zelle',         label: 'Zelle' },
  { value: 'venmo',         label: 'Venmo' },
  { value: 'cash',          label: 'Cash' },
  { value: 'credit_card',   label: 'Credit Card' },
  { value: 'other',         label: 'Other' },
];

const EMPTY_FORM = {
  date: today,
  transaction_type: 'owner_contribution',
  amount: '',
  description: '',
  counterparty_name: '',
  counterparty_country: 'US',
  payment_method: 'bank_transfer',
  reference_number: '',
  account: '',
  tax_year: currentYear,
  notes: '',
};

export default function OwnerTransactions() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [showForm, setShowForm] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['owner-transactions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.OwnerTransaction.filter({ created_by: user.email }, '-date', 1000);
    },
  });

  const createTx = useMutation({
    mutationFn: (data) => base44.entities.OwnerTransaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-transactions'] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success('Transaction recorded!');
    },
  });

  const deleteTx = useMutation({
    mutationFn: (id) => base44.entities.OwnerTransaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-transactions'] });
      toast.success('Deleted');
    },
  });

  const years = useMemo(() => {
    const set = new Set(transactions.map(t => String(t.tax_year || new Date(t.date).getFullYear())));
    set.add(String(currentYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const yr = t.tax_year || new Date(t.date).getFullYear();
      return String(yr) === filterYear;
    });
  }, [transactions, filterYear]);

  // Summaries for Form 5472 sections
  const summary = useMemo(() => {
    const contributions  = filtered.filter(t => t.transaction_type === 'owner_contribution').reduce((s, t) => s + (t.amount || 0), 0);
    const distributions  = filtered.filter(t => t.transaction_type === 'owner_distribution').reduce((s, t) => s + (t.amount || 0), 0);
    const loansReceived  = filtered.filter(t => t.transaction_type === 'owner_loan_to_business').reduce((s, t) => s + (t.amount || 0), 0);
    const loansMade      = filtered.filter(t => t.transaction_type === 'owner_loan_from_business').reduce((s, t) => s + (t.amount || 0), 0);
    const personalPaid   = filtered.filter(t => t.transaction_type === 'owner_payment_personal').reduce((s, t) => s + (t.amount || 0), 0);
    const reimbursements = filtered.filter(t => t.transaction_type === 'owner_reimbursement').reduce((s, t) => s + (t.amount || 0), 0);
    const totalIn  = contributions + loansReceived + reimbursements;
    const totalOut = distributions + loansMade + personalPaid;
    return { contributions, distributions, loansReceived, loansMade, personalPaid, reimbursements, totalIn, totalOut };
  }, [filtered]);

  const handleSubmit = () => {
    createTx.mutate({
      ...form,
      amount: parseFloat(form.amount) || 0,
      tax_year: parseInt(form.tax_year) || currentYear,
    });
  };

  const exportCSV = () => {
    const header = ['Date', 'Tax Year', 'Transaction Type', 'Amount', 'Description', 'Counterparty', 'Country', 'Payment Method', 'Reference #', 'Account', 'Notes'];
    const rows = filtered.map(t => [
      t.date,
      t.tax_year || '',
      TRANSACTION_TYPES[t.transaction_type]?.label || t.transaction_type,
      t.amount || 0,
      `"${t.description || ''}"`,
      `"${t.counterparty_name || ''}"`,
      t.counterparty_country || '',
      t.payment_method || '',
      `"${t.reference_number || ''}"`,
      `"${t.account || ''}"`,
      `"${t.notes || ''}"`,
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `form-5472-transactions-${filterYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported for accountant!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Owner Transactions
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Form 5472 · Related-party & owner transactions log</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV} className="gap-2 h-9">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button onClick={() => setShowForm(!showForm)} className="gap-2 h-9">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      {/* IRS Notice */}
      <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>Form 5472</strong> is required for foreign-owned single-member LLCs and corporations with foreign shareholders. Report all transactions between the LLC and its owner(s). Penalty: $25,000+ per form. Consult your CPA.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><TrendingUp className="h-3 w-3 text-emerald-600" />Contributions</p>
            <p className="font-heading font-bold text-xl mt-1 text-emerald-700">${summary.contributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><TrendingDown className="h-3 w-3 text-orange-600" />Distributions</p>
            <p className="font-heading font-bold text-xl mt-1 text-orange-700">${summary.distributions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><ArrowLeftRight className="h-3 w-3 text-blue-600" />Loans In</p>
            <p className="font-heading font-bold text-xl mt-1 text-blue-700">${summary.loansReceived.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium flex items-center gap-1"><ArrowLeftRight className="h-3 w-3 text-purple-600" />Loans Out</p>
            <p className="font-heading font-bold text-xl mt-1 text-purple-700">${summary.loansMade.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary summary */}
      {(summary.personalPaid > 0 || summary.reimbursements > 0) && (
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Personal Expenses Paid by LLC</p>
              <p className="font-heading font-bold text-xl mt-1 text-red-700">${summary.personalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-medium">Owner Reimbursements</p>
              <p className="font-heading font-bold text-xl mt-1 text-yellow-700">${summary.reimbursements.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Net summary bar */}
      <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-3 text-sm">
        <span className="text-muted-foreground">Total flowing IN to LLC ({filterYear})</span>
        <span className="font-bold text-emerald-700">${summary.totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground mx-2">|</span>
        <span className="text-muted-foreground">Total flowing OUT of LLC</span>
        <span className="font-bold text-red-700">${summary.totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        <span className="text-muted-foreground mx-2">|</span>
        <span className="text-muted-foreground">Transactions</span>
        <span className="font-bold">{filtered.length}</span>
      </div>

      {/* Add Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" /> Record Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Tax Year</Label>
                <Input type="number" value={form.tax_year} onChange={e => setForm({ ...form, tax_year: e.target.value })} placeholder="2025" />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs text-muted-foreground">Transaction Type *</Label>
                <Select value={form.transaction_type} onValueChange={v => setForm({ ...form, transaction_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TRANSACTION_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount ($) *</Label>
                <Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label className="text-xs text-muted-foreground">Description *</Label>
                <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Capital injection, owner draw, personal expense paid by LLC..." />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Counterparty Name</Label>
                <Input value={form.counterparty_name} onChange={e => setForm({ ...form, counterparty_name: e.target.value })} placeholder="Owner / Shareholder name" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Input value={form.counterparty_country} onChange={e => setForm({ ...form, counterparty_country: e.target.value })} placeholder="US, MX, CO..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Payment Method</Label>
                <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Reference # / Memo</Label>
                <Input value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} placeholder="Wire #, check #..." />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Account</Label>
                <Input value={form.account} onChange={e => setForm({ ...form, account: e.target.value })} placeholder="Business checking, savings..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Additional context for accountant..." />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSubmit} disabled={createTx.isPending || !form.description || !form.amount}>
                <Plus className="h-4 w-4 mr-1" /> Save Transaction
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-lg">Transactions — {filterYear}</h2>
          <span className="text-sm text-muted-foreground">{filtered.length} records</span>
        </div>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">Loading...</CardContent></Card>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No transactions for {filterYear}. Add your first one above.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(tx => {
              const meta = TRANSACTION_TYPES[tx.transaction_type] || TRANSACTION_TYPES.other;
              return (
                <Card key={tx.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${meta.color} border-0 text-xs font-medium`}>{meta.label}</Badge>
                        <p className="font-medium text-sm truncate">{tx.description}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap mt-1">
                        <span className="text-xs text-muted-foreground">{tx.date}</span>
                        {tx.counterparty_name && (
                          <span className="text-xs text-muted-foreground">👤 {tx.counterparty_name} ({tx.counterparty_country})</span>
                        )}
                        {tx.payment_method && (
                          <span className="text-xs text-muted-foreground capitalize">{tx.payment_method.replace('_', ' ')}</span>
                        )}
                        {tx.reference_number && (
                          <span className="text-xs text-muted-foreground">Ref: {tx.reference_number}</span>
                        )}
                        {tx.account && (
                          <span className="text-xs text-muted-foreground">Acct: {tx.account}</span>
                        )}
                      </div>
                      {tx.notes && <p className="text-xs text-muted-foreground italic mt-0.5">"{tx.notes}"</p>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`font-heading font-bold text-base ${meta.direction === 'in' ? 'text-emerald-700' : meta.direction === 'out' ? 'text-red-600' : 'text-foreground'}`}>
                        {meta.direction === 'in' ? '+' : meta.direction === 'out' ? '-' : ''}${(tx.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTx.mutate(tx.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}