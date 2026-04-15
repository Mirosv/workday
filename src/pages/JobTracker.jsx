import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Plus, Trash2, ArrowRight, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

const today = new Date().toISOString().split('T')[0];

const statusConfig = {
  estimate: { label: 'Estimate', icon: Clock, className: 'bg-accent/20 text-accent-foreground border-accent/30' },
  in_progress: { label: 'In Progress', icon: ArrowRight, className: 'bg-primary/15 text-primary border-primary/25' },
  paid: { label: 'Paid', icon: CheckCircle2, className: 'bg-chart-2/15 text-chart-2 border-chart-2/25' },
};

export default function JobTracker() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ client_name: '', job_name: '', total_price: 0, status: 'estimate', date: today });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
  });

  const createJob = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setForm({ client_name: '', job_name: '', total_price: 0, status: 'estimate', date: today });
      toast.success('Job saved!');
    },
  });

  const updateJob = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Job.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['jobs'] }),
  });

  const deleteJob = useMutation({
    mutationFn: (id) => base44.entities.Job.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Job deleted');
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl md:text-3xl flex items-center gap-2">
          <Briefcase className="h-7 w-7 text-primary" />
          Simple Job Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Save estimates, active jobs, and paid jobs in one place.</p>
      </div>

      {/* Add job form */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Client Name</Label>
              <Input value={form.client_name} onChange={e => setForm({ ...form, client_name: e.target.value })} placeholder="John Smith" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Job Name</Label>
              <Input value={form.job_name} onChange={e => setForm({ ...form, job_name: e.target.value })} placeholder="Landscaping Job" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Total Price</Label>
              <Input type="number" value={form.total_price || ''} onChange={e => setForm({ ...form, total_price: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estimate">Estimate</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Keep this simple: Estimate = pending, In Progress = approved or active, Paid = done and collected.</p>
          <Button onClick={() => createJob.mutate(form)} disabled={createJob.isPending || !form.client_name || !form.job_name}>
            <Plus className="h-4 w-4 mr-1" /> Save Job
          </Button>
        </CardContent>
      </Card>

      {/* Saved jobs */}
      <div>
        <h2 className="font-heading font-semibold text-lg mb-3">Saved Jobs</h2>
        <p className="text-xs text-muted-foreground mb-4">Update status or delete when no longer needed.</p>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground text-sm">
              No jobs saved yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const cfg = statusConfig[job.status] || statusConfig.estimate;
              const Icon = cfg.icon;
              return (
                <Card key={job.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-sm truncate">{job.client_name}</h3>
                          <Badge variant="outline" className={cfg.className}>
                            <Icon className="h-3 w-3 mr-1" /> {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{job.job_name} • {job.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-lg">${(job.total_price || 0).toFixed(2)}</span>
                        <Select value={job.status} onValueChange={v => updateJob.mutate({ id: job.id, data: { status: v } })}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="estimate">Estimate</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteJob.mutate(job.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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