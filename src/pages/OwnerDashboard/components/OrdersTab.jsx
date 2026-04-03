import React from 'react';
import { Menu, ShoppingBag, ArrowRight } from 'lucide-react';

export default function OrdersTab({
  filteredOrders,
  isAcceptingOrders,
  actionLoading,
  dateFilter,
  customDate,
  filterStatus,
  STATUS_CONFIG,
  setIsSidebarOpen,
  toggleAcceptingOrders,
  setDateFilter,
  setCustomDate,
  setFilterStatus,
  handleOrderAction
}) {
  const statusFilters = [
    { value: 'all', label: 'all' },
    { value: 'preparing', label: 'preparing' },
    { value: 'done_pending_verification', label: 'done pending verification' },
    { value: 'completed', label: 'completed' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-black text-white rounded-lg flex-shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Orders</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Real-time Transaction Loop</p>
              <span className="text-gray-300">•</span>
              <button
                onClick={toggleAcceptingOrders}
                disabled={actionLoading}
                className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded transition ${isAcceptingOrders
                    ? 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'
                    : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                  }`}
              >
                {isAcceptingOrders ? '● ACCEPTING ORDERS' : '○ STATUS: CLOSED'}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-white border border-border rounded-lg shadow-sm p-1 w-full sm:w-auto">
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                if (e.target.value !== 'custom') setCustomDate('');
              }}
              className="text-[10px] font-bold uppercase outline-none px-2 py-1.5 bg-transparent cursor-pointer text-gray-700 w-full sm:w-auto"
            >
              <option value="today">Today's Orders</option>
              <option value="yesterday">Yesterday's Orders</option>
              <option value="custom">Selected Day</option>
            </select>
            {dateFilter === 'custom' && (
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="text-[10px] font-bold uppercase outline-none border-l border-border pl-2 py-1.5 bg-transparent text-gray-700 w-full sm:w-32"
              />
            )}
          </div>
          <div className="flex bg-white border border-border rounded-lg shadow-sm p-0.5 overflow-x-auto w-full sm:w-auto hide-scrollbar">
            {statusFilters.map(({ value, label }) => (
              <button key={value} onClick={() => setFilterStatus(value)} className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition rounded flex-1 sm:flex-none whitespace-nowrap ${filterStatus === value ? 'bg-black text-white shadow' : 'hover:bg-gray-50 text-gray-400'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {filteredOrders.length === 0 && (
          <div className="col-span-full py-20 text-center border border-dashed border-gray-200 rounded-xl bg-white">
            <ShoppingBag className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No active orders</p>
          </div>
        )}
        {filteredOrders.map(order => {
          const status = order.orderStatus || 'preparing';
          const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.preparing;
          const actionLabel = status === 'preparing'
            ? 'Done'
            : status === 'done_pending_verification'
              ? 'Verify PIN'
              : '';
          return (
            <div key={order._id} className="bg-white border border-border rounded-xl p-4 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-[5px] h-full ${cfg.badge.split(' ')[0]}`} />
              <div className="flex justify-between items-start mb-4 pl-1 w-full gap-2">
                <div className="flex gap-3 overflow-hidden flex-1">
                  <div className={`w-11 h-11 shrink-0 flex items-center justify-center text-xl font-black rounded-[12px] ${cfg.badge}`}>
                    {order.tableNumber}
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-[8px] font-black uppercase tracking-[0.15em] text-gray-400 truncate">
                      #{order.orderIdString || (order._id || '').slice(-4).toUpperCase()}
                    </p>
                    <p className="font-bold text-base text-gray-950 truncate mt-0.5">
                      {order.customerName}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-black tracking-tighter text-gray-950 leading-none">₹{order.totalAmount?.toFixed(0)}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4 pb-4 border-b border-gray-100 pl-1">
                {order.items?.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs font-semibold text-gray-700">
                    <span className="w-5 h-5 bg-gray-50 text-gray-500 font-bold flex items-center justify-center text-[10px] rounded shrink-0">
                      {item.quantity}
                    </span>
                    <span className="leading-tight pt-0.5 break-words">
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>

              {actionLabel && (
                <button onClick={() => handleOrderAction(order)} disabled={actionLoading} className="w-full bg-black text-white h-[42px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-800 transition flex items-center justify-center gap-2 rounded-[14px] disabled:opacity-60">
                  {actionLabel} <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
