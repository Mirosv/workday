import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Star, Crown, Check } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'free',
    label: 'Free',
    price: '$0',
    period: '',
    icon: Zap,
    color: 'text-muted-foreground',
    border: '',
    features: [
      '5 cotizaciones / mes',
      '3 facturas / mes',
      '10 trabajos en CRM',
      'Rastreador básico de gastos',
      'Convertidor de materiales',
    ],
    missing: ['Página de reservas', 'Logo personalizado', 'Reportes de ingresos'],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$25',
    period: '/mes',
    icon: Star,
    color: 'text-blue-600',
    border: 'border-blue-300 shadow-blue-100 shadow-md',
    features: [
      'Cotizaciones ilimitadas',
      'Facturas ilimitadas',
      'CRM sin límite',
      'Gastos + vinculación a proyectos',
      'Página de reservas',
      'Logo y marca personalizada',
      'Reportes básicos de ingresos',
    ],
    missing: [],
    recommended: true,
  },
  {
    key: 'premium',
    label: 'Premium',
    price: '$50',
    period: '/mes',
    icon: Crown,
    color: 'text-amber-600',
    border: 'border-amber-300 shadow-amber-100 shadow-md',
    features: [
      'Todo lo de Pro',
      'Exportación PDF de facturas',
      'Dashboard KPI completo',
      'Historial completo de gastos',
      'Booking con URL personalizada',
      'Soporte prioritario',
    ],
    missing: [],
  },
];

export default function PlanSelector({ currentPlan = 'free', onPlanChanged }) {
  const [loading, setLoading] = useState(null);

  const handleUpgrade = async (planKey) => {
    if (planKey === 'free') return;
    setLoading(planKey);
    try {
      const res = await base44.functions.invoke('createCheckoutSession', {
        plan: planKey,
        success_url: `${window.location.origin}/settings?plan_success=1`,
        cancel_url: `${window.location.origin}/settings`,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error('No se pudo iniciar el pago. Intenta de nuevo.');
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Error al conectar con Stripe';
      toast.error(msg);
    }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading font-bold text-lg">Plan actual</h2>
        <p className="text-sm text-muted-foreground">Elige el plan que mejor se adapte a tu negocio.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.key;
          return (
            <Card key={plan.key} className={`relative ${plan.border} ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white text-xs px-3">Recomendado</Badge>
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 right-3">
                  <Badge className="bg-primary text-white text-xs px-3">Tu plan</Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={`h-5 w-5 ${plan.color}`} />
                  {plan.label}
                </CardTitle>
                <div className="flex items-end gap-0.5">
                  <span className={`text-3xl font-heading font-bold ${plan.color}`}>{plan.price}</span>
                  <span className="text-sm text-muted-foreground pb-0.5">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <ul className="space-y-1.5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                  {plan.missing.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                      <span className="h-4 w-4 shrink-0 text-center">✗</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">Plan actual</Button>
                ) : plan.key === 'free' ? (
                  <Button disabled className="w-full" variant="ghost">Gratis</Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={!!loading}
                    variant={plan.key === 'premium' ? 'default' : 'outline'}
                  >
                    {loading === plan.key ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Suscribirse — {plan.price}{plan.period}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}