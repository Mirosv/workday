import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileText, Car, Landmark, Receipt, DollarSign, CheckCircle2, Loader2, ChevronDown, ChevronRight, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const IRS_MILEAGE_RATE = 0.67;
const currentYear = new Date().getFullYear();

const TAX_CATEGORY_LABELS = {
  advertising: 'Advertising',
  car_truck: 'Car & Truck (direct expenses)',
  commissions: 'Commissions & Fees',
  contract_labor: 'Contract Labor',
  depletion: 'Depletion',
  depreciation: 'Depreciation',
  employee_benefits: 'Employee Benefits',
  insurance: 'Insurance (other than health)',
  interest_mortgage: 'Interest – Mortgage',
  interest_other: 'Interest – Other',
  legal_professional: 'Legal & Professional Services',
  office_expense: 'Office Expense',
  pension_profit: 'Pension & Profit-Sharing',
  rent_machinery: 'Rent – Machinery/Equipment',
  rent_property: 'Rent – Property',
  repairs_maintenance: 'Repairs & Maintenance',
  supplies: 'Supplies',
  taxes_licenses: 'Taxes & Licenses',
  travel: 'Travel',
  meals: 'Meals (50% deductible)',
  utilities: 'Utilities',
  wages: 'Wages',
  other_expense: 'Other Expense',
  none: '— Uncategorized —',
};

const OWNER_TX_LABELS = {
  owner_contribution: 'Owner Contribution',
  owner_distribution: 'Owner Distribution',
  owner_loan_to_business: 'Loan to Business (from owner)',
  owner_loan_from_business: 'Loan from Business (to owner)',
  owner_payment_personal: 'Personal Expense Paid by LLC',
  owner_reimbursement: 'Owner Reimbursement',
  related_party_sale: 'Sale to Related Party',
  related_party_purchase: 'Purchase from Related Party',
  other: 'Other',
};

function inYear(dateStr, year) {
  if (!dateStr) return false;
  return dateStr.startsWith(String(year));
}

function fmt(n) {
  return (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(cell => {
    const s = String(cell ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Expandable category breakdown row ──────────────────────
function CategoryRow({ cat, amt, items, totalDeductions }) {
  const [open, setOpen] = useState(false);
  const pct = totalDeductions > 0 ? (amt / totalDeductions * 100).toFixed(1) : '0';
  const isMileage = cat === '__mileage__';
  const label = isMileage ? 'Mileage Deduction (Standard Rate)' : (TAX_CATEGORY_LABELS[cat] || cat);
  const isUncategorized = cat === 'none';

  return (
    <div className={`border-b last:border-0 ${isUncategorized ? 'bg-amber-50' : ''}`}>
      <button
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-muted/40 transition-colors text-left"
        onClick={() => !isMileage && setOpen(o => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isMileage && items.length > 0 ? (
            open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : <span className="w-3.5 shrink-0" />}
          <span className={`truncate ${isUncategorized ? 'text-amber-700 font-medium' : 'text-foreground'}`}>
            {isUncategorized && '⚠ '}{label}
          </span>
          <span className="text-xs text-muted-foreground ml-1 shrink-0">({pct}%)</span>
          {isMileage && <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded ml-1">from mileage log</span>}
        </div>
        <span className="font-semibold tabular-nums ml-3 shrink-0">${fmt(amt)}</span>
      </button>
      {open && items.length > 0 && (
        <div className="bg-muted/30 border-t divide-y divide-border/50">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-6 py-1.5 text-xs text-muted-foreground">
              <div className="flex gap-3 min-w-0">
                <span className="shrink-0 tabular-nums text-muted-foreground/60">{item.date}</span>
                <span className="truncate">{item.name}</span>
                {item.receipt_ref && <span className="text-muted-foreground/60 shrink-0">#{item.receipt_ref}</span>}
              </div>
              <span className="tabular-nums ml-3 shrink-0">${fmt(item.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Accountant Notes ────────────────────────────────────────
function AccountantNotes({ yearExpenses, yearMileage, yearOwnerTxs, yearIncome, totalMiles, mileageDeduction, scheduleC, totalIncome, totalDeductions }) {
  const notes = useMemo(() => {
    const list = [];

    // 1. Uncategorized expenses
    const uncat = yearExpenses.filter(e => !e.tax_category || e.tax_category === 'none');
    if (uncat.length > 0) {
      const amt = uncat.reduce((s, e) => s + (e.amount || 0), 0);
      list.push({
        type: 'warn',
        title: `${uncat.length} expense${uncat.length > 1 ? 's' : ''} not categorized`,
        detail: `$${fmt(amt)} are listed as "Other Expense" — ask client to classify before filing.`,
      });
    }

    // 2. Meals — remind 50% rule
    if (scheduleC['meals']) {
      list.push({
        type: 'info',
        title: 'Meals: only 50% is deductible',
        detail: `$${fmt(scheduleC['meals'])} logged → deductible portion: $${fmt(scheduleC['meals'] * 0.5)}. Verify client has receipts and business purpose documented.`,
      });
    }

    // 3. Vehicle — mileage vs actual
    const carDirectExpenses = scheduleC['car_truck'] || 0;
    if (totalMiles > 0 && carDirectExpenses > 0) {
      list.push({
        type: 'info',
        title: 'Vehicle: mileage method + direct expenses',
        detail: `Client logged ${totalMiles.toFixed(0)} mi ($${fmt(mileageDeduction)} deduction) AND has $${fmt(carDirectExpenses)} in direct car expenses (insurance, fuel, etc.). Verify: if using Standard Mileage Rate, fuel & depreciation are already included — only tolls/parking are separately deductible.`,
      });
    }

    // 4. Personal expenses in owner transactions
    const personal = yearOwnerTxs.filter(t => t.transaction_type === 'owner_payment_personal');
    if (personal.length > 0) {
      const amt = personal.reduce((s, t) => s + (t.amount || 0), 0);
      list.push({
        type: 'warn',
        title: `${personal.length} personal expense${personal.length > 1 ? 's' : ''} paid by LLC`,
        detail: `$${fmt(amt)} total. These may need to be reclassified as owner distributions — confirm with client which are partial business use.`,
      });
    }

    // 5. Missing receipts
    const noReceipt = yearExpenses.filter(e => !e.receipt_ref);
    if (noReceipt.length > 0) {
      const amt = noReceipt.reduce((s, e) => s + (e.amount || 0), 0);
      list.push({
        type: 'warn',
        title: `${noReceipt.length} expenses missing receipt reference`,
        detail: `$${fmt(amt)} in expenses have no receipt/invoice number. IRS requires substantiation for all business deductions.`,
      });
    }

    // 6. Contract labor > $600 — 1099-NEC reminder
    const contractLaborTotal = scheduleC['contract_labor'] || 0;
    if (contractLaborTotal >= 600) {
      list.push({
        type: 'info',
        title: '1099-NEC may be required',
        detail: `$${fmt(contractLaborTotal)} in contract labor. If any single contractor received $600+, a 1099-NEC must be filed by Jan 31.`,
      });
    }

    // 7. Owner loans
    const loans = yearOwnerTxs.filter(t => t.transaction_type === 'owner_loan_to_business' || t.transaction_type === 'owner_loan_from_business');
    if (loans.length > 0) {
      const amt = loans.reduce((s, t) => s + (t.amount || 0), 0);
      list.push({
        type: 'info',
        title: 'Owner loan(s) require documentation',
        detail: `$${fmt(amt)} in owner loans. Ensure a signed promissory note exists and interest is calculated at AFR to avoid reclassification as capital.`,
      });
    }

    // 8. High profit margin tip
    const margin = totalIncome > 0 ? ((totalIncome - totalDeductions) / totalIncome) * 100 : 0;
    if (margin > 60 && totalIncome > 10000) {
      list.push({
        type: 'info',
        title: `High net margin (${margin.toFixed(0)}%) — consider S-Corp election`,
        detail: `At this profit level, electing S-Corp status could save self-employment taxes. Discuss with client for next tax year.`,
      });
    }

    // 9. No mileage logged
    if (totalMiles === 0 && yearExpenses.some(e => e.tax_category === 'car_truck')) {
      list.push({
        type: 'warn',
        title: 'Car expenses without mileage log',
        detail: 'Client has vehicle expenses but no mileage log entries. IRS requires a contemporaneous mileage log to substantiate car deductions.',
      });
    }

    return list;
  }, [yearExpenses, yearMileage, yearOwnerTxs, scheduleC, totalMiles, mileageDeduction, totalIncome, totalDeductions]);

  if (notes.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Accountant Notes — {notes.length} item{notes.length > 1 ? 's' : ''} to review
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {notes.map((n, i) => (
          <div key={i} className={`flex gap-2.5 rounded-lg p-3 text-sm ${n.type === 'warn' ? 'bg-amber-50 border border-amber-200' : 'bg-blue-50 border border-blue-100'}`}>
            <div className="shrink-0 mt-0.5">
              {n.type === 'warn'
                ? <AlertTriangle className="h-4 w-4 text-amber-600" />
                : <Info className="h-4 w-4 text-blue-500" />}
            </div>
            <div>
              <p className={`font-medium ${n.type === 'warn' ? 'text-amber-800' : 'text-blue-800'}`}>{n.title}</p>
              <p className={`text-xs mt-0.5 ${n.type === 'warn' ? 'text-amber-700' : 'text-blue-700'}`}>{n.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function TaxExport() {
  const [year, setYear] = useState(String(currentYear));

  const { data: expenses = [], isLoading: l1 } = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Expense.filter({ created_by: user.email }, '-date', 2000);
    },
  });

  const { data: mileageLogs = [], isLoading: l2 } = useQuery({
    queryKey: ['mileage-logs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.MileageLog.filter({ created_by: user.email }, '-date', 2000);
    },
  });

  const { data: ownerTxs = [], isLoading: l3 } = useQuery({
    queryKey: ['owner-transactions'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.OwnerTransaction.filter({ created_by: user.email }, '-date', 2000);
    },
  });

  const { data: jobs = [], isLoading: l4 } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Job.filter({ created_by: user.email }, '-date', 2000);
    },
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['business-settings-export'],
    queryFn: async () => {
      const user = await base44.auth.me();
      const list = await base44.entities.BusinessSettings.filter({ owner_email: user.email });
      return list[0] || {};
    },
  });

  const isLoading = l1 || l2 || l3 || l4;

  const yearExpenses = useMemo(() => expenses.filter(e => inYear(e.date, year)), [expenses, year]);
  const yearMileage  = useMemo(() => mileageLogs.filter(m => inYear(m.date, year)), [mileageLogs, year]);
  const yearOwnerTxs = useMemo(() => ownerTxs.filter(t => String(t.tax_year || new Date(t.date).getFullYear()) === year), [ownerTxs, year]);
  const yearIncome   = useMemo(() => jobs.filter(j => j.status === 'paid' && inYear(j.date, year)), [jobs, year]);

  const totalIncome   = useMemo(() => yearIncome.reduce((s, j) => s + (j.grand_total || j.total_price || 0), 0), [yearIncome]);
  const totalExpenses = useMemo(() => yearExpenses.reduce((s, e) => s + (e.amount || 0), 0), [yearExpenses]);
  const totalMiles    = useMemo(() => yearMileage.reduce((s, m) => s + (m.business_miles || 0), 0), [yearMileage]);
  const mileageDeduction = totalMiles * IRS_MILEAGE_RATE;

  // FIX: Schedule C keeps car_truck from expenses (direct costs) SEPARATE from mileage.
  // They are shown as two distinct line items so the accountant can verify the method used.
  const scheduleC = useMemo(() => {
    const map = {};
    yearExpenses.forEach(e => {
      const cat = e.tax_category && e.tax_category !== 'none' ? e.tax_category : 'none';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    // Mileage gets its OWN separate line — NOT merged into car_truck
    if (totalMiles > 0) {
      map['__mileage__'] = mileageDeduction;
    }
    return map;
  }, [yearExpenses, mileageDeduction, totalMiles]);

  // Items grouped by tax category for breakdown
  const categoryItems = useMemo(() => {
    const map = {};
    yearExpenses.forEach(e => {
      const cat = e.tax_category && e.tax_category !== 'none' ? e.tax_category : 'none';
      if (!map[cat]) map[cat] = [];
      map[cat].push({ date: e.date, name: e.name, amount: e.amount, receipt_ref: e.receipt_ref });
    });
    return map;
  }, [yearExpenses]);

  const totalDeductions = Object.values(scheduleC).reduce((s, v) => s + v, 0);
  const netProfit = totalIncome - totalDeductions;

  const years = useMemo(() => {
    const set = new Set([String(currentYear), String(currentYear - 1)]);
    expenses.forEach(e => e.date && set.add(e.date.substring(0, 4)));
    ownerTxs.forEach(t => set.add(String(t.tax_year || new Date(t.date).getFullYear())));
    return Array.from(set).sort((a, b) => b - a);
  }, [expenses, ownerTxs]);

  // ── CSV Exports ──────────────────────────────────────────

  const exportExpensesCSV = () => {
    const header = ['Date', 'Description', 'Category', 'Tax Category (Schedule C)', 'Amount', 'Payment Method', 'Receipt Ref', 'Job'];
    const rows = yearExpenses.map(e => [
      e.date, e.name, e.category || '',
      TAX_CATEGORY_LABELS[e.tax_category] || '— Uncategorized —',
      (e.amount || 0).toFixed(2),
      e.payment_method || '', e.receipt_ref || '', e.job_name || '',
    ]);
    downloadCSV(`expenses-${year}.csv`, [header, ...rows]);
    toast.success(`Expenses CSV exported (${rows.length} records)`);
  };

  const exportMileageCSV = () => {
    const header = ['Date', 'Description', 'From', 'To', 'Vehicle', 'Odometer Start', 'Odometer End', 'Business Miles', `IRS Deduction ($${IRS_MILEAGE_RATE}/mi)`, 'Job'];
    const rows = yearMileage.map(m => [
      m.date, m.description, m.from_location || '', m.to_location || '',
      m.vehicle || '', m.odometer_start || 0, m.odometer_end || 0,
      (m.business_miles || 0).toFixed(1),
      ((m.business_miles || 0) * IRS_MILEAGE_RATE).toFixed(2),
      m.job_name || '',
    ]);
    const totalRow = ['TOTAL', '', '', '', '', '', '', totalMiles.toFixed(1), mileageDeduction.toFixed(2), ''];
    downloadCSV(`mileage-${year}.csv`, [header, ...rows, totalRow]);
    toast.success(`Mileage CSV exported (${rows.length} trips)`);
  };

  const exportOwnerTxCSV = () => {
    const header = ['Date', 'Tax Year', 'Transaction Type', 'Amount', 'Description', 'Counterparty', 'Country', 'Payment Method', 'Reference #', 'Account'];
    const rows = yearOwnerTxs.map(t => [
      t.date, t.tax_year || year,
      OWNER_TX_LABELS[t.transaction_type] || t.transaction_type,
      (t.amount || 0).toFixed(2),
      t.description, t.counterparty_name || '', t.counterparty_country || '',
      t.payment_method || '', t.reference_number || '', t.account || '',
    ]);
    downloadCSV(`owner-transactions-${year}.csv`, [header, ...rows]);
    toast.success(`Form 5472 CSV exported (${rows.length} records)`);
  };

  const exportIncomeCSV = () => {
    const header = ['Date', 'Invoice #', 'Client', 'Job Name', 'Total Price', 'Grand Total', 'Status', 'Address'];
    const rows = yearIncome.map(j => [
      j.date || '', j.invoice_number || '',
      j.client_name, j.job_name,
      (j.total_price || 0).toFixed(2),
      (j.grand_total || j.total_price || 0).toFixed(2),
      j.status, j.job_address || '',
    ]);
    downloadCSV(`income-${year}.csv`, [header, ...rows]);
    toast.success(`Income CSV exported (${rows.length} jobs)`);
  };

  const exportScheduleCCSV = () => {
    const header = ['Schedule C Line', 'Category', 'Amount', 'Note'];
    const rows = Object.entries(scheduleC)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => [
        'Part II',
        cat === '__mileage__' ? 'Mileage Deduction (Standard Rate)' : (TAX_CATEGORY_LABELS[cat] || cat),
        amt.toFixed(2),
        cat === 'meals' ? '50% rule applies' : cat === '__mileage__' ? `${totalMiles.toFixed(0)} mi × $${IRS_MILEAGE_RATE}` : '',
      ]);
    rows.push(['', 'TOTAL DEDUCTIONS', totalDeductions.toFixed(2), '']);
    rows.push(['Part I', 'Gross Income', totalIncome.toFixed(2), '']);
    rows.push(['', 'NET PROFIT / LOSS', netProfit.toFixed(2), '']);
    downloadCSV(`schedule-c-summary-${year}.csv`, [header, ...rows]);
    toast.success('Schedule C summary exported!');
  };

  // ── PDF Export ───────────────────────────────────────────

  const exportPDF = () => {
    const doc = new jsPDF();
    const biz = settings.business_name || 'My Business';
    let y = 20;

    const line = (text, x = 14, bold = false, size = 10) => {
      doc.setFontSize(bold ? size + 1 : size);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, x, y);
      y += bold ? 7 : 6;
    };
    const divider = () => {
      doc.setDrawColor(180); doc.line(14, y, 196, y); y += 4;
    };
    const checkPage = () => { if (y > 270) { doc.addPage(); y = 20; } };
    const rightVal = (val, yOverride) => {
      doc.text(val, 185, yOverride || y, { align: 'right' });
    };

    // Title
    doc.setFontSize(16); doc.setFont('helvetica', 'bold');
    doc.text(biz, 14, y); y += 8;
    doc.setFontSize(13);
    doc.text(`Tax Summary — ${year}`, 14, y); y += 7;
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  ·  For accountant use only`, 14, y);
    y += 10; divider();

    // Schedule C
    line('SCHEDULE C — PROFIT OR LOSS FROM BUSINESS', 14, true, 11);
    y += 1;
    line('Part I — Gross Income', 14, true);
    const yIncome = y;
    line(`  Gross receipts / sales (paid jobs)`, 14);
    rightVal(`$${fmt(totalIncome)}`, yIncome);
    y += 3;
    line('Part II — Deductions', 14, true);

    Object.entries(scheduleC).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
      checkPage();
      const label = cat === '__mileage__'
        ? `  Mileage Deduction (${totalMiles.toFixed(0)} mi × $${IRS_MILEAGE_RATE})`
        : `  ${TAX_CATEGORY_LABELS[cat] || cat}`;
      const note = cat === 'meals' ? '  [50% rule — verify]' : cat === '__mileage__' ? '  [Standard Rate]' : '';
      doc.setFontSize(10); doc.setFont('helvetica', 'normal');
      doc.text(label + note, 14, y);
      doc.text(`$${fmt(amt)}`, 185, y, { align: 'right' });
      y += 6; checkPage();
    });

    divider();
    doc.setFontSize(10); doc.setFont('helvetica', 'bold');
    doc.text('  Total Deductions', 14, y);
    doc.text(`$${fmt(totalDeductions)}`, 185, y, { align: 'right' }); y += 7;
    doc.text(`  Net Profit / (Loss)`, 14, y);
    doc.text(`$${fmt(netProfit)}`, 185, y, { align: 'right' }); y += 10;
    divider();

    // Mileage detail
    checkPage();
    line('VEHICLE MILEAGE LOG SUMMARY', 14, true);
    line(`  IRS Standard Mileage Rate ${year}: $${IRS_MILEAGE_RATE}/mile`);
    line(`  Total business miles: ${totalMiles.toFixed(1)} mi`);
    line(`  Mileage deduction: $${fmt(mileageDeduction)}`);
    line(`  Trips on file: ${yearMileage.length}`);
    if (scheduleC['car_truck']) {
      y += 2;
      doc.setFontSize(9); doc.setFont('helvetica', 'italic');
      doc.text(`  NOTE: Client also has $${fmt(scheduleC['car_truck'])} in direct car/truck expenses.`, 14, y);
      y += 4;
      doc.text(`  Confirm with client which vehicle method (standard vs actual) applies.`, 14, y); y += 6;
    }
    y += 2; divider();

    // Owner Transactions
    checkPage();
    line('OWNER TRANSACTIONS — FORM 5472', 14, true);
    if (yearOwnerTxs.length === 0) {
      line('  No transactions recorded for this year.');
    } else {
      const byType = {};
      yearOwnerTxs.forEach(t => { byType[t.transaction_type] = (byType[t.transaction_type] || 0) + (t.amount || 0); });
      Object.entries(byType).forEach(([type, amt]) => {
        checkPage();
        doc.setFontSize(10); doc.setFont('helvetica', 'normal');
        doc.text(`  ${OWNER_TX_LABELS[type] || type}`, 14, y);
        doc.text(`$${fmt(amt)}`, 185, y, { align: 'right' }); y += 6;
      });
      const personalTxs = yearOwnerTxs.filter(t => t.transaction_type === 'owner_payment_personal');
      if (personalTxs.length > 0) {
        y += 2; doc.setFontSize(8); doc.setFont('helvetica', 'italic');
        doc.text(`  ⚠ ${personalTxs.length} personal expense(s) paid by LLC — verify deductibility.`, 14, y); y += 5;
      }
    }
    y += 3; divider();

    // Income
    checkPage();
    line(`INCOME DETAIL — Paid Jobs (${year})`, 14, true);
    yearIncome.slice(0, 15).forEach(j => {
      checkPage();
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text(`  ${j.date || ''}  ${(j.client_name + ' — ' + j.job_name).substring(0, 60)}`, 14, y);
      doc.text(`$${fmt(j.grand_total || j.total_price || 0)}`, 185, y, { align: 'right' }); y += 5.5;
    });
    if (yearIncome.length > 15) {
      doc.setFontSize(8); doc.setFont('helvetica', 'italic');
      doc.text(`  ... and ${yearIncome.length - 15} more jobs. See income CSV.`, 14, y); y += 6;
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
      doc.text(`${biz} · Tax Summary ${year} · Page ${i} of ${pageCount} · Generated by ContractorApp`, 14, 290);
      doc.setTextColor(0);
    }

    doc.save(`tax-summary-${year}.pdf`);
    toast.success('PDF exported! Ready for your accountant.');
  };

  const SectionCard = ({ icon: Icon, title, count, total, onExportCSV, color = 'text-primary' }) => (
    <Card>
      <CardContent className="p-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{count} records · {total}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onExportCSV} className="gap-1.5 shrink-0">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> Tax Export
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Schedule C · Form 5472 · Mileage · Income — ready for your accountant</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Tax Year</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          {/* Schedule C Summary */}
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4 text-primary" /> Schedule C Summary — {year}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Gross Income</p>
                  <p className="font-heading font-bold text-lg text-emerald-700">${fmt(totalIncome)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Total Deductions</p>
                  <p className="font-heading font-bold text-lg text-red-600">${fmt(totalDeductions)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Net Profit / (Loss)</p>
                  <p className={`font-heading font-bold text-lg ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    ${fmt(netProfit)}
                  </p>
                </div>
              </div>

              {/* Expandable breakdown */}
              {Object.keys(scheduleC).length > 0 && (
                <div className="rounded-lg border bg-white overflow-hidden">
                  <div className="px-3 py-1.5 bg-muted/50 border-b flex justify-between text-xs font-medium text-muted-foreground">
                    <span>Category (click to expand)</span>
                    <span>Amount</span>
                  </div>
                  {Object.entries(scheduleC)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt]) => (
                      <CategoryRow
                        key={cat}
                        cat={cat}
                        amt={amt}
                        items={categoryItems[cat] || []}
                        totalDeductions={totalDeductions}
                      />
                    ))}
                  <div className="flex items-center justify-between px-3 py-2.5 bg-muted/30 font-semibold text-sm border-t">
                    <span>Total Deductions</span>
                    <span>${fmt(totalDeductions)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Accountant Notes */}
          <AccountantNotes
            yearExpenses={yearExpenses}
            yearMileage={yearMileage}
            yearOwnerTxs={yearOwnerTxs}
            yearIncome={yearIncome}
            totalMiles={totalMiles}
            mileageDeduction={mileageDeduction}
            scheduleC={scheduleC}
            totalIncome={totalIncome}
            totalDeductions={totalDeductions}
          />

          {/* Individual CSV exports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SectionCard icon={Receipt} title="Expenses (Schedule C)" count={yearExpenses.length}
              total={`$${fmt(totalExpenses)} total`} onExportCSV={exportExpensesCSV} />
            <SectionCard icon={Car} title="Mileage Log" count={yearMileage.length}
              total={`${totalMiles.toFixed(1)} mi · $${fmt(mileageDeduction)} deduction`} onExportCSV={exportMileageCSV} />
            <SectionCard icon={Landmark} title="Owner Transactions (Form 5472)" count={yearOwnerTxs.length}
              total={`${yearOwnerTxs.length} reportable transactions`} onExportCSV={exportOwnerTxCSV} />
            <SectionCard icon={DollarSign} title="Income / Paid Jobs" count={yearIncome.length}
              total={`$${fmt(totalIncome)} gross`} onExportCSV={exportIncomeCSV} color="text-emerald-600" />
          </div>

          {/* Export all buttons */}
          <div className="flex flex-wrap gap-3">
            <Button onClick={exportScheduleCCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" /> Schedule C Summary CSV
            </Button>
            <Button onClick={exportPDF} className="gap-2">
              <FileText className="h-4 w-4" /> Export Full PDF for Accountant
            </Button>
          </div>

          {/* Checklist */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> Tax Prep Checklist — {year}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Income logged (paid jobs)', done: yearIncome.length > 0 },
                  { label: 'All expenses have Schedule C tax category', done: yearExpenses.length > 0 && yearExpenses.every(e => e.tax_category && e.tax_category !== 'none') },
                  { label: 'Receipts / references recorded on all expenses', done: yearExpenses.length > 0 && yearExpenses.every(e => e.receipt_ref) },
                  { label: 'Mileage log maintained', done: yearMileage.length > 0 },
                  { label: 'Owner transactions recorded (Form 5472)', done: yearOwnerTxs.length > 0 },
                  { label: 'Payment methods recorded', done: yearExpenses.some(e => e.payment_method && e.payment_method !== 'other') },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-600'}`}>
                      {item.done ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-foreground' : 'text-amber-700'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}