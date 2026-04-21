import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaidLink } from 'react-plaid-link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Landmark, Link, RefreshCw, CheckCircle, XCircle, Loader2, AlertCircle, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function PlaidConnectButton({ onSuccess }) {
  const [linkToken, setLinkToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);

  const fetchToken = useCallback(async () => {
    setLoadingToken(true);
    const res = await base44.functions.invoke('plaidCreateLinkToken', {});
    setLinkToken(res.data?.link_token || null);
    setLoadingToken(false);
  }, []);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (public_token) => {
      const res = await base44.functions.invoke('plaidExchangeToken', { public_token });
      if (res.data?.success) {
        toast.success('¡Banco conectado exitosamente!');
        onSuccess();
      } else {
        toast.error('Error al conectar banco');
      }
      setLinkToken(null);
    },
    onExit: () => setLinkToken(null),
  });

  // Auto-open once token is ready
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <Button onClick={fetchToken} disabled={loadingToken}>
      {loadingToken ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link className="h-4 w-4 mr-2" />}
      Conectar Banco
    </Button>
  );
}

export default function Accounting() {
  const queryClient = useQueryClient();
  const [bankConnected, setBankConnected] = useState(false);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [startDate, setStartDate] = useState(ninetyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => {
    base44.auth.me().then(u => setBankConnected(!!u?.plaid_access_token));
  }, []);

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses-reconcile'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Expense.filter({ created_by: user.email }, '-date', 500);
    },
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['reconcile-matches'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ReconcileMatch.filter({ owner_email: user.email }, '-plaid_date', 500);
    },
  });

  const saveMatch = useMutation({
    mutationFn: async ({ txnId, expenseId, expenseName, status, date, name, amount }) => {
      const user = await base44.auth.me();
      const existing = matches.find(m => m.plaid_transaction_id === txnId);
      if (existing) {
        return base44.entities.ReconcileMatch.update(existing.id, { expense_id: expenseId, expense_name: expenseName, status });
      }
      return base44.entities.ReconcileMatch.create({
        owner_email: user.email,
        plaid_transaction_id: txnId,
        plaid_date: date,
        plaid_name: name,
        plaid_amount: amount,
        expense_id: expenseId,
        expense_name: expenseName,
        status,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reconcile-matches'] }),
  });

  const fetchTransactions = useCallback(async () => {
    setLoadingTxns(true);
    const res = await base44.functions.invoke('plaidGetTransactions', { start_date: startDate, end_date: endDate });
    if (res.data?.transactions) {
      setTransactions(res.data.transactions);
      setAccounts(res.data.accounts);
    } else {
      toast.error('Error al obtener transacciones');
    }
    setLoadingTxns(false);
  }, [startDate, endDate]);

  useEffect(() => {
    if (bankConnected) fetchTransactions();
  }, [bankConnected]);

  const getMatch = (txnId) => matches.find(m => m.plaid_transaction_id === txnId);

  const statusBadge = (status) => {
    if (status === 'matched') return <Badge className="bg-green-100 text-green-800 border-green-300">✓ Coincide</Badge>;
    if (status === 'ignored') return <Badge variant="outline" className="text-muted-foreground">Ignorado</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendiente</Badge>;
  };

  const resolvedCount = matches.filter(m => m.status === 'matched' || m.status === 'ignored').length;
  const summary = {
    total: transactions.length,
    matched: matches.filter(m => m.status === 'matched').length,
    ignored: matches.filter(m => m.status === 'ignored').length,
    pending: Math.max(0, transactions.length - resolvedCount),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <Landmark className="h-7 w-7 text-primary" />
          Accounting & Reconciliación
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Conecta tu banco vía Plaid y reconcilia tus transacciones con los gastos registrados.</p>
      </div>

      {/* Connect Bank */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {bankConnected
              ? <CheckCircle className="h-6 w-6 text-green-600" />
              : <AlertCircle className="h-6 w-6 text-yellow-500" />}
            <div>
              <p className="font-medium text-sm">{bankConnected ? 'Banco conectado' : 'Sin banco conectado'}</p>
              <p className="text-xs text-muted-foreground">
                {bankConnected ? `${accounts.length} cuenta(s) vinculada(s)` : 'Conecta tu banco para importar transacciones'}
              </p>
            </div>
          </div>
          <PlaidConnectButton onSuccess={() => { setBankConnected(true); fetchTransactions(); }} />
        </CardContent>
      </Card>

      {bankConnected && (
        <>
          {/* Date filter */}
          <Card>
            <CardContent className="p-4 flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Desde</Label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-8 w-36 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hasta</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-8 w-36 text-sm" />
              </div>
              <Button size="sm" onClick={fetchTransactions} disabled={loadingTxns}>
                {loadingTxns ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Importar Transacciones
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total', val: summary.total, color: 'text-foreground' },
              { label: 'Coinciden', val: summary.matched, color: 'text-green-700' },
              { label: 'Pendientes', val: summary.pending, color: 'text-yellow-700' },
              { label: 'Ignorados', val: summary.ignored, color: 'text-muted-foreground' },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className={`font-heading font-bold text-2xl ${s.color}`}>{s.val}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Transactions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="h-4 w-4 text-primary" />
                Transacciones del Banco
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingTxns ? (
                <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : transactions.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-10">Sin transacciones en el rango seleccionado</p>
              ) : (
                <div className="divide-y">
                  {transactions.map(txn => {
                    const match = getMatch(txn.transaction_id);
                    const isDebit = txn.amount > 0;
                    return (
                      <div key={txn.transaction_id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{txn.name}</span>
                            {statusBadge(match?.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{txn.date} · {txn.category?.join(' › ') || '—'}</p>
                          {match?.expense_name && (
                            <p className="text-xs text-green-700 mt-0.5">↔ {match.expense_name}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`font-heading font-bold text-sm ${isDebit ? 'text-destructive' : 'text-primary'}`}>
                            {isDebit ? '-' : '+'}${Math.abs(txn.amount).toFixed(2)}
                          </span>
                          {match?.status !== 'matched' && (
                            <Select
                              value={match?.expense_id || ''}
                              onValueChange={(expId) => {
                                const exp = expenses.find(e => e.id === expId);
                                saveMatch.mutate({
                                  txnId: txn.transaction_id,
                                  expenseId: expId,
                                  expenseName: exp ? `${exp.name} ($${exp.amount})` : '',
                                  status: 'matched',
                                  date: txn.date,
                                  name: txn.name,
                                  amount: txn.amount,
                                });
                              }}
                            >
                              <SelectTrigger className="h-7 text-xs w-44">
                                <SelectValue placeholder="Ligar a gasto..." />
                              </SelectTrigger>
                              <SelectContent>
                                {expenses.map(e => (
                                  <SelectItem key={e.id} value={e.id}>
                                    {e.name} — ${e.amount} ({e.date})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {match?.status === 'matched' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                              onClick={() => saveMatch.mutate({ txnId: txn.transaction_id, expenseId: '', expenseName: '', status: 'unmatched', date: txn.date, name: txn.name, amount: txn.amount })}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Desligar
                            </Button>
                          )}
                          {match?.status !== 'ignored' && match?.status !== 'matched' && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                              onClick={() => saveMatch.mutate({ txnId: txn.transaction_id, expenseId: '', expenseName: '', status: 'ignored', date: txn.date, name: txn.name, amount: txn.amount })}>
                              Ignorar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}