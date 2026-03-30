import React from 'react';
import { Search, Store } from 'lucide-react';
import RestaurantCard from './RestaurantCard';

export default function RestaurantsTab({
  restaurants,
  stats,
  search,
  setSearch,
  filterActive,
  setFilterActive,
  filtered,
  activeCount,
  inactiveCount,
  handleToggle,
  handleResetPassword,
  actionLoading
}) {
  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-white">All Restaurants</h2>
          <p className="text-[10px] text-white/30 mt-0.5">{filtered.length} of {restaurants.length} shown</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full sm:w-52 bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-white/25 outline-none focus:border-white/30 transition"
            />
          </div>
          <div className="flex gap-1">
            {['all', 'active', 'inactive'].map(f => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border transition ${
                  filterActive === f ? 'bg-white text-black border-white' : 'border-white/15 text-white/40 hover:border-white/30'
                }`}
              >
                {f === 'all' ? `All (${restaurants.length})` : f === 'active' ? `Active (${activeCount})` : `Off (${inactiveCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="border border-white/10 rounded-xl text-center py-20 bg-white/[0.02]">
          <Store className="w-12 h-12 mx-auto mb-4 text-white/15" />
          <p className="font-bold text-white/30 text-sm">
            {search || filterActive !== 'all' ? 'No restaurants match your filter' : 'No restaurants registered yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r, i) => (
            <RestaurantCard key={r._id} r={r} index={i} onToggle={handleToggle} onReset={handleResetPassword} loading={actionLoading} />
          ))}
        </div>
      )}

      {/* Footer summary */}
      <div className="border-t border-white/8 pt-4 flex flex-wrap gap-6 text-[9px] font-bold tracking-widest uppercase text-white/20">
        <span>{restaurants.length} Restaurants</span>
        <span>{activeCount} Active</span>
        <span>{inactiveCount} Inactive</span>
        {stats?.orderStats?.total && <span>{stats.orderStats.total} Total Orders</span>}
      </div>
    </div>
  );
}
