import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Zap, Star, Crown, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const PLANS = [
  {
    key: 'free',
    label: 'Starter',
    price: '$0',
    period: '',
    description: 'Perfecto para comenzar',
    icon: Zap,
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    headerBg: 'bg-slate-50',
    btnVariant: 'outline',
    features: [
      { text: '5 cotizaciones / mes', included: true },
      { text: '3 facturas / mes', included: true },
      { text: '10 trabajos en CRM', included: true },
      { text: 'Convertidor de materiales', included: true },
      { text: 'Rastreador de gastos básico', included: true },
      { text: 'Logo y marca personalizada', included: false },
      { text: 'Empleados y nómina', included: false },
      { text: 'Reportes financieros completos', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    key: 'pro',
    label: 'Pro',
    price: '$25',
    period: '/mes',
    description: 'Para negocios en crecimiento',
    icon: Star,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    headerBg: 'bg-blue-50',
    btnVariant: 'default',
    recommended: true,
    badge: 'Más popular',
    badgeBg: 'bg-blue-600',
    features: [
      { text: 'Cotizaciones ilimitadas', included: true },
      { text: 'Facturas ilimitadas', included: true },
      { text: 'CRM sin límite de trabajos', included: true },
      { text: 'Convertidor de materiales', included: true },
      { text: 'Rastreador de gastos + proyectos', included: true },
      { text: 'Logo y marca personalizada', included: true },
      { text: 'Empleados y nómina', included: false },
      { text: 'Reportes financieros completos', included: false },
      { text: 'Soporte prioritario', included: false },
    ],
  },
  {
    key: 'premium',
    label: 'Premium',
    price: '$50',
    period: '/mes',
    description: 'Control total de tu empresa',
    icon: Crown,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    headerBg: 'bg-gradient-to-br from-amber-50 to-orange-50',
    btnVariant: 'default',
    badge: 'Todo incluido',
    badgeBg: 'bg-amber-500',
    features: [
      { text: 'Todo lo de Pro', included: true },
      { text: 'Gestión de empleados', included: true },
      { text: 'Control de nómina / horas', included: true },
      { text: 'Reportes financieros completos', included: true },
      { text: 'Dashboard KPI avanzado', included: true },
      { text: 'Exportación PDF profesional', included: true },
      { text: 'Historial ilimitado', included: true },
      { text: 'Soporte prioritario 24/7', included: true },
    ],
  },
];

export default function PlanSelector({ currentPlan = 'free' }) {
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
    <div className="space-y-5">
      <div>
        <h2 className="font-heading font-bold text-xl">Elige tu plan</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Sin contratos. Cancela cuando quieras.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map(plan => {
          const Icon = plan.icon;
          const isCurrent = currentPlan === plan.key;

          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border flex flex-col overflow-hidden transition-shadow
                ${plan.recommended ? 'border-blue-400 shadow-lg shadow-blue-100' : ''}
                ${plan.key === 'premium' ? 'border-amber-300 shadow-lg shadow-amber-100' : ''}
                ${!plan.recommended && plan.key !== 'premium' ? 'border-border' : ''}
                ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
              `}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-3.5 right-3.5">
                  <span className={`text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-full ${plan.badgeBg}`}>
                    {plan.badge}
                  </span>
                </div>
              )}
              {isCurrent && (
                <div className="absolute top-3.5 left-3.5">
                  <span className="text-[11px] font-semibold text-white px-2.5 py-0.5 rounded-full bg-primary">
                    Tu plan actual
                  </span>
                </div>
              )}

              {/* Header */}
              <div className={`${plan.headerBg} px-5 pt-8 pb-5 border-b border-border/50`}>
                <div className={`inline-flex items-center justify-center h-10 w-10 rounded-xl ${plan.iconBg} mb-3`}>
                  <Icon className={`h-5 w-5 ${plan.iconColor}`} />
                </div>
                <h3 className="font-heading font-bold text-lg">{plan.label}</h3>
                <p className="text-xs text-muted-foreground mb-3">{plan.description}</p>
                <div className="flex items-end gap-1">
                  <span className="font-heading font-extrabold text-4xl leading-none">{plan.price}</span>
                  {plan.period && <span className="text-sm text-muted-foreground mb-0.5">{plan.period}</span>}
                </div>
              </div>

              {/* Features */}
              <div className="px-5 py-4 flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map(f => (
                    <li key={f.text} className={`flex items-center gap-2.5 text-sm ${f.included ? '' : 'text-muted-foreground'}`}>
                      {f.included
                        ? <Check className="h-4 w-4 text-green-500 shrink-0" />
                        : <X className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      }
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="px-5 pb-5">
                {isCurrent ? (
                  <Button disabled className="w-full" variant="outline">
                    Plan actual ✓
                  </Button>
                ) : plan.key === 'free' ? (
                  <Button disabled className="w-full" variant="ghost">
                    Gratis siempre
                  </Button>
                ) : (
                  <Button
                    className={`w-full font-semibold ${plan.key === 'premium' ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}`}
                    variant={plan.key === 'pro' ? 'default' : undefined}
                    onClick={() => handleUpgrade(plan.key)}
                    disabled={!!loading}
                  >
                    {loading === plan.key
                      ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      : null
                    }
                    Comenzar con {plan.label} — {plan.price}{plan.period}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        💳 Pago seguro con Stripe. Cancela en cualquier momento sin penalización.
      </p>
    </div>
  );
}