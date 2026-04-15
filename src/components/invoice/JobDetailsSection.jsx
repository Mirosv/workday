import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Phone, MapPin, User, FileText, Calendar } from 'lucide-react';

export default function JobDetailsSection({ data, onChange }) {
  const update = (field, value) => onChange({ ...data, [field]: value });

  return (
    <div className="space-y-4">
      <h2 className="font-heading font-bold text-lg text-foreground">Job Details & Services</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Building2 className="h-3 w-3" /> Business name
          </Label>
          <Input value={data.business_name} onChange={e => update('business_name', e.target.value)} placeholder="COREPROTECH" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Phone className="h-3 w-3" /> Business phone
          </Label>
          <Input value={data.business_phone} onChange={e => update('business_phone', e.target.value)} placeholder="3093151754" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Business address
          </Label>
          <Input value={data.business_address} onChange={e => update('business_address', e.target.value)} placeholder="61753" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <User className="h-3 w-3" /> Customer name
          </Label>
          <Input value={data.client_name} onChange={e => update('client_name', e.target.value)} placeholder="Customer name" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> Job address
          </Label>
          <Input value={data.job_address} onChange={e => update('job_address', e.target.value)} placeholder="Job address" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Invoice / Quote #
          </Label>
          <Input value={data.invoice_number} onChange={e => update('invoice_number', e.target.value)} placeholder="QT-0001" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> Date
          </Label>
          <Input type="date" value={data.date} onChange={e => update('date', e.target.value)} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
        <Textarea value={data.notes} onChange={e => update('notes', e.target.value)} placeholder="Optional notes (scope, timeline, warranty, etc.)" rows={2} />
      </div>
    </div>
  );
}