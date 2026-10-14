'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Download,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Receipt,
  Building,
} from 'lucide-react';

export function ReportsView() {
  const [selectedReport, setSelectedReport] = useState<'trial-balance' | 'balance-sheet' | 'pnl' | 'general-ledger' | 'tax-summary'>('trial-balance');
  const [loading, setLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);

  // Date filters
  const todayStr = new Date().toISOString().split('T')[0];
  const yearStartStr = `${new Date().getFullYear()}-01-01`;
  const [asOfDate, setAsOfDate] = useState<string>(todayStr);
  const [startDate, setStartDate] = useState<string>(yearStartStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [glAccountCode, setGlAccountCode] = useState<string>('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      let endpoint = '';
      if (selectedReport === 'trial-balance') {
        endpoint = `/api/finance/reports/trial-balance?asOfDate=${asOfDate}`;
      } else if (selectedReport === 'balance-sheet') {
        endpoint = `/api/finance/reports/balance-sheet?asOfDate=${asOfDate}`;
      } else if (selectedReport === 'pnl') {
        endpoint = `/api/finance/reports/profit-and-loss?startDate=${startDate}&endDate=${endDate}`;
      } else if (selectedReport === 'general-ledger') {
        endpoint = `/api/finance/reports/general-ledger?startDate=${startDate}&endDate=${endDate}${glAccountCode ? `&accountCode=${glAccountCode}` : ''}`;
      } else if (selectedReport === 'tax-summary') {
        endpoint = `/api/finance/reports/tax-summary?startDate=${startDate}&endDate=${endDate}`;
      }

      const res = await fetch(endpoint);
      const json = await res.json();
      if (json.success) {
        setReportData(json.trialBalance || json.balanceSheet || json.profitAndLoss || json.generalLedger || json.taxSummary);
      }
    } catch (err) {
      console.error('Failed to fetch report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedReport]);

  const handleExportCSV = () => {
    if (!reportData) return;
    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedReport}-${todayStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Header */}
      <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-xl flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Sub-Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {[
            { id: 'trial-balance', label: 'Trial Balance', icon: Scale },
            { id: 'balance-sheet', label: 'Balance Sheet', icon: BarChart3 },
            { id: 'pnl', label: 'Profit & Loss (P&L)', icon: TrendingUp },
            { id: 'general-ledger', label: 'General Ledger', icon: FileSpreadsheet },
            { id: 'tax-summary', label: 'Ethiopian Tax (MoR)', icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = selectedReport === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedReport(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  active
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filter & Export Controls */}
        <div className="flex items-center gap-2">
          {selectedReport === 'trial-balance' || selectedReport === 'balance-sheet' ? (
            <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-500 font-bold">As of:</span>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-mono"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-mono"
              />
              <span className="text-slate-600">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-200 focus:outline-none font-mono"
              />
            </div>
          )}

          <button
            onClick={fetchReport}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            title="Refresh Report"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition border border-slate-700"
            title="Export Data"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
            title="Print Report"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* REPORT CONTENT VIEWPORT */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-2xl shadow-black/50 print:bg-white print:text-black print:border-none print:p-0">
        {loading ? (
          <div className="py-20 text-center text-slate-500">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-3" />
            <p className="text-xs font-semibold">Generating financial statement from General Ledger...</p>
          </div>
        ) : !reportData ? (
          <div className="py-20 text-center text-slate-500 text-xs">No financial statement data available.</div>
        ) : selectedReport === 'trial-balance' ? (
          /* ======================================================== */
          /* 1. TRIAL BALANCE VIEW                                     */
          /* ======================================================== */
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">General Ledger Trial Balance</h2>
                <p className="text-xs text-slate-400">As of {reportData.asOfDate} | Ethiopian Birr (ETB)</p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                  reportData.isBalanced
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                {reportData.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{reportData.isBalanced ? 'Balanced Equilibrium' : `Discrepancy: ETB ${reportData.difference}`}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Account Title</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Debit (ETB)</th>
                    <th className="py-2.5 px-3 text-right">Credit (ETB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium font-mono">
                  {reportData.accounts?.map((acc: any) => (
                    <tr key={acc.code} className="hover:bg-slate-800/30">
                      <td className="py-2.5 px-3 font-bold text-amber-400">{acc.code}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-200">{acc.name}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-400">{acc.type}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                        {acc.netDebit > 0 ? acc.netDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-amber-400">
                        {acc.netCredit > 0 ? acc.netCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-slate-700 bg-slate-950 font-mono font-black text-sm">
                  <tr>
                    <td colSpan={3} className="py-3 px-3 uppercase text-xs font-sans text-slate-200">
                      Total Ledger Trial Balance
                    </td>
                    <td className="py-3 px-3 text-right text-emerald-400">
                      {reportData.totalDebit?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right text-amber-400">
                      {reportData.totalCredit?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : selectedReport === 'balance-sheet' ? (
          /* ======================================================== */
          /* 2. BALANCE SHEET VIEW                                     */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">Hotel Balance Sheet</h2>
                <p className="text-xs text-slate-400">As of {reportData.asOfDate} | Assets = Liabilities + Equity</p>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 ${
                  reportData.isBalanced
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                }`}
              >
                {reportData.isBalanced ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                <span>{reportData.isBalanced ? 'Balanced Equation (Assets = L + E)' : `Variance: ETB ${reportData.difference}`}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
              {/* LEFT COLUMN: ASSETS */}
              <div className="space-y-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex justify-between items-center font-black text-emerald-400">
                  <span className="uppercase tracking-wider">TOTAL ASSETS</span>
                  <span className="font-mono text-base">ETB {reportData.assets?.totalAssets?.toLocaleString()}</span>
                </div>

                {/* Current Assets */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-300 uppercase text-[11px] border-b border-slate-800 pb-1">
                    Current Assets (ETB {reportData.assets?.currentAssets?.totalCurrentAssets?.toLocaleString()})
                  </h4>
                  <div className="space-y-1 divide-y divide-slate-800/60 font-mono">
                    {reportData.assets?.currentAssets?.cashAndBank?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.assets?.currentAssets?.receivables?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.assets?.currentAssets?.inventories?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Non-Current Assets */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-300 uppercase text-[11px] border-b border-slate-800 pb-1">
                    Property, Plant & Equipment (ETB {reportData.assets?.nonCurrentAssets?.totalNonCurrentAssets?.toLocaleString()})
                  </h4>
                  <div className="space-y-1 divide-y divide-slate-800/60 font-mono">
                    {reportData.assets?.nonCurrentAssets?.fixedAssets?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.assets?.nonCurrentAssets?.accumulatedDepreciation?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between text-rose-400">
                        <span className="font-sans">Less: {i.name}</span>
                        <span>-{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: LIABILITIES & EQUITY */}
              <div className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex justify-between items-center font-black text-amber-400">
                  <span className="uppercase tracking-wider">TOTAL LIABILITIES & EQUITY</span>
                  <span className="font-mono text-base">ETB {reportData.totalLiabilitiesAndEquity?.toLocaleString()}</span>
                </div>

                {/* Liabilities */}
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-300 uppercase text-[11px] border-b border-slate-800 pb-1">
                    Liabilities (ETB {reportData.liabilities?.totalLiabilities?.toLocaleString()})
                  </h4>
                  <div className="space-y-1 divide-y divide-slate-800/60 font-mono">
                    {reportData.liabilities?.currentLiabilities?.tradePayables?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.liabilities?.currentLiabilities?.guestDepositsAndPrepayments?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.liabilities?.currentLiabilities?.statutoryAndTaxPayables?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.liabilities?.longTermLiabilities?.bankLoans?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-bold text-slate-300 uppercase text-[11px] border-b border-slate-800 pb-1">
                    Equity (ETB {reportData.equity?.totalEquity?.toLocaleString()})
                  </h4>
                  <div className="space-y-1 divide-y divide-slate-800/60 font-mono">
                    {reportData.equity?.capital?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    {reportData.equity?.retainedEarningsPrior?.map((i: any) => (
                      <div key={i.code} className="py-1.5 flex justify-between">
                        <span className="text-slate-300 font-sans">{i.name}</span>
                        <span className="text-slate-100">{i.balance?.toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="py-1.5 flex justify-between text-emerald-400 font-bold bg-emerald-500/10 px-2 rounded-lg">
                      <span className="font-sans">Current Period Net Income (P&L Plug)</span>
                      <span>ETB {reportData.equity?.currentPeriodNetIncome?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : selectedReport === 'pnl' ? (
          /* ======================================================== */
          /* 3. PROFIT & LOSS STATEMENT (USALI LODGING STANDARD)       */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">Hotel Income Statement (Profit & Loss)</h2>
                <p className="text-xs text-slate-400">
                  Period: {reportData.period?.startDate} to {reportData.period?.endDate} | Uniform System of Accounts for Lodging (USALI)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Profit Margin</span>
                <span className="text-lg font-mono font-black text-emerald-400">{reportData.netMarginPercentage}%</span>
              </div>
            </div>

            <div className="space-y-5 text-xs font-mono">
              {/* OPERATING REVENUES */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20 font-black text-cyan-400">
                  <span className="font-sans uppercase text-[11px]">1. Operating Revenue</span>
                  <span>ETB {reportData.revenue?.totalRevenue?.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-300">
                  {reportData.revenue?.roomStay?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.revenue?.foodAndBeverage?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.revenue?.banquetAndEvents?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* COST OF GOODS SOLD */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 font-black text-amber-400">
                  <span className="font-sans uppercase text-[11px]">2. Cost of Goods Sold (COGS)</span>
                  <span>ETB {reportData.cogs?.totalCOGS?.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-300">
                  {reportData.cogs?.foodIngredients?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.cogs?.beverageStock?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* GROSS PROFIT */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center font-black text-sm text-slate-100">
                <span className="font-sans uppercase text-xs">Gross Profit (Margin: {reportData.grossMarginPercentage}%)</span>
                <span className="text-emerald-400">ETB {reportData.grossProfit?.toLocaleString()}</span>
              </div>

              {/* OPERATING EXPENSES */}
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 font-black text-rose-400">
                  <span className="font-sans uppercase text-[11px]">3. Operating Expenses</span>
                  <span>ETB {reportData.operatingExpenses?.totalOperatingExpenses?.toLocaleString()}</span>
                </div>
                <div className="pl-4 space-y-1 text-slate-300">
                  {reportData.operatingExpenses?.payrollAndBenefits?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.operatingExpenses?.utilities?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.operatingExpenses?.housekeepingAndLaundry?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                  {reportData.operatingExpenses?.cashOverAndShort?.map((i: any) => (
                    <div key={i.code} className="flex justify-between py-1 text-amber-300">
                      <span className="font-sans">{i.name}</span>
                      <span>{i.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* NET INCOME (PROFIT / LOSS) */}
              <div className="p-4 bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/40 rounded-2xl flex justify-between items-center font-black text-base text-emerald-400 shadow-xl shadow-emerald-500/5">
                <span className="font-sans uppercase text-sm">Net Operating Profit / (Loss)</span>
                <span className="text-xl">ETB {reportData.netIncome?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        ) : selectedReport === 'tax-summary' ? (
          /* ======================================================== */
          /* 4. ETHIOPIAN TAX SUMMARY (MINISTRY OF REVENUES - MoR)    */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">Ethiopian Tax Authority (MoR) Filing Summary</h2>
                <p className="text-xs text-slate-400">
                  Value Added Tax (15%), Withholding Tax (2%), Service Charge (10%), POESSA Pension (18%)
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Remittance Due</span>
                <span className="text-xl font-mono font-black text-amber-400">
                  ETB {reportData.totalStatutoryRemittanceDue?.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* VAT RECONCILIATION */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-200 uppercase text-[11px]">Value Added Tax (VAT 15%)</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400">
                    Proclamation 285/2002
                  </span>
                </div>
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">Gross Output VAT Collected (2100):</span>
                    <span className="font-bold text-slate-100">ETB {reportData.vat?.outputVatCollected?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">Less: Input VAT Deductible Paid (1150):</span>
                    <span className="font-bold text-emerald-400">-ETB {reportData.vat?.inputVatDeductible?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-cyan-400">
                    <span className="font-sans">Net VAT Payable to MoR:</span>
                    <span>ETB {reportData.vat?.netVatPayableToMoR?.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* WITHHOLDING & SERVICE CHARGE */}
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="font-bold text-slate-200 uppercase text-[11px]">Withholding & Service Charge</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400">
                    Direct Statutory
                  </span>
                </div>
                <div className="space-y-2 font-mono">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">2% Withholding Tax on Purchases (2120):</span>
                    <span className="font-bold text-amber-400">ETB {reportData.withholdingTax?.withholdingTaxRemittanceDue?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">10% Hospitality Service Charge (2110):</span>
                    <span className="font-bold text-slate-100">ETB {reportData.serviceCharge?.serviceChargeCollected?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">Employee Personal Income Tax Withheld (2130):</span>
                    <span className="font-bold text-slate-100">ETB {reportData.payrollTaxes?.personalIncomeTaxWithheld?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="font-sans">POESSA Pension Fund 18% (2140):</span>
                    <span className="font-bold text-slate-100">ETB {reportData.payrollTaxes?.pensionContributionsPayable?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 5. GENERAL LEDGER ACCOUNT AUDIT VIEW                      */
          /* ======================================================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-100">Itemized General Ledger Audit Trail</h2>
                <p className="text-xs text-slate-400">Chronological transaction logs with running balances</p>
              </div>
            </div>

            <div className="space-y-6">
              {reportData.accounts?.map((acc: any) => (
                <div key={acc.code} className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{acc.code}</span>
                      <span className="font-bold text-slate-200">{acc.name}</span>
                      <span className="text-[10px] text-slate-400">({acc.type})</span>
                    </div>
                    <div className="font-mono text-xs text-slate-300">
                      Closing: <span className="font-bold text-slate-100">ETB {acc.closingBalance?.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="text-slate-500 text-[10px] uppercase border-b border-slate-900">
                          <th className="py-1.5 px-2">Date</th>
                          <th className="py-1.5 px-2">Entry #</th>
                          <th className="py-1.5 px-2 font-sans">Description</th>
                          <th className="py-1.5 px-2 text-right">Debit</th>
                          <th className="py-1.5 px-2 text-right">Credit</th>
                          <th className="py-1.5 px-2 text-right">Running</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {acc.transactions?.map((tx: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="py-1.5 px-2 text-slate-400">{tx.date}</td>
                            <td className="py-1.5 px-2 text-amber-400">{tx.entryNumber}</td>
                            <td className="py-1.5 px-2 font-sans text-slate-200">{tx.description}</td>
                            <td className="py-1.5 px-2 text-right text-emerald-400">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td>
                            <td className="py-1.5 px-2 text-right text-amber-400">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                            <td className="py-1.5 px-2 text-right font-bold text-slate-100">{tx.runningBalance?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
