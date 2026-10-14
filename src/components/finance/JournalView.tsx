'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Eye,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Trash2,
} from 'lucide-react';

interface JournalLine {
  accountCode: string;
  accountName?: string;
  debit: number;
  credit: number;
  description: string;
  partnerType?: string;
  partnerName?: string;
}

interface JournalEntry {
  entryNumber: string;
  date: string;
  accountingDate: string;
  status: 'Draft' | 'Posted' | 'Reversed';
  sourceModule: string;
  sourceDocumentNumber?: string;
  memo: string;
  department: string;
  totalDebit: number;
  totalCredit: number;
  lines: JournalLine[];
  reversalReason?: string;
  reversedByEntryNumber?: string;
  createdAt: string;
}

export function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedModule, setSelectedModule] = useState<string>('All');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isReverseOpen, setIsReverseOpen] = useState<boolean>(false);
  const [reversalTarget, setReversalTarget] = useState<JournalEntry | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Journal Entry Form State
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [memo, setMemo] = useState<string>('');
  const [department, setDepartment] = useState<string>('Finance');
  const [newLines, setNewLines] = useState<JournalLine[]>([
    { accountCode: '1010', debit: 0, credit: 0, description: '' },
    { accountCode: '4010', debit: 0, credit: 0, description: '' },
  ]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/journal');
      const data = await res.json();
      if (data.success && data.entries) {
        setEntries(data.entries);
      }
    } catch (err) {
      console.error('Failed to fetch journal entries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handlePostDraft = async (entryNumber: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/journal/${entryNumber}/post`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: `Journal entry ${entryNumber} posted to General Ledger.` });
        fetchEntries();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to post entry.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to post entry.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleReverse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/journal/${reversalTarget.entryNumber}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reversalReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Journal ${reversalTarget.entryNumber} reversed. Reversal entry: ${data.reversalEntry?.entryNumber}`,
        });
        setIsReverseOpen(false);
        setReversalTarget(null);
        setReversalReason('');
        fetchEntries();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to reverse entry.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reverse entry.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleCreateEntry = async (statusToSave: 'Draft' | 'Posted') => {
    if (!memo.trim()) {
      setFeedback({ type: 'error', message: 'Memo description is required.' });
      return;
    }

    const totalDebits = newLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
    const totalCredits = newLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.005) {
      setFeedback({
        type: 'error',
        message: `Unbalanced journal: Total Debits (ETB ${totalDebits.toFixed(2)}) must equal Total Credits (ETB ${totalCredits.toFixed(2)}).`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entryDate,
          accountingDate: entryDate,
          sourceModule: 'Manual',
          memo: memo.trim(),
          department,
          lines: newLines.map((l) => ({
            accountCode: l.accountCode.trim(),
            debit: Number(l.debit) || 0,
            credit: Number(l.credit) || 0,
            description: l.description.trim() || memo.trim(),
          })),
          status: statusToSave,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({
          type: 'success',
          message: `Journal entry ${data.entry?.entryNumber} created with status ${statusToSave}.`,
        });
        setIsCreateOpen(false);
        setMemo('');
        setNewLines([
          { accountCode: '1010', debit: 0, credit: 0, description: '' },
          { accountCode: '4010', debit: 0, credit: 0, description: '' },
        ]);
        fetchEntries();
      } else {
        setFeedback({ type: 'error', message: data.message || 'Failed to create journal entry.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error creating journal entry.' });
    } finally {
      setSubmitting(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const filteredEntries = entries.filter((e) => {
    const matchesSearch =
      e.entryNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.memo.toLowerCase().includes(search.toLowerCase()) ||
      (e.sourceDocumentNumber && e.sourceDocumentNumber.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = selectedStatus === 'All' || e.status === selectedStatus;
    const matchesModule = selectedModule === 'All' || e.sourceModule === selectedModule;
    return matchesSearch && matchesStatus && matchesModule;
  });

  // Calculate live modal balance
  const liveTotalDebit = newLines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const liveTotalCredit = newLines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const liveDifference = Math.abs(liveTotalDebit - liveTotalCredit);
  const liveIsBalanced = liveDifference < 0.005 && liveTotalDebit > 0;

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

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search entry #, memo, or reference..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {['All', 'Posted', 'Draft', 'Reversed'].map((status) => (
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
            onClick={fetchEntries}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            title="Refresh Entries"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>New Journal Entry</span>
          </button>
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl shadow-black/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-950/90 text-slate-400 border-b border-slate-800 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Entry #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Memo / Description</th>
                <th className="py-3 px-4 text-right">Debit (ETB)</th>
                <th className="py-3 px-4 text-right">Credit (ETB)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                    Loading General Ledger journal entries...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No journal entries found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((e) => (
                  <tr key={e.entryNumber} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-amber-400">{e.entryNumber}</td>
                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">{e.accountingDate || e.date}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {e.sourceModule}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold max-w-xs truncate">
                      {e.memo}
                      {e.sourceDocumentNumber && (
                        <span className="ml-1 text-[10px] text-slate-500 font-mono">({e.sourceDocumentNumber})</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                      {e.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                      {e.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          e.status === 'Posted'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : e.status === 'Draft'
                            ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedEntry(e)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="View Lines"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {e.status === 'Draft' && (
                          <button
                            onClick={() => handlePostDraft(e.entryNumber)}
                            className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 font-bold text-[10px] transition"
                            title="Post to GL"
                          >
                            Post
                          </button>
                        )}

                        {e.status === 'Posted' && (
                          <button
                            onClick={() => {
                              setReversalTarget(e);
                              setIsReverseOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 transition"
                            title="Reverse Entry"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
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

      {/* View Lines Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                    <span>Journal Entry {selectedEntry.entryNumber}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        selectedEntry.status === 'Posted'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {selectedEntry.status}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">{selectedEntry.memo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="text-slate-500 hover:text-slate-300 font-bold">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Date</span>
                  <span className="font-mono font-bold text-slate-200">{selectedEntry.accountingDate || selectedEntry.date}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Source Module</span>
                  <span className="font-semibold text-slate-200">{selectedEntry.sourceModule} ({selectedEntry.department})</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reference Doc</span>
                  <span className="font-mono text-slate-300">{selectedEntry.sourceDocumentNumber || '-'}</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 font-bold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3">Line Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (ETB)</th>
                      <th className="py-2.5 px-3 text-right">Credit (ETB)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {selectedEntry.lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                          {line.accountCode}
                          {line.accountName && <span className="ml-1 text-slate-400 font-normal">({line.accountName})</span>}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300">
                          <div>{line.description}</div>
                          {line.partnerName && <div className="text-[10px] text-slate-500">Partner: {line.partnerName}</div>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {line.debit > 0 ? line.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                          {line.credit > 0 ? line.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-950/90 font-bold border-t border-slate-800">
                    <tr>
                      <td colSpan={2} className="py-2.5 px-3 text-slate-300 uppercase text-[10px]">
                        Total Ledger Equilibrium
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400">
                        {selectedEntry.totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400">
                        {selectedEntry.totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Journal Entry Modal with Live Balancing Validator */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400 border border-amber-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Create Double-Entry Journal</h3>
                  <p className="text-[11px] text-slate-400">Enforces integer-cent balancing validator</p>
                </div>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Date *</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Department</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Source Module</label>
                  <input
                    type="text"
                    disabled
                    value="Manual"
                    className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800/80 rounded-xl text-xs text-slate-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Memo / Purpose *</label>
                <input
                  type="text"
                  placeholder="e.g. Month-end depreciation adjustment or safe cash drop"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              {/* Dynamic Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-400">Journal Lines (Debits & Credits)</label>
                  <button
                    type="button"
                    onClick={() =>
                      setNewLines([...newLines, { accountCode: '1010', debit: 0, credit: 0, description: '' }])
                    }
                    className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Line
                  </button>
                </div>

                <div className="space-y-2">
                  {newLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-slate-950/60 border border-slate-800 rounded-xl">
                      <div className="w-24">
                        <input
                          type="text"
                          placeholder="Acct Code"
                          value={line.accountCode}
                          onChange={(e) => {
                            const updated = [...newLines];
                            updated[idx].accountCode = e.target.value;
                            setNewLines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono font-bold text-amber-400 text-center"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Line Memo..."
                          value={line.description}
                          onChange={(e) => {
                            const updated = [...newLines];
                            updated[idx].description = e.target.value;
                            setNewLines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Debit"
                          value={line.debit || ''}
                          onChange={(e) => {
                            const updated = [...newLines];
                            updated[idx].debit = parseFloat(e.target.value) || 0;
                            if (updated[idx].debit > 0) updated[idx].credit = 0;
                            setNewLines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400 text-right font-bold"
                        />
                      </div>
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Credit"
                          value={line.credit || ''}
                          onChange={(e) => {
                            const updated = [...newLines];
                            updated[idx].credit = parseFloat(e.target.value) || 0;
                            if (updated[idx].credit > 0) updated[idx].debit = 0;
                            setNewLines(updated);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-amber-400 text-right font-bold"
                        />
                      </div>
                      {newLines.length > 2 && (
                        <button
                          type="button"
                          onClick={() => setNewLines(newLines.filter((_, i) => i !== idx))}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Live Balance Summary */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                  liveIsBalanced
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <div>
                  <span className="font-bold">Total Debits: ETB {liveTotalDebit.toFixed(2)}</span>
                  <span className="mx-2 text-slate-600">|</span>
                  <span className="font-bold">Total Credits: ETB {liveTotalCredit.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  {liveIsBalanced ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Balanced (0.00 Diff)</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span>Discrepancy: ETB {liveDifference.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting || !liveIsBalanced}
                  onClick={() => handleCreateEntry('Draft')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition disabled:opacity-40"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  disabled={submitting || !liveIsBalanced}
                  onClick={() => handleCreateEntry('Posted')}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition disabled:opacity-40 shadow-lg shadow-amber-500/20"
                >
                  {submitting ? 'Posting...' : 'Post to Ledger'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controlled Reversal Modal */}
      {isReverseOpen && reversalTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400 border border-rose-500/30">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-100">Reverse Journal Entry</h3>
                  <p className="text-[11px] text-slate-400">{reversalTarget.entryNumber}</p>
                </div>
              </div>
              <button onClick={() => setIsReverseOpen(false)} className="text-slate-500 hover:text-slate-300 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleReverse} className="p-5 space-y-4">
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-1">
                <div>Original Memo: <span className="font-semibold text-slate-100">{reversalTarget.memo}</span></div>
                <div>Total Amount: <span className="font-mono font-bold text-amber-400">ETB {reversalTarget.totalDebit.toLocaleString()}</span></div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Mandatory Reversal Reason *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the audit justification for reversing this posted transaction..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsReverseOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition disabled:opacity-50"
                >
                  {submitting ? 'Reversing...' : 'Confirm Reversal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
