'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  Truck,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building,
  Calendar,
  Layers,
  FileCheck,
  ShieldCheck,
  Package,
} from 'lucide-react';

interface BillLine {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  assetOrExpenseAccountCode: string;
}

interface SupplierBill {
  billNumber: string;
  supplierName: string;
  supplierInvoiceNumber: string;
  goodsReceiptNumber?: string;
  purchaseOrderId?: string;
  billDate: string;
  dueDate: string;
  subtotal: number;
  vatTotal: number;
  withholdingTaxAmount: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  status: 'Draft' | 'Posted' | 'Partially_Paid' | 'Paid' | 'Cancelled';
  threeWayMatched: boolean;
  lines: BillLine[];
}

interface Supplier {
  supplierCode: string;
  name: string;
  tinNumber: string;
  phone: string;
  category: string;
  paymentTermsDays: number;
  currentBalance: number;
}

export function BillsView() {
  const [activeTab, setActiveTab] = useState<'bills' | 'suppliers'>('bills');
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isCreateBillOpen, setIsCreateBillOpen] = useState<boolean>(false);
  const [isCreateSupplierOpen, setIsCreateSupplierOpen] = useState<boolean>(false);
  const [isPayOpen, setIsPayOpen] = useState<boolean>(false);
  const [payTarget, setPayTarget] = useState<SupplierBill | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Bank Transfer');
  const [payBankCode, setPayBankCode] = useState<string>('1060');
  const [payRef, setPayRef] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Supplier Form
  const [supName, setSupName] = useState<string>('');
  const [supTin, setSupTin] = useState<string>('');
  const [supPhone, setSupPhone] = useState<string>('');
  const [supCategory, setSupCategory] = useState<string>('Food & Beverage');
  const [supTerms, setSupTerms] = useState<number>(30);

  // New Bill Form
  const [billSupplierName, setBillSupplierName] = useState<string>('');
  const [supplierInvNum, setSupplierInvNum] = useState<string>('');
  const [grnNum, setGrnNum] = useState<string>('');
  const [applyWht, setApplyWht] = useState<boolean>(false);
  const [billLines, setBillLines] = useState<BillLine[]>([
    { description: 'Fresh Prime Beef Tenderloin (50 kg)', quantity: 50, unit: 'kg', unitPrice: 650, vatRate: 15, assetOrExpenseAccountCode: '1200' },
  ]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [billsRes, supRes] = await Promise.all([
        fetch('/api/finance/bills'),
        fetch('/api/finance/suppliers'),
      ]);
      const billsData = await billsRes.json();
      const supData = await supRes.json();

      if (billsData.success && billsData.bills) setBills(billsData.bills);
      if (supData.success && supData.suppliers) setSuppliers(supData.suppliers);
    } catch (err) {
      console.error('Failed to fetch AP data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim() || !supPhone.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: supName.trim(),
          tinNumber: supTin.trim(),
          phone: supPhone.trim(),
          category: supCategory,
          paymentTermsDays: supTerms,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Supplier ${supName} registered successfully.` });
        setIsCreateSupplierOpen(false);
        setSupName('');
        setSupTin('');
        setSupPhone('');
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to register supplier.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error registering supplier.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billSupplierName.trim() || billLines.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: billSupplierName.trim(),
          supplierInvoiceNumber: supplierInvNum.trim(),
          goodsReceiptNumber: grnNum.trim() || undefined,
          lines: billLines,
          withholdingTaxRate: applyWht ? 2.0 : 0.0,
          postToLedger: true,
          createdBy: 'Finance AP Clerk',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Supplier Bill ${data.bill?.billNumber} posted to Accounts Payable.` });
        setIsCreateBillOpen(false);
        setBillSupplierName('');
        setSupplierInvNum('');
        setGrnNum('');
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to create bill.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating bill.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget || payAmount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/bills/${payTarget.billNumber}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAmount: payAmount,
          paymentMethod: payMethod,
          bankAccountCode: payBankCode,
          referenceNumber: payRef.trim(),
          recordedBy: 'Finance AP Cashier',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Payment voucher recorded for Bill ${payTarget.billNumber} (ETB ${payAmount.toLocaleString()}).`,
        });
        setIsPayOpen(false);
        setPayTarget(null);
        setPayRef('');
        fetchData();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to record payment.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error recording payment.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const totalPayables = bills.reduce((s, b) => s + (b.balanceDue || 0), 0);
  const totalBilled = bills.reduce((s, b) => s + (b.grandTotal || 0), 0);
  const totalPaid = bills.reduce((s, b) => s + (b.amountPaid || 0), 0);

  const filteredBills = bills.filter((b) => {
    const matchesSearch =
      b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
      b.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (b.supplierInvoiceNumber && b.supplierInvoiceNumber.includes(search)) ||
      (b.goodsReceiptNumber && b.goodsReceiptNumber.includes(search));
    const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Alert Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-xs font-semibold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* AP Executive Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchases Billed</p>
            <h3 className="text-xl font-black text-slate-100 mt-1">
              {totalBilled.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Truck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Disbursements Cleared</p>
            <h3 className="text-xl font-black text-emerald-400 mt-1">
              {totalPaid.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding Trade Payables</p>
            <h3 className="text-xl font-black text-rose-400 mt-1">
              {totalPayables.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar & Sub-Tabs */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('bills')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'bills' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Purchase Bills ({bills.length})
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === 'suppliers' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Vendor Directory ({suppliers.length})
            </button>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search bills, vendors, GRN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Refresh AP Data"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {activeTab === 'suppliers' ? (
            <button
              onClick={() => setIsCreateSupplierOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Register Vendor</span>
            </button>
          ) : (
            <button
              onClick={() => setIsCreateBillOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Purchase Bill</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'bills' ? (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-black/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Bill #</th>
                  <th className="py-3 px-4">Supplier / Vendor</th>
                  <th className="py-3 px-4">Supplier Inv / GRN</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-center">3-Way Match</th>
                  <th className="py-3 px-4 text-right">Net Payable (ETB)</th>
                  <th className="py-3 px-4 text-right">Balance Due (ETB)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                      Loading Accounts Payable Bills...
                    </td>
                  </tr>
                ) : filteredBills.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-500">
                      No purchase bills found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBills.map((b) => (
                    <tr key={b.billNumber} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-400">{b.billNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-200">{b.supplierName}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        <div>{b.supplierInvoiceNumber}</div>
                        {b.goodsReceiptNumber && <div className="text-[10px] text-emerald-400 font-bold">GRN: {b.goodsReceiptNumber}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{b.dueDate}</td>
                      <td className="py-3 px-4 text-center">
                        {b.threeWayMatched ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center gap-1 w-max mx-auto">
                            <ShieldCheck className="w-3 h-3" /> Matched
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            Unmatched
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                        {b.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                        {b.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            b.status === 'Paid'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : b.status === 'Partially_Paid'
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {b.balanceDue > 0 && (
                          <button
                            onClick={() => {
                              setPayTarget(b);
                              setPayAmount(b.balanceDue);
                              setIsPayOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] transition"
                          >
                            Pay Voucher
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vendors Directory Table */
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-black/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Vendor Code</th>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">10-Digit Ethiopian TIN</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Terms</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Open Payable (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {suppliers.map((s) => (
                  <tr key={s.supplierCode} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{s.supplierCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{s.name}</td>
                    <td className="py-3 px-4 font-mono text-slate-300">{s.tinNumber || '-'}</td>
                    <td className="py-3 px-4 text-slate-400">{s.category}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">Net {s.paymentTermsDays}</td>
                    <td className="py-3 px-4 text-slate-400">{s.phone}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      {(s.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record Payment Voucher Modal */}
      {isPayOpen && payTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Disburse Payment Voucher</h3>
                  <p className="text-[11px] text-slate-400">{payTarget.billNumber} ({payTarget.supplierName})</p>
                </div>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Net Bill Amount:</span>
                  <span className="font-mono font-bold text-slate-100">ETB {payTarget.grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-rose-400 font-bold">
                  <span>Outstanding Due:</span>
                  <span className="font-mono">ETB {payTarget.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Disbursement Amount (ETB) *</label>
                <input
                  type="number"
                  step="0.01"
                  max={payTarget.balanceDue}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Disbursement Bank Account *</label>
                <select
                  value={payBankCode}
                  onChange={(e) => setPayBankCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="1060">CBE Commercial Bank Operating (1060)</option>
                  <option value="1070">Awash / Private Bank Account (1070)</option>
                  <option value="1010">Front Desk Cash Register (1010)</option>
                  <option value="1030">Main Hotel Safe & Petty Cash (1030)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Cheque / Bank Transfer Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. CBE-TXN-1102948 or Cheque 004821"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || payAmount <= 0}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Disburse Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Supplier Modal */}
      {isCreateSupplierOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Register Vendor</h3>
                  <p className="text-[11px] text-slate-400">10-Digit Ethiopian TIN Directory</p>
                </div>
              </div>
              <button onClick={() => setIsCreateSupplierOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateSupplier} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Addis Abattoir PLC"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">10-Digit TIN *</label>
                  <input
                    type="text"
                    required
                    pattern="\d{10}"
                    title="Must be exactly 10 digits"
                    placeholder="0019283746"
                    value={supTin}
                    onChange={(e) => setSupTin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+251 911 234567"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Category</label>
                  <select
                    value={supCategory}
                    onChange={(e) => setSupCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200"
                  >
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Housekeeping Supplies">Housekeeping Supplies</option>
                    <option value="Maintenance & Parts">Maintenance & Parts</option>
                    <option value="Utilities & Fuel">Utilities & Fuel</option>
                    <option value="General Services">General Services</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Payment Terms</label>
                  <select
                    value={supTerms}
                    onChange={(e) => setSupTerms(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  >
                    <option value={0}>Immediate Cash</option>
                    <option value={15}>Net 15 Days</option>
                    <option value={30}>Net 30 Days</option>
                    <option value={60}>Net 60 Days</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateSupplierOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Purchase Bill Modal */}
      {isCreateBillOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Create Purchase Bill</h3>
                  <p className="text-[11px] text-slate-400">Input VAT 15% & Statutory 2% Withholding Tax</p>
                </div>
              </div>
              <button onClick={() => setIsCreateBillOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateBill} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Addis Abattoir PLC"
                    value={billSupplierName}
                    onChange={(e) => setBillSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Vendor Invoice # *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-998812"
                    value={supplierInvNum}
                    onChange={(e) => setSupplierInvNum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Goods Receipt Note (GRN)</label>
                  <input
                    type="text"
                    placeholder="e.g. GRN-2026-0042"
                    value={grnNum}
                    onChange={(e) => setGrnNum(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={applyWht}
                      onChange={(e) => setApplyWht(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0"
                    />
                    <span>Withhold 2% Statutory Tax (MoR)</span>
                  </label>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400">Bill Items & Inventory Allocation</label>
                {billLines.map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <input
                      type="text"
                      placeholder="Item description..."
                      value={line.description}
                      onChange={(e) => {
                        const updated = [...billLines];
                        updated[idx].description = e.target.value;
                        setBillLines(updated);
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Quantity</span>
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={(e) => {
                            const updated = [...billLines];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setBillLines(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Unit Cost (ETB)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const updated = [...billLines];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setBillLines(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Asset / Expense Account</span>
                        <input
                          type="text"
                          value={line.assetOrExpenseAccountCode || '1200'}
                          onChange={(e) => {
                            const updated = [...billLines];
                            updated[idx].assetOrExpenseAccountCode = e.target.value;
                            setBillLines(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateBillOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save & Post Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
