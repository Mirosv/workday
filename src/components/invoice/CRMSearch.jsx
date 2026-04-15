import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, User, MapPin, Mail } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function CRMSearch({ jobs, onSelect, linkedJob }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return jobs.slice(0, 8);
    const q = query.toLowerCase();
    return jobs.filter(j =>
      j.client_name?.toLowerCase().includes(q) ||
      j.client_email?.toLowerCase().includes(q) ||
      j.job_address?.toLowerCase().includes(q) ||
      j.job_name?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [jobs, query]);

  const handleSelect = (job) => {
    onSelect(job);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onSelect(null);
    setQuery('');
  };

  if (linkedJob) {
    return (
      <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
        <User className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{linkedJob.client_name}</p>
          {linkedJob.job_name && <p className="text-xs text-muted-foreground truncate">{linkedJob.job_name}</p>}
        </div>
        <button onClick={handleClear} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        className="pl-9"
        placeholder="Buscar cliente por nombre, email o dirección..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {results.map(job => (
            <button
              key={job.id}
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-0"
              onClick={() => handleSelect(job)}
            >
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-medium text-sm">{job.client_name}</span>
                {job.status && (
                  <span className="text-xs text-muted-foreground ml-auto capitalize">{job.status}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5 pl-5">
                {job.job_name && <span className="text-xs text-muted-foreground truncate">{job.job_name}</span>}
                {job.client_email && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Mail className="h-2.5 w-2.5" />{job.client_email}
                  </span>
                )}
                {job.job_address && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <MapPin className="h-2.5 w-2.5" />{job.job_address?.slice(0, 20)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}