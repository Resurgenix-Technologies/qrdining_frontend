import React from 'react';
import { RefreshCw, Activity, Zap } from 'lucide-react';

export default function EarningsTab({
  earningsOverview,
  loadData,
  handleQuickSend,
  actionLoading
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">Daily Earnings Overview</h2>
          <p className="text-[10px] text-white/30 mt-0.5">Today &amp; yesterday revenue per restaurant — send payouts instantly</p>
        </div>
        <button onClick={loadData} className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border border-white/15 text-white/40 hover:bg-white hover:text-black hover:border-white transition">
          <RefreshCw className="w-3 h-3" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {earningsOverview.length === 0 ? (
          <div className="bg-[#111] border border-white/10 rounded-xl py-16 text-center">
            <Activity className="w-8 h-8 mx-auto mb-3 text-white/20" />
            <p className="text-white/30 text-sm font-bold">No active restaurants</p>
          </div>
        ) : earningsOverview.map(r => (
          <div key={r._id} className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors">
            <div className="flex flex-col md:flex-row">
              {/* Restaurant info */}
              <div className="flex items-center gap-3 p-4 md:w-56 md:border-r border-white/10 flex-shrink-0">
                {r.logo ? (
                  <img src={r.logo} className="w-10 h-10 rounded-lg object-cover border border-white/10 flex-shrink-0" alt={r.name} />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-black text-xs">{r.name?.charAt(0)}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-white text-sm truncate">{r.name}</p>
                  <p className="text-[9px] text-white/30 mt-0.5">Active Restaurant</p>
                </div>
              </div>

              {/* Today */}
              <div className="flex-1 p-4 border-r border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Today</p>
                    <p className="text-[9px] text-white/25">{r.today.orders} orders</p>
                  </div>
                  {r.today.payout ? (
                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      r.today.payout.status === 'Paid'
                        ? 'bg-green-500/15 text-green-400 border-green-500/25'
                        : 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                    }`}>{r.today.payout.status}</span>
                  ) : r.today.amount > 0 ? (
                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Not Sent</span>
                  ) : null}
                </div>
                <p className="text-xl font-black text-white">₹{r.today.amount.toLocaleString()}</p>
                {r.today.amount > 0 && !r.today.payout && (
                  <button
                    onClick={() => handleQuickSend(r._id, r.today.amount, 'today')}
                    disabled={!!actionLoading[`qs_${r._id}_today`]}
                    className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-400 transition disabled:opacity-50"
                  >
                    {actionLoading[`qs_${r._id}_today`] ? (
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : <Zap className="w-3 h-3" />}
                    Send Now
                  </button>
                )}
              </div>

              {/* Yesterday */}
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Yesterday</p>
                    <p className="text-[9px] text-white/25">{r.yesterday.orders} orders</p>
                  </div>
                  {r.yesterday.payout ? (
                    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                      r.yesterday.payout.status === 'Paid'
                        ? 'bg-green-500/15 text-green-400 border-green-500/25'
                        : 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                    }`}>{r.yesterday.payout.status}</span>
                  ) : r.yesterday.amount > 0 ? (
                    <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">Not Sent</span>
                  ) : null}
                </div>
                <p className="text-xl font-black text-white/70">₹{r.yesterday.amount.toLocaleString()}</p>
                {r.yesterday.amount > 0 && !r.yesterday.payout && (
                  <button
                    onClick={() => handleQuickSend(r._id, r.yesterday.amount, 'yesterday')}
                    disabled={!!actionLoading[`qs_${r._id}_yesterday`]}
                    className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-400 transition disabled:opacity-50"
                  >
                    {actionLoading[`qs_${r._id}_yesterday`] ? (
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : <Zap className="w-3 h-3" />}
                    Send Overdue
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
