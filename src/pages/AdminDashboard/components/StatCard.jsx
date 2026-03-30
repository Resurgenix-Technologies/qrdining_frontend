import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export default function StatCard({ icon: Icon, label, value, sub, gradient, textColor = 'text-white' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden p-5 border border-white/10 ${gradient}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <ArrowUpRight className="w-4 h-4 text-white/20" />
      </div>
      <p className={`text-2xl sm:text-3xl font-black tracking-tight ${textColor}`}>{value}</p>
      <p className="text-[10px] font-bold tracking-widest uppercase text-white/50 mt-1">{label}</p>
      {sub && <p className="text-[9px] text-white/30 mt-0.5">{sub}</p>}
    </motion.div>
  );
}
