import React from 'react';
import { Plus, Trash2, Banknote } from 'lucide-react';

export default function PayoutsTab({
  payouts,
  totalPayoutAmount,
  pendingPayoutAmount,
  setShowPayoutModal,
  handleUpdatePayoutStatus,
  handleDeletePayout
}) {
  return (
    <div className="space-y-6">
      {/* Payouts Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-white">Financial Payouts</h2>
          <p className="text-[10px] text-white/30 mt-0.5">{payouts.length} recorded transfers globally</p>
        </div>
        <button
          onClick={() => setShowPayoutModal(true)}
          className="flex items-center gap-2 bg-white text-black px-4 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-100 transition shadow-lg shadow-white/10"
        >
          <Plus className="w-3.5 h-3.5" /> Log Payout
        </button>
      </div>

      {/* Payout Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#111] border border-white/10 rounded-xl p-4">
          <p className="text-[9px] font-bold tracking-widest uppercase text-white/40 mb-1">Total Disbursed</p>
          <p className="text-xl font-black text-green-400">₹{totalPayoutAmount.toLocaleString()}</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-xl p-4">
          <p className="text-[9px] font-bold tracking-widest uppercase text-white/40 mb-1">Pending Amount</p>
          <p className="text-xl font-black text-orange-400">₹{pendingPayoutAmount.toLocaleString()}</p>
        </div>
        <div className="bg-[#111] border border-white/10 rounded-xl p-4">
          <p className="text-[9px] font-bold tracking-widest uppercase text-white/40 mb-1">Total Entries</p>
          <p className="text-xl font-black text-white">{payouts.length}</p>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="text-[9px] font-bold tracking-widest uppercase text-white/30 border-b border-white/8 bg-white/[0.02]">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Restaurant</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Method</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payouts.map((p) => (
                <tr key={p._id} className="hover:bg-white/[0.025] transition group">
                  <td className="px-5 py-3.5 text-white/40 font-mono text-[10px]">
                    {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-black text-[9px]">{(p.restaurantId?.name || '?').charAt(0)}</span>
                      </div>
                      <span className="font-bold text-white text-[11px]">{p.restaurantId?.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-black text-sm">₹{p.amount.toLocaleString()}</td>
                  <td className="px-5 py-3.5 text-white/50 text-[10px]">{p.type}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                      p.status === 'Paid'
                        ? 'bg-green-500/15 text-green-400 border-green-500/25'
                        : 'bg-orange-500/15 text-orange-400 border-orange-500/25'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[9px] text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                      {p.status === 'Pending' && (
                        <button
                          onClick={() => handleUpdatePayoutStatus(p._id, 'Paid')}
                          className="text-[9px] font-bold uppercase tracking-widest text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 px-2 py-1 rounded transition"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => handleDeletePayout(p._id)}
                        className="p-1.5 text-red-500/60 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {payouts.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center text-white/25 text-xs font-bold uppercase tracking-widest">
                    <Banknote className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    No payouts recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
