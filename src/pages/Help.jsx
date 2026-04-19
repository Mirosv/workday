import React, { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Receipt, Calculator, Briefcase, DollarSign, CalendarDays, Clock, Car, Landmark, FolderDown, Settings, HelpCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const sections = [
  {
    id: 'quotes',
    icon: FileText,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    title: 'Cotizador (Quote Builder)',
    description: 'Crea presupuestos profesionales para tus clientes.',
    steps: [
      'Ve a **Cotizador** en el menú lateral.',
      'Llena los datos del cliente: nombre, teléfono, email y dirección del trabajo.',
      'Agrega los servicios que vas a ofrecer: nombre, unidad, cantidad y precio por unidad.',
      'Activa las opciones adicionales que apliquen: mano de obra, materiales, desgaste de equipo, viáticos, etc.',
      'Ajusta el porcentaje de overhead y ganancia según tu negocio.',
      'El total se calcula automáticamente. Usa el botón **Imprimir / Guardar PDF** para generar el documento.',
      'Opcionalmente guarda el trabajo en el CRM con el botón correspondiente.',
    ],
  },
  {
    id: 'invoices',
    icon: Receipt,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    title: 'Facturas (Invoice Builder)',
    description: 'Genera facturas formales a partir de trabajos existentes.',
    steps: [
      'Ve a **Facturas** en el menú lateral.',
      'Busca un trabajo existente con la barra de búsqueda o crea uno nuevo.',
      'Verifica los datos del cliente y los servicios incluidos.',
      'Asigna un número de factura único.',
      'Revisa el desglose de precios y el total final.',
      'Haz clic en **Imprimir / Guardar PDF** para descargar la factura.',
    ],
  },
  {
    id: 'material',
    icon: Calculator,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    title: 'Conversor de Materiales',
    description: 'Calcula cantidades de materiales para tus proyectos.',
    steps: [
      'Ve a **Conversor de Materiales** en el menú lateral.',
      'Selecciona el tipo de material que necesitas calcular.',
      'Ingresa las medidas del área o volumen del proyecto.',
      'El sistema calcula automáticamente la cantidad de material necesaria.',
      'Usa los resultados para incluirlos en tu cotización.',
    ],
  },
  {
    id: 'crm',
    icon: Briefcase,
    color: 'text-green-600',
    bg: 'bg-green-50',
    title: 'Pipeline CRM (Job Tracker)',
    description: 'Gestiona todos tus trabajos y clientes en un solo lugar.',
    steps: [
      'Ve a **CRM Pipeline** en el menú lateral.',
      'Agrega un nuevo trabajo con el botón **+ Nuevo Trabajo**.',
      'Llena los datos: cliente, nombre del trabajo, fecha, precio y estado.',
      'Los trabajos se organizan en columnas: Lead → Estimate → In Progress → Paid.',
      'Arrastra las tarjetas entre columnas para actualizar el estado.',
      'Haz clic en una tarjeta para ver detalles, agregar notas o marcar como pagado.',
      'Usa la vista de lista para filtrar y buscar trabajos específicos.',
    ],
  },
  {
    id: 'money',
    icon: DollarSign,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    title: 'Rastreador de Dinero (Money Tracker)',
    description: 'Registra ingresos y gastos de tu negocio.',
    steps: [
      'Ve a **Money Tracker** en el menú lateral.',
      'Para registrar un **ingreso**: llena el formulario de ingreso con monto, fecha y descripción.',
      'Para registrar un **gasto**: llena el formulario de gastos con nombre, monto, fecha y categoría.',
      'Vincula el gasto a un trabajo específico seleccionándolo en "Vincular a Proyecto".',
      'Asigna la categoría de impuesto (Schedule C) para facilitar tu declaración.',
      'Agrega el método de pago y número de recibo para documentación del IRS.',
      'Para **editar** un gasto existente, haz clic en el ícono de lápiz en el historial.',
      'Los totales de ingresos, gastos y balance se actualizan automáticamente.',
    ],
  },
  {
    id: 'booking',
    icon: CalendarDays,
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
    title: 'Reservaciones (Booking)',
    description: 'Gestiona citas y disponibilidad para tus clientes.',
    steps: [
      'Ve a **Booking** en el menú lateral.',
      'Crea horarios disponibles indicando fecha, hora y capacidad máxima.',
      'Comparte el link público de reservaciones con tus clientes.',
      'Los clientes pueden reservar desde el link sin necesidad de crear una cuenta.',
      'Confirma o cancela reservaciones desde el panel de administración.',
      'Revisa el historial de todas las citas en la lista de reservaciones.',
    ],
  },
  {
    id: 'clockshark',
    icon: Clock,
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    title: 'Control de Tiempo (TimeTrack)',
    description: 'Registra horas trabajadas de empleados con geolocalización.',
    steps: [
      'Ve a **TimeTrack** en el menú lateral.',
      '**Empleados**: usa el botón **Clock In** para registrar entrada y **Clock Out** para salida.',
      'El sistema captura automáticamente la ubicación GPS al hacer clock in/out.',
      '**Administradores**: ve a la pestaña **Empleados** para gestionar el equipo.',
      'Agrega empleados con su nombre, tarifa por hora y configuración de lunch.',
      'En **Timesheet** puedes ver y editar registros de tiempo de todos los empleados.',
      'En **Live Tracker** ves quién está trabajando en este momento.',
      'Los empleados pueden solicitar días libres desde la pestaña **Time Off**.',
    ],
  },
  {
    id: 'mileage',
    icon: Car,
    color: 'text-red-600',
    bg: 'bg-red-50',
    title: 'Registro de Millas (Mileage Log)',
    description: 'Lleva un registro de viajes de negocio para deducciones del IRS.',
    steps: [
      'Ve a **Mileage Log** en el menú lateral.',
      'Agrega un nuevo viaje con el formulario: fecha, descripción del propósito comercial.',
      'Ingresa la ubicación de origen y destino.',
      'Indica las millas del odómetro al inicio y al final, o ingresa las millas directamente.',
      'El sistema calcula automáticamente la deducción basada en la tasa IRS del año.',
      'Vincula el viaje a un trabajo específico si aplica.',
      'Exporta el registro a CSV para tu contador con el botón **Export CSV**.',
    ],
  },
  {
    id: 'owner',
    icon: Landmark,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    title: 'Transacciones del Dueño (Owner Transactions)',
    description: 'Registra transacciones reportables para el Formulario 5472 del IRS.',
    steps: [
      'Ve a **Owner Transactions** en el menú lateral.',
      'Este módulo es para negocios con dueños extranjeros que requieren reportar al IRS.',
      'Agrega cada transacción: tipo, monto, descripción y método de pago.',
      'Indica el nombre y país de la parte relacionada (dueño, accionista, etc.).',
      'Asigna el año fiscal correspondiente a cada transacción.',
      'Exporta el reporte anual a CSV para tu contador con **Export CSV**.',
    ],
  },
  {
    id: 'tax',
    icon: FolderDown,
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    title: 'Exportación de Impuestos (Tax Export)',
    description: 'Genera reportes anuales para preparar tu declaración de impuestos.',
    steps: [
      'Ve a **Tax Export** en el menú lateral.',
      'Selecciona el año fiscal que deseas reportar.',
      'Revisa el resumen de ingresos totales, gastos deducibles y millas.',
      'Verifica el desglose de gastos por categoría Schedule C.',
      'Lee las notas automáticas que identifican posibles problemas (recibos faltantes, etc.).',
      'Exporta cada sección a CSV: gastos, millas, transacciones de dueño.',
      'Comparte los archivos con tu contador para preparar el Schedule C.',
    ],
  },
  {
    id: 'settings',
    icon: Settings,
    color: 'text-slate-600',
    bg: 'bg-slate-50',
    title: 'Configuración del Negocio',
    description: 'Personaliza la información y preferencias de tu empresa.',
    steps: [
      'Ve a **Configuración** en el menú lateral.',
      'Sube el logo de tu empresa haciendo clic en el área de logo.',
      'Llena el nombre, teléfono y dirección de tu negocio.',
      'Configura las tarifas predeterminadas: mano de obra, overhead y ganancia.',
      'Selecciona el idioma de la aplicación (Inglés o Español).',
      'Guarda los cambios con el botón **Guardar Cambios**.',
      'Para cambiar tu plan de suscripción, ve a la sección **Plan** en la misma página.',
    ],
  },
];

function StepText({ text }) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <span>
      {parts.map((part, i) =>
        i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
      )}
    </span>
  );
}

function HelpSection({ section }) {
  const [open, setOpen] = useState(false);
  const Icon = section.icon;

  return (
    <Card className="overflow-hidden">
      <button
        className="w-full text-left"
        onClick={() => setOpen(!open)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl ${section.bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${section.color}`} />
              </div>
              <div>
                <CardTitle className="text-base">{section.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
              </div>
            </div>
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
          </div>
        </CardHeader>
      </button>

      {open && (
        <CardContent className="pt-0 pb-5">
          <div className="border-t pt-4 space-y-2">
            {section.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className={`h-5 w-5 rounded-full ${section.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <span className={`text-xs font-bold ${section.color}`}>{i + 1}</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <StepText text={step} />
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Help() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <HelpCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">Centro de Ayuda</h1>
          <p className="text-sm text-muted-foreground">Guías paso a paso para usar cada módulo de la aplicación</p>
        </div>
      </div>

      {/* Quick tip */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">
          Haz clic en cualquier sección para expandir las instrucciones paso a paso. Empieza por <strong>Configuración</strong> para personalizar tu negocio antes de usar las demás herramientas.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map(section => (
          <HelpSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}