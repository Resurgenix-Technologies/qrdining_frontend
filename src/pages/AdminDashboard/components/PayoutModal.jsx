import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function PayoutModal({
  showPayoutModal,
  setShowPayoutModal,
  restaurants,
  payoutForm,
  setPayoutForm,
  handleCreatePayout,
  actionLoading
}) {
  return (
    <AnimatePresence>
      {showPayoutModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)} />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="relative bg-[#111] border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-black text-white tracking-tight">Log New Payout</h3>
                <p className="text-[10px] text-white/30 mt-0.5 tracking-widest uppercase">Record a financial transfer</p>
              </div>
              <button onClick={() => setShowPayoutModal(false)} className="p-2 text-white/30 hover:text-white hover:bg-white/5 rounded-lg transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePayout} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Restaurant</label>
                <select required value={payoutForm.restaurantId} onChange={e => setPayoutForm({...payoutForm, restaurantId: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition"
                >
                  <option value="">Select Restaurant</option>
                  {restaurants.map(r => <option key={r._id} value={r._id}>{r.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Amount (₹)</label>
                  <input required type="number" min="1" value={payoutForm.amount} onChange={e => setPayoutForm({...payoutForm, amount: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Status</label>
                  <select value={payoutForm.status} onChange={e => setPayoutForm({...payoutForm, status: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Type</label>
                  <select value={payoutForm.type} onChange={e => setPayoutForm({...payoutForm, type: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition"
                  >
                    <option value="Payout">Payout</option>
                    <option value="Salary">Salary</option>
                    <option value="Bonus">Bonus</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Method</label>
                  <select value={payoutForm.method} onChange={e => setPayoutForm({...payoutForm, method: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition"
                  >
                    <option value="Bank">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Reference ID (optional)</label>
                <input type="text" value={payoutForm.referenceId} onChange={e => setPayoutForm({...payoutForm, referenceId: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition"
                  placeholder="e.g. UTR12345..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold tracking-widest uppercase text-white/40">Notes (optional)</label>
                <textarea value={payoutForm.notes} onChange={e => setPayoutForm({...payoutForm, notes: e.target.value})} rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-lg text-white text-xs px-3 py-2.5 outline-none focus:border-white/30 transition resize-none"
                  placeholder="Internal memo..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowPayoutModal(false)} className="text-[10px] uppercase font-bold text-white/30 hover:text-white transition px-4 py-2 rounded-lg hover:bg-white/5">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading.payoutCreate}
                  className="bg-white text-black px-6 py-2 text-[10px] font-black tracking-widest uppercase rounded-lg hover:bg-gray-100 transition disabled:opacity-50 shadow-lg"
                >
                  {actionLoading.payoutCreate ? 'Saving...' : 'Log Payout'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
