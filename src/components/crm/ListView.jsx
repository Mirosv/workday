import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Phone, Mail, MapPin } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'lead', label: 'Lead', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'estimate', label: 'Estimate', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'paid', label: 'Paid', color: 'bg-green-100 text-green-700 border-green-200' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-700 border-red-200' },
];

const PRIORITY_DOT = { low: 'bg-gray-400', medium: 'bg-orange-400', high: 'bg-red-500' };

export default function ListView({ jobs, onJobClick, onStatusChange }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <div className="col-span-3">Cliente</div>
        <div className="col-span-2">Trabajo</div>
        <div className="col-span-2">Contacto</div>
        <div className="col-span-1">Follow-up</div>
        <div className="col-span-2">Estado</div>
        <div className="col-span-1">Precio</div>
        <div className="col-span-1"></div>
      </div>

      {jobs.map(job => {
        const statusCfg = STATUS_OPTIONS.find(s => s.value === job.status) || STATUS_OPTIONS[0];
        const dot = PRIORITY_DOT[job.priority] || PRIORITY_DOT.medium;
        const isFollowUpDue = job.follow_up_date && new Date(job.follow_up_date) <= new Date();

        return (
          <div
            key={job.id}
            className="bg-card border border-border rounded-lg px-4 py-3 hover:shadow-sm transition-shadow cursor-pointer"
            onClick={() => onJobClick(job)}
          >
            {/* Mobile */}
            <div className="md:hidden space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${dot}`} />
                  <span className="font-medium text-sm">{job.client_name}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{job.job_name}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{job.client_phone || job.client_email || job.job_address || '—'}</span>
                <span className="font-heading font-bold text-sm text-primary">${(job.total_price || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Desktop */}
            <div className="hidden md:grid grid-cols-12 gap-2 items-center" onClick={e => e.stopPropagation()}>
              <div className="col-span-3 flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full shrink-0 ${dot}`} />
                <div>
                  <p className="font-medium text-sm">{job.client_name}</p>
                  <p className="text-xs text-muted-foreground">{job.date || '—'}</p>
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-sm truncate">{job.job_name}</p>
                {job.job_address && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{job.job_address}</p>}
              </div>
              <div className="col-span-2 text-xs text-muted-foreground space-y-0.5">
                {job.client_phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{job.client_phone}</div>}
                {job.client_email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" /><span className="truncate">{job.client_email}</span></div>}
                {!job.client_phone && !job.client_email && <span>—</span>}
              </div>
              <div className="col-span-1 text-xs">
                {job.follow_up_date ? (
                  <div className={`flex items-center gap-1 ${isFollowUpDue ? 'text-orange-500 font-medium' : 'text-muted-foreground'}`}>
                    {isFollowUpDue && <AlertCircle className="h-3 w-3" />}
                    {job.follow_up_date}
                  </div>
                ) : <span className="text-muted-foreground">—</span>}
              </div>
              <div className="col-span-2" onClick={e => e.stopPropagation()}>
                <Select value={job.status} onValueChange={v => onStatusChange(job.id, v)}>
                  <SelectTrigger className="h-7 text-xs w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-1 font-heading font-bold text-sm text-primary">
                ${(job.total_price || 0).toLocaleString()}
              </div>
              <div className="col-span-1 text-right">
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onJobClick(job)}>
                  Abrir
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}