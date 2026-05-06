import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Loader2, Search, LayoutGrid, List, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import KanbanBoard from '@/components/crm/KanbanBoard';
import ListView from '@/components/crm/ListView';
import JobModal from '@/components/crm/JobModal';
import AddJobModal from '@/components/crm/AddJobModal';
import { useBusiness } from '@/lib/BusinessContext';

export default function JobTracker() {
  const { tr } = useBusiness();
  const queryClient = useQueryClient();
  const [view, setView] = useState('kanban');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedJob, setSelectedJob] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Job.filter({ created_by: user.email }, '-created_date');
    },
  });

  const createJob = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setAddOpen(false);
      toast.success('Cliente agregado!');
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Job.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
    onError: (err) => toast.error(err.message || 'Error al actualizar estado'),
  });

  const filtered = useMemo(() => {
    return jobs.filter(j => {
      const q = search.toLowerCase();
      const matchSearch = !q || j.client_name?.toLowerCase().includes(q) || j.job_name?.toLowerCase().includes(q) || j.job_address?.toLowerCase().includes(q) || j.client_phone?.includes(q) || j.client_email?.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || j.status === filterStatus;
      const matchPriority = filterPriority === 'all' || j.priority === filterPriority;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [jobs, search, filterStatus, filterPriority]);

  // Stats
  const stats = useMemo(() => {
    const total = jobs.reduce((s, j) => s + (j.total_price || 0), 0);
    const paidTotal = jobs.filter(j => j.status === 'paid').reduce((s, j) => s + (j.total_price || 0), 0);
    const followUpDue = jobs.filter(j => j.follow_up_date && new Date(j.follow_up_date) <= new Date()).length;
    return { total, paidTotal, followUpDue, count: jobs.length };
  }, [jobs]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            CRM Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona clientes y trabajos como en Monday</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> {tr('newClient')}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatPill label={tr('totalClients')} value={stats.count} />
        <StatPill label={tr('pipelineTotal')} value={`$${stats.total.toLocaleString()}`} />
        <StatPill label={tr('collected')} value={`$${stats.paidTotal.toLocaleString()}`} green />
        <StatPill label={tr('followUpsDue')} value={stats.followUpDue} orange={stats.followUpDue > 0} icon={stats.followUpDue > 0 ? AlertCircle : null} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder={tr('searchPlaceholder')} className="pl-8 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
            <SelectItem value="estimate">Estimate</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Prioridad" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High 🔥</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="h-9">
            <TabsTrigger value="kanban" className="px-3"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
            <TabsTrigger value="list" className="px-3"><List className="h-4 w-4" /></TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Board / List */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
        {tr('noResults')} <button onClick={() => setAddOpen(true)} className="text-primary underline">{tr('addClient')}</button>.
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          jobs={filtered}
          onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
          onJobClick={setSelectedJob}
        />
      ) : (
        <ListView
          jobs={filtered}
          onJobClick={setSelectedJob}
          onStatusChange={(id, status) => updateStatus.mutate({ id, status })}
        />
      )}

      {/* Modals */}
      <AddJobModal open={addOpen} onClose={() => setAddOpen(false)} onSave={(data) => createJob.mutate(data)} isPending={createJob.isPending} />
      {selectedJob && (
        <JobModal job={selectedJob} open={!!selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

function StatPill({ label, value, green, orange, icon: IconComp }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${green ? 'border-green-200 bg-green-50' : orange ? 'border-orange-200 bg-orange-50' : 'bg-card border-border'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className={`font-heading font-bold text-xl flex items-center gap-1 mt-0.5 ${green ? 'text-green-700' : orange ? 'text-orange-600' : 'text-foreground'}`}>
        {IconComp && <IconComp className="h-4 w-4" />}
        {value}
      </div>
    </div>
  );
}