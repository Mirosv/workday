import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function DocumentClientView({ data, services, totals, docType = 'QUOTE' }) {
  return (
    <Card className="print:shadow-none">
      <CardContent className="p-6 md:p-10 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-heading font-bold text-2xl text-primary">{data.business_name}</h2>
            <p className="text-sm text-muted-foreground">{data.business_phone} • {data.business_address}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{docType}</span>
            <p className="font-heading font-bold text-lg">{data.invoice_number}</p>
            <p className="text-sm text-muted-foreground">{data.date}</p>
          </div>
        </div>

        <Separator />

        {/* Client info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Cliente</p>
            <p className="font-medium">{data.client_name || '—'}</p>
            {data.client_phone && <p className="text-muted-foreground">{data.client_phone}</p>}
            {data.client_email && <p className="text-muted-foreground">{data.client_email}</p>}
          </div>
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Dirección del trabajo</p>
            <p className="font-medium">{data.job_address || '—'}</p>
            {data.job_name && <p className="text-muted-foreground text-xs">{data.job_name}</p>}
          </div>
        </div>

        {data.notes && (
          <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground">{data.notes}</div>
        )}

        {/* Services table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left py-2">Servicio</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 font-medium">{svc.name}</td>
                  <td className="text-right py-2 font-medium">${(svc.line_total || 0).toFixed(2)}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr><td colSpan={2} className="text-center text-muted-foreground py-4 text-xs">Sin servicios</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <Separator />

        {/* Total only */}
        <div className="flex justify-end">
          <div className="w-64 text-sm">
            <div className="flex justify-between font-heading font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">${totals.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}