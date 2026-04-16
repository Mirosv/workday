import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download, FileText, Car, Landmark, Receipt, DollarSign, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

const IRS_MILEAGE_RATE = 0.67;
const currentYear = new Date().getFullYear();

const TAX_CATEGORY_LABELS = {
  advertising: 'Advertising',
  car_truck: 'Car & Truck Expenses',
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
  none: '—',
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

  // Filtered by year
  const yearExpenses = useMemo(() => expenses.filter(e => inYear(e.date, year)), [expenses, year]);
  const yearMileage  = useMemo(() => mileageLogs.filter(m => inYear(m.date, year)), [mileageLogs, year]);
  const yearOwnerTxs = useMemo(() => ownerTxs.filter(t => String(t.tax_year || new Date(t.date).getFullYear()) === year), [ownerTxs, year]);
  const yearIncome   = useMemo(() => jobs.filter(j => j.status === 'paid' && inYear(j.date, year)), [jobs, year]);

  // Summary numbers
  const totalIncome     = useMemo(() => yearIncome.reduce((s, j) => s + (j.grand_total || j.total_price || 0), 0), [yearIncome]);
  const totalExpenses   = useMemo(() => yearExpenses.reduce((s, e) => s + (e.amount || 0), 0), [yearExpenses]);
  const totalMiles      = useMemo(() => yearMileage.reduce((s, m) => s + (m.business_miles || 0), 0), [yearMileage]);
  const mileageDeduction = totalMiles * IRS_MILEAGE_RATE;

  // Schedule C by tax category
  const scheduleC = useMemo(() => {
    const map = {};
    yearExpenses.forEach(e => {
      const cat = e.tax_category && e.tax_category !== 'none' ? e.tax_category : 'other_expense';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    });
    // Add mileage deduction to car_truck if any
    if (totalMiles > 0) {
      map['car_truck'] = (map['car_truck'] || 0) + mileageDeduction;
    }
    return map;
  }, [yearExpenses, mileageDeduction, totalMiles]);

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
      e.date, e.name,
      e.category || '',
      TAX_CATEGORY_LABELS[e.tax_category] || '—',
      (e.amount || 0).toFixed(2),
      e.payment_method || '',
      e.receipt_ref || '',
      e.job_name || '',
    ]);
    downloadCSV(`expenses-${year}.csv`, [header, ...rows]);
    toast.success(`Expenses CSV exported (${rows.length} records)`);
  };

  const exportMileageCSV = () => {
    const header = ['Date', 'Description', 'From', 'To', 'Vehicle', 'Odometer Start', 'Odometer End', 'Business Miles', 'IRS Deduction ($0.67)', 'Job'];
    const rows = yearMileage.map(m => [
      m.date, m.description, m.from_location || '', m.to_location || '',
      m.vehicle || '', m.odometer_start || 0, m.odometer_end || 0,
      (m.business_miles || 0).toFixed(1),
      ((m.business_miles || 0) * IRS_MILEAGE_RATE).toFixed(2),
      m.job_name || '',
    ]);
    downloadCSV(`mileage-${year}.csv`, [header, ...rows]);
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
    const header = ['Schedule C Line', 'Category', 'Amount'];
    const rows = Object.entries(scheduleC)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ['Part II', TAX_CATEGORY_LABELS[cat] || cat, amt.toFixed(2)]);
    rows.push(['', 'TOTAL DEDUCTIONS', totalDeductions.toFixed(2)]);
    rows.push(['Part I', 'Gross Income', totalIncome.toFixed(2)]);
    rows.push(['', 'NET PROFIT / LOSS', netProfit.toFixed(2)]);
    downloadCSV(`schedule-c-summary-${year}.csv`, [header, ...rows]);
    toast.success('Schedule C summary exported!');
  };

  // ── PDF Export ───────────────────────────────────────────

  const exportPDF = () => {
    const doc = new jsPDF();
    const biz = settings.business_name || 'My Business';
    let y = 20;

    const line = (text, x = 14, bold = false) => {
      doc.setFontSize(bold ? 11 : 10);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.text(text, x, y);
      y += bold ? 7 : 6;
    };
    const divider = () => {
      doc.setDrawColor(180);
      doc.line(14, y, 196, y);
      y += 4;
    };
    const checkPage = () => {
      if (y > 270) { doc.addPage(); y = 20; }
    };

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${biz}`, 14, y); y += 8;
    doc.setFontSize(13);
    doc.text(`Tax Summary — ${year}`, 14, y); y += 8;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}  ·  For accountant use only`, 14, y);
    y += 10;
    divider();

    // Schedule C Summary
    line('SCHEDULE C — PROFIT OR LOSS FROM BUSINESS', 14, true);
    y += 2;
    line(`Part I — Gross Income`, 14, true);
    line(`  Gross receipts / sales (paid jobs): $${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 14);
    y += 3;
    line(`Part II — Expenses`, 14, true);
    Object.entries(scheduleC)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, amt]) => {
        checkPage();
        const label = TAX_CATEGORY_LABELS[cat] || cat;
        const valStr = `$${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`  ${label}`, 14, y);
        doc.text(valStr, 185, y, { align: 'right' });
        y += 6;
        checkPage();
      });
    divider();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('  Total Deductions', 14, y);
    doc.text(`$${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 185, y, { align: 'right' });
    y += 7;
    doc.text('  Net Profit / (Loss)', 14, y);
    doc.text(`$${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 185, y, { align: 'right' });
    y += 10;
    divider();

    // Mileage Summary
    checkPage();
    line('VEHICLE MILEAGE (Schedule C, Car & Truck)', 14, true);
    line(`  Total business miles: ${totalMiles.toFixed(1)} mi  ×  $${IRS_MILEAGE_RATE}/mi = $${mileageDeduction.toFixed(2)}`);
    line(`  Trips logged: ${yearMileage.length}`);
    y += 4;
    divider();

    // Owner Transactions Summary (Form 5472)
    checkPage();
    line('OWNER TRANSACTIONS — FORM 5472', 14, true);
    if (yearOwnerTxs.length === 0) {
      line('  No transactions recorded for this year.');
    } else {
      const byType = {};
      yearOwnerTxs.forEach(t => {
        byType[t.transaction_type] = (byType[t.transaction_type] || 0) + (t.amount || 0);
      });
      Object.entries(byType).forEach(([type, amt]) => {
        checkPage();
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`  ${OWNER_TX_LABELS[type] || type}`, 14, y);
        doc.text(`$${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 185, y, { align: 'right' });
        y += 6;
      });
    }
    y += 4;
    divider();

    // Income detail (top 10)
    checkPage();
    line(`INCOME DETAIL — Top Jobs (${year})`, 14, true);
    yearIncome.slice(0, 15).forEach(j => {
      checkPage();
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const label = `  ${j.date || ''}  ${j.client_name} — ${j.job_name}`;
      const val = `$${(j.grand_total || j.total_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      doc.text(label.substring(0, 75), 14, y);
      doc.text(val, 185, y, { align: 'right' });
      y += 5.5;
    });
    if (yearIncome.length > 15) {
      y += 2;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`  ... and ${yearIncome.length - 15} more jobs. See income CSV for full detail.`, 14, y);
      y += 6;
    }

    // Footer on each page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(150);
      doc.text(`${biz} · Tax Summary ${year} · Page ${i} of ${pageCount} · Generated by ContractorApp`, 14, 290);
      doc.setTextColor(0);
    }

    doc.save(`tax-summary-${year}.pdf`);
    toast.success('PDF exported! Ready for your accountant.');
  };

  const Section = ({ icon: Icon, title, count, total, onExportCSV, color = 'text-primary' }) => (
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
            <CardContent className="space-y-2">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Gross Income</p>
                  <p className="font-heading font-bold text-lg text-emerald-700">${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Total Deductions</p>
                  <p className="font-heading font-bold text-lg text-red-600">${totalDeductions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Net Profit / (Loss)</p>
                  <p className={`font-heading font-bold text-lg ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    ${netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* By Tax Category */}
              {Object.keys(scheduleC).length > 0 && (
                <div className="divide-y rounded-lg border bg-white overflow-hidden">
                  {Object.entries(scheduleC)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amt]) => (
                      <div key={cat} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="text-muted-foreground">{TAX_CATEGORY_LABELS[cat] || cat}</span>
                        <span className="font-medium tabular-nums">${amt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Individual CSV exports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Section
              icon={Receipt}
              title="Expenses (Schedule C)"
              count={yearExpenses.length}
              total={`$${totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })} total`}
              onExportCSV={exportExpensesCSV}
            />
            <Section
              icon={Car}
              title="Mileage Log"
              count={yearMileage.length}
              total={`${totalMiles.toFixed(1)} mi · $${mileageDeduction.toFixed(2)} deduction`}
              onExportCSV={exportMileageCSV}
            />
            <Section
              icon={Landmark}
              title="Owner Transactions (Form 5472)"
              count={yearOwnerTxs.length}
              total={`${yearOwnerTxs.length} reportable transactions`}
              onExportCSV={exportOwnerTxCSV}
            />
            <Section
              icon={DollarSign}
              title="Income / Paid Jobs"
              count={yearIncome.length}
              total={`$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} gross`}
              onExportCSV={exportIncomeCSV}
              color="text-emerald-600"
            />
          </div>

          {/* Export all buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
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
                  { label: 'Expenses categorized with Schedule C codes', done: yearExpenses.some(e => e.tax_category && e.tax_category !== 'none') },
                  { label: 'Receipts / references recorded', done: yearExpenses.some(e => e.receipt_ref) },
                  { label: 'Mileage log complete', done: yearMileage.length > 0 },
                  { label: 'Owner transactions recorded (Form 5472)', done: yearOwnerTxs.length > 0 },
                  { label: 'Payment methods recorded on all expenses', done: yearExpenses.some(e => e.payment_method && e.payment_method !== 'other') },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className={`h-4 w-4 rounded-full flex items-center justify-center shrink-0 ${item.done ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                      {item.done ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-foreground' : 'text-muted-foreground'}`}>{item.label}</span>
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