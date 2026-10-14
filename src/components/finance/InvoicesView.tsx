'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  FileCheck2,
  Printer,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building2,
  Calendar,
  X,
  User,
} from 'lucide-react';

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercentage?: number;
  vatRate: number;
  serviceChargeRate: number;
  netAmount?: number;
  totalLineAmount?: number;
  revenueAccountCode?: string;
}

interface CustomerInvoice {
  invoiceNumber: string;
  invoiceType: string;
  customerType: string;
  customerName: string;
  customerPhone?: string;
  customerTin?: string;
  roomNumber?: string;
  issueDate: string;
  dueDate: string;
  status: 'Draft' | 'Issued' | 'Paid' | 'Partial' | 'Cancelled';
  subtotal: number;
  vatTotal: number;
  serviceChargeTotal: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  lines: InvoiceLine[];
  hotelTin?: string;
  createdAt: string;
}

export function InvoicesView() {
  const [invoices, setInvoices] = useState<CustomerInvoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoice | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isPayOpen, setIsPayOpen] = useState<boolean>(false);
  const [isPrintOpen, setIsPrintOpen] = useState<boolean>(false);
  const [payTarget, setPayTarget] = useState<CustomerInvoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Cash');
  const [payRef, setPayRef] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Invoice Form
  const [customerName, setCustomerName] = useState<string>('');
  const [customerType, setCustomerType] = useState<string>('Guest');
  const [customerTin, setCustomerTin] = useState<string>('');
  const [roomNumber, setRoomNumber] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<string>('RoomStay');
  const [newLines, setNewLines] = useState<InvoiceLine[]>([
    { description: 'Standard Deluxe Room Stay (1 Night)', quantity: 1, unitPrice: 3500, vatRate: 15, serviceChargeRate: 10, revenueAccountCode: '4010' },
  ]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/invoices');
      const data = await res.json();
      if (data.success && data.invoices) {
        setInvoices(data.invoices);
      }
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || newLines.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerType,
          customerTin: customerTin.trim(),
          roomNumber: roomNumber.trim() || undefined,
          invoiceType,
          lines: newLines,
          postToLedger: true,
          createdBy: 'Finance Manager',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Tax Invoice ${data.invoice?.invoiceNumber} generated & posted to GL.` });
        setIsCreateOpen(false);
        setCustomerName('');
        setCustomerTin('');
        setRoomNumber('');
        fetchInvoices();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to create invoice.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error generating invoice.' });
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
      const res = await fetch(`/api/finance/invoices/${payTarget.invoiceNumber}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentAmount: payAmount,
          paymentMethod: payMethod,
          referenceCode: payRef.trim(),
          recordedBy: 'Finance Cashier',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Payment of ETB ${payAmount.toLocaleString()} recorded on invoice ${payTarget.invoiceNumber}.`,
        });
        setIsPayOpen(false);
        setPayTarget(null);
        setPayRef('');
        fetchInvoices();
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

  // Aging Summary Calculation
  const totalReceivables = invoices.reduce((s, i) => s + (i.balanceDue || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + (i.amountPaid || 0), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + (i.grandTotal || 0), 0);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customerTin && inv.customerTin.includes(search)) ||
      (inv.roomNumber && inv.roomNumber.includes(search));
    const matchesStatus = selectedStatus === 'All' || inv.status === selectedStatus;
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

      {/* AR Executive Aging Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Invoiced (Gross)</p>
            <h3 className="text-xl font-black text-slate-100 mt-1">
              {totalInvoiced.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collected (Cash / Bank)</p>
            <h3 className="text-xl font-black text-emerald-400 mt-1">
              {totalPaid.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outstanding AR Due</p>
            <h3 className="text-xl font-black text-rose-400 mt-1">
              {totalReceivables.toLocaleString()} <span className="text-xs text-slate-400 font-normal">ETB</span>
            </h3>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoice #, guest, room, or TIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['All', 'Issued', 'Partial', 'Paid', 'Draft'].map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition border ${
                  selectedStatus === status
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create Tax Invoice</span>
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer / Guest</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4 text-right">Grand Total (ETB)</th>
                <th className="py-3 px-4 text-right">Paid (ETB)</th>
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
                    Loading Customer Invoices & Accounts Receivable...
                  </td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-500">
                    No customer invoices found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.invoiceNumber} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div>{inv.customerName}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2">
                        {inv.roomNumber && <span>Room {inv.roomNumber}</span>}
                        {inv.customerTin && <span className="font-mono">TIN: {inv.customerTin}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{inv.invoiceType}</td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">{inv.issueDate}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                      {inv.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {inv.amountPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      {inv.balanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : inv.status === 'Partial'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : inv.status === 'Issued'
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsPrintOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Print Tax Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => {
                              setPayTarget(inv);
                              setPayAmount(inv.balanceDue);
                              setIsPayOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] transition"
                            title="Record Payment"
                          >
                            Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {isPayOpen && payTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400 border border-emerald-500/30">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Record Payment Receipt</h3>
                  <p className="text-[11px] text-slate-400">{payTarget.invoiceNumber} - {payTarget.customerName}</p>
                </div>
              </div>
              <button onClick={() => setIsPayOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-mono font-bold text-slate-100">ETB {payTarget.grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Already Paid:</span>
                  <span className="font-mono text-emerald-400">ETB {payTarget.amountPaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-slate-800 pt-1 text-rose-400">
                  <span>Balance Due:</span>
                  <span className="font-mono">ETB {payTarget.balanceDue.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Payment Amount (ETB) *</label>
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
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Payment Tender / Method *</label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="Cash">Cash (Front Desk Register 1010)</option>
                  <option value="Telebirr">Telebirr Clearing (1040)</option>
                  <option value="CBE Birr">CBE Birr Clearing (1050)</option>
                  <option value="Card">Bank Card Swipe Terminal (1070)</option>
                  <option value="Bank Transfer">Bank Transfer (CBE Operating 1060)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Transaction Ref / Receipt #</label>
                <input
                  type="text"
                  placeholder="e.g. TXN-9988124 or slip number"
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
                  {submitting ? 'Recording...' : 'Post Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Ministry of Revenues Tax Invoice Modal */}
      {isPrintOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white text-slate-950 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl p-8 print:p-0 print:m-0 animate-in fade-in zoom-in-95 duration-200">
            {/* Tax Invoice Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-4">
              <div>
                <h1 className="text-xl font-black tracking-tight uppercase">Zemen Hotel & Resort</h1>
                <p className="text-xs text-slate-600">Bole Sub-City, Addis Ababa, Ethiopia</p>
                <p className="text-xs text-slate-600 font-mono font-bold mt-1">TIN: 0098765432 | VAT Reg: 15%</p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-slate-950 text-white text-xs font-black rounded-lg uppercase tracking-wider">
                  Official Tax Invoice
                </span>
                <p className="text-xs font-mono font-bold mt-2">{selectedInvoice.invoiceNumber}</p>
                <p className="text-[11px] text-slate-600">Date: {selectedInvoice.issueDate}</p>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-4 text-xs mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Customer / Guest</span>
                <p className="font-bold text-sm text-slate-900">{selectedInvoice.customerName}</p>
                {selectedInvoice.roomNumber && <p className="text-slate-600">Room: {selectedInvoice.roomNumber}</p>}
                {selectedInvoice.customerPhone && <p className="text-slate-600">Tel: {selectedInvoice.customerPhone}</p>}
              </div>
              <div className="text-right">
                <span className="text-slate-500 font-bold block uppercase text-[10px]">Customer Tax Information</span>
                <p className="font-mono font-bold text-slate-900">
                  TIN: {selectedInvoice.customerTin || 'Unregistered Individual'}
                </p>
                <p className="text-slate-600">Category: {selectedInvoice.customerType}</p>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full text-left text-xs mb-4">
              <thead>
                <tr className="border-b-2 border-slate-900 font-bold text-[10px] uppercase">
                  <th className="py-2">Description</th>
                  <th className="py-2 text-center">Qty</th>
                  <th className="py-2 text-right">Unit Price</th>
                  <th className="py-2 text-center">VAT</th>
                  <th className="py-2 text-center">SC</th>
                  <th className="py-2 text-right">Total (ETB)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {selectedInvoice.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">{line.description}</td>
                    <td className="py-2 text-center font-mono">{line.quantity}</td>
                    <td className="py-2 text-right font-mono">{line.unitPrice.toFixed(2)}</td>
                    <td className="py-2 text-center text-[10px]">{line.vatRate}%</td>
                    <td className="py-2 text-center text-[10px]">{line.serviceChargeRate}%</td>
                    <td className="py-2 text-right font-mono font-bold">
                      {((line.quantity * line.unitPrice) * 1.25).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Calculations Summary */}
            <div className="flex justify-end text-xs mb-6">
              <div className="w-64 space-y-1 border-t-2 border-slate-900 pt-2 font-medium">
                <div className="flex justify-between">
                  <span>Taxable Subtotal:</span>
                  <span className="font-mono">ETB {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Output VAT (15%):</span>
                  <span className="font-mono">ETB {selectedInvoice.vatTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Charge (10%):</span>
                  <span className="font-mono">ETB {selectedInvoice.serviceChargeTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm border-t border-slate-900 pt-1 text-slate-950">
                  <span>Grand Total:</span>
                  <span className="font-mono">ETB {selectedInvoice.grandTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Amount Paid:</span>
                  <span className="font-mono">ETB {selectedInvoice.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold border-t border-slate-300 pt-1">
                  <span>Balance Due:</span>
                  <span className="font-mono">ETB {selectedInvoice.balanceDue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Print & Close Controls */}
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 print:hidden">
              <span className="text-[11px] text-slate-500">Ministry of Revenues Compliant Electronic Tax Invoice</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPrintOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Tax Invoice</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Create Tax Invoice</h3>
                  <p className="text-[11px] text-slate-400">15% VAT & 10% Service Charge Breakdown</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Customer / Guest Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ethiopian Airlines Commercial"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Customer Type</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Guest">Individual In-House Guest</option>
                    <option value="Corporate">Corporate Account</option>
                    <option value="Airline">Airline Contract</option>
                    <option value="Government / NGO">Government / NGO Agency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Customer 10-Digit TIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 0019283746"
                    value={customerTin}
                    onChange={(e) => setCustomerTin(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Room Number (if in-house)</label>
                  <input
                    type="text"
                    placeholder="e.g. 304"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 font-mono"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-400">Invoice Items</label>
                {newLines.map((line, idx) => (
                  <div key={idx} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                    <input
                      type="text"
                      placeholder="Item description..."
                      value={line.description}
                      onChange={(e) => {
                        const updated = [...newLines];
                        updated[idx].description = e.target.value;
                        setNewLines(updated);
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
                            const updated = [...newLines];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setNewLines(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Unit Price (ETB)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => {
                            const updated = [...newLines];
                            updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                            setNewLines(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 font-bold"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Revenue Account</span>
                        <input
                          type="text"
                          value={line.revenueAccountCode || '4010'}
                          onChange={(e) => {
                            const updated = [...newLines];
                            updated[idx].revenueAccountCode = e.target.value;
                            setNewLines(updated);
                          }}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-cyan-400 font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Save & Post Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
