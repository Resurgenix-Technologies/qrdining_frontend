import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Globe, Key, ToggleLeft, ToggleRight } from 'lucide-react';

export default function RestaurantCard({ r, onToggle, onReset, loading, index }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-colors"
    >
      {/* Main row */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {r.logo ? (
            <img src={r.logo} alt={r.name} className="w-12 h-12 rounded-lg object-cover border border-white/10" />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center">
              <span className="text-white font-black text-base">{r.name?.charAt(0)}</span>
            </div>
          )}
          <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[#111] ${r.isActive ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-bold text-white text-sm truncate">{r.name}</h3>
          </div>
          <p className="text-[10px] text-white/40 truncate">{r.email}</p>
          <p className="text-[9px] text-white/25 mt-0.5">/{r.slug} {r.city ? `· ${r.city}` : ''}</p>
        </div>

        {/* Metrics */}
        <div className="hidden md:flex items-center gap-5 flex-shrink-0">
          <div className="text-center">
            <p className="text-sm font-black text-white">{r.totalOrders || 0}</p>
            <p className="text-[8px] text-white/30 uppercase tracking-widest">Orders</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-sm font-black text-green-400">₹{((r.totalRevenue || 0) / 1000).toFixed(1)}k</p>
            <p className="text-[8px] text-white/30 uppercase tracking-widest">Revenue</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <span className={`text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full ${r.isActive ? 'bg-green-500/15 text-green-400 border border-green-500/25' : 'bg-red-500/15 text-red-400 border border-red-500/25'}`}>
            {r.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        <ChevronDown className={`w-4 h-4 text-white/30 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div className="p-4 bg-white/[0.02]">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Total Orders', value: r.totalOrders || 0, color: 'text-blue-400' },
                  { label: 'Revenue', value: `₹${(r.totalRevenue || 0).toLocaleString()}`, color: 'text-green-400' },
                  { label: 'City', value: r.city || '—', color: 'text-white' },
                  { label: 'Phone', value: r.phone || '—', color: 'text-white' },
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/8 rounded-lg p-3">
                    <p className="text-white/30 text-[9px] uppercase tracking-widest mb-1">{item.label}</p>
                    <p className={`${item.color} font-bold text-sm`}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(r._id); }}
                  disabled={!!loading[r._id]}
                  className={`flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border transition disabled:opacity-40 ${
                    r.isActive
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500'
                      : 'border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white hover:border-green-500'
                  }`}
                >
                  {loading[r._id] === 'toggle' ? (
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : r.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                  {r.isActive ? 'Deactivate' : 'Activate'}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onReset(r._id); }}
                  disabled={!!loading[r._id]}
                  className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border border-white/15 text-white/50 hover:bg-white hover:text-black hover:border-white transition disabled:opacity-40"
                >
                  {loading[r._id] === 'password' ? (
                    <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : <Key className="w-3.5 h-3.5" />}
                  Reset Password
                </button>

                <a
                  href={`/menu/${r.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border border-white/15 text-white/50 hover:bg-white hover:text-black hover:border-white transition"
                >
                  <Globe className="w-3.5 h-3.5" /> View Menu
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
