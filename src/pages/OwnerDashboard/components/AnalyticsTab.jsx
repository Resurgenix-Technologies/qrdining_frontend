import React from 'react';
import { Menu, BarChart3, TrendingUp } from 'lucide-react';

export default function AnalyticsTab({
  monthRevenue,
  totalOrdersCount,
  averageOrderValue,
  setIsSidebarOpen
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-black text-white rounded-lg flex-shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Metrics</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-black text-white p-6 relative overflow-hidden rounded-xl">
          <BarChart3 size={100} className="absolute -right-6 -bottom-6 opacity-10 rotate-12" />
          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400 mb-1">Gross Intake</p>
          <div className="text-3xl font-black tracking-tight mb-2">₹{(monthRevenue || 0).toFixed(0)}</div>
          <div className="text-[9px] font-bold text-green-400 flex items-center gap-1"><TrendingUp size={10} /> +22.4%</div>
        </div>
        <div className="bg-white border border-border p-6 rounded-xl">
          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">Throughput</p>
          <div className="text-3xl font-black tracking-tight text-blue-600">{totalOrdersCount || 0}</div>
          <p className="text-[8px] font-bold uppercase text-gray-400 mt-2">Resolved Units</p>
        </div>
        <div className="bg-white border border-border p-6 rounded-xl">
          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">Processing</p>
          <div className="text-3xl font-black tracking-tight text-amber-500">₹{(averageOrderValue || 0).toFixed(0)}</div>
          <p className="text-[8px] font-bold uppercase text-gray-400 mt-2">Avg Order Value</p>
        </div>
      </div>
    </div>
  );
}
