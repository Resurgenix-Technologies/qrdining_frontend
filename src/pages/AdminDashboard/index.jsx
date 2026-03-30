import { useState, useEffect } from 'react';
import { adminApi } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Store, ShoppingBag, Activity, Zap, RefreshCw, LogOut, Banknote, AlertCircle
} from 'lucide-react';

import StatCard from './components/StatCard';
import RestaurantsTab from './components/RestaurantsTab';
import EarningsTab from './components/EarningsTab';
import PayoutsTab from './components/PayoutsTab';
import PlansTab from './components/PlansTab';
import PayoutModal from './components/PayoutModal';

export default function AdminDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('restaurants');
  const [payouts, setPayouts] = useState([]);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [earningsOverview, setEarningsOverview] = useState([]);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutForm, setPayoutForm] = useState({ restaurantId: '', amount: '', method: 'Bank', type: 'Payout', status: 'Pending', notes: '', referenceId: '' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [adminData, restaurantData, payoutsData, earningsData, plansData, subsData] = await Promise.allSettled([
        adminApi.getDashboard(),
        adminApi.getRestaurants({ limit: 100 }),
        adminApi.getPayouts(),
        adminApi.getEarningsOverview(),
        adminApi.getPlans(),
        adminApi.getSubscriptions()
      ]);

      const restaurantsPayload = restaurantData.status === 'fulfilled' ? restaurantData.value : null;
      const dashboardPayload = adminData.status === 'fulfilled' ? adminData.value : null;
      const payoutsPayload = payoutsData.status === 'fulfilled' ? payoutsData.value : [];
      const earningsPayload = earningsData.status === 'fulfilled' ? earningsData.value : [];
      const plansPayload = plansData.status === 'fulfilled' ? plansData.value : [];
      const subsPayload = subsData.status === 'fulfilled' ? subsData.value : [];

      if (restaurantData.status !== 'fulfilled') {
        throw restaurantData.reason || new Error('Failed to load restaurants.');
      }

      setStats(dashboardPayload);
      setRestaurants(restaurantsPayload?.restaurants || []);
      setPayouts(Array.isArray(payoutsPayload) ? payoutsPayload : []);
      setEarningsOverview(Array.isArray(earningsPayload) ? earningsPayload : []);
      setPlans(Array.isArray(plansPayload) ? plansPayload : []);
      setSubscriptions(Array.isArray(subsPayload) ? subsPayload : []);

      if (adminData.status !== 'fulfilled' || payoutsData.status !== 'fulfilled' || earningsData.status !== 'fulfilled') {
        setError('Some dashboard panels could not be loaded, but restaurant data is available.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleToggle = async (id) => {
    setActionLoading(prev => ({ ...prev, [id]: 'toggle' }));
    try {
      const result = await adminApi.toggleRestaurant(id);
      setRestaurants(prev => prev.map(r => r._id === id ? { ...r, isActive: result.isActive } : r));
    } catch (err) { alert(err.message); }
    finally { setActionLoading(prev => ({ ...prev, [id]: null })); }
  };

  const handleResetPassword = async (id) => {
    if (!confirm('Reset this restaurant\'s owner password?')) return;
    setActionLoading(prev => ({ ...prev, [id]: 'password' }));
    try {
      const result = await adminApi.resetPassword(id);
      alert(`New temporary password: ${result.newPassword}\n\nShare this securely.`);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(prev => ({ ...prev, [id]: null })); }
  };

  const handleCreatePayout = async (e) => {
    e.preventDefault();
    setActionLoading(prev => ({ ...prev, payoutCreate: true }));
    try {
      const p = await adminApi.createPayout({ ...payoutForm, amount: parseFloat(payoutForm.amount) });
      setPayouts(prev => [p, ...prev]);
      setShowPayoutModal(false);
      setPayoutForm({ restaurantId: '', amount: '', method: 'Bank', type: 'Payout', status: 'Pending', notes: '', referenceId: '' });
    } catch (err) { alert(err.message); }
    finally { setActionLoading(prev => ({ ...prev, payoutCreate: false })); }
  };

  const handleUpdatePayoutStatus = async (id, status) => {
    try {
      const p = await adminApi.updatePayout(id, { status });
      setPayouts(prev => prev.map(x => x._id === id ? p : x));
    } catch (err) { alert(err.message); }
  };

  const handleDeletePayout = async (id) => {
    if (!confirm('Delete this payout record?')) return;
    try {
      await adminApi.deletePayout(id);
      setPayouts(prev => prev.filter(x => x._id !== id));
    } catch (err) { alert(err.message); }
  };

  const handleQuickSend = async (restaurantId, amount, day) => {
    if (!confirm(`Send ₹${amount.toLocaleString()} to this restaurant for ${day}'s earnings?`)) return;
    setActionLoading(prev => ({ ...prev, [`qs_${restaurantId}_${day}`]: true }));
    try {
      const p = await adminApi.quickSendPayout({ restaurantId, amount, day });
      setPayouts(prev => [p, ...prev]);
      // Refresh earnings overview
      const updated = await adminApi.getEarningsOverview().catch(() => earningsOverview);
      setEarningsOverview(updated || []);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(prev => ({ ...prev, [`qs_${restaurantId}_${day}`]: false })); }
  };

  const handleLogout = async () => { await logout(); navigate('/admin-login'); };

  const filtered = restaurants.filter(r => {
    const matchSearch = r.name?.toLowerCase().includes(search.toLowerCase()) ||
                        r.email?.toLowerCase().includes(search.toLowerCase()) ||
                        r.slug?.toLowerCase().includes(search.toLowerCase());
    const matchActive = filterActive === 'all' || (filterActive === 'active' ? r.isActive : !r.isActive);
    return matchSearch && matchActive;
  });

  const activeCount = restaurants.filter(r => r.isActive).length;
  const inactiveCount = restaurants.length - activeCount;
  const totalPayoutAmount = payouts.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const pendingPayoutAmount = payouts.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);

  if (loading) return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="w-12 h-12 border-2 border-white/10 rounded-full" />
          <div className="absolute inset-0 w-12 h-12 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-bold tracking-widest uppercase text-white/30">Loading Platform...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white">

      {/* ─── HEADER ─── */}
      <header className="sticky top-0 z-40 bg-[#080808]/95 backdrop-blur-md border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg shadow-white/10">
              <span className="text-black font-black text-xs">QD</span>
            </div>
            <div>
              <span className="font-black text-white text-sm tracking-tight">Platform Admin</span>
              <p className="text-[9px] text-white/30 tracking-widest uppercase hidden sm:block">Super Console</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="hidden md:flex bg-white/5 border border-white/10 p-1 rounded-xl gap-1">
            {[
              { id: 'restaurants', icon: Store, label: 'Restaurants' },
              { id: 'payouts', icon: Banknote, label: 'Payouts' },
              { id: 'earnings', icon: Activity, label: 'Earnings' },
              { id: 'plans', icon: Zap, label: 'Plans' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-[10px] font-bold tracking-widest uppercase transition rounded-lg ${
                  activeTab === tab.id ? 'bg-white text-black shadow-sm' : 'text-white/50 hover:text-white'
                }`}
              >
                <tab.icon className="w-3 h-3" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1.5 rounded-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live
            </div>
            <button onClick={loadData} className="p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest uppercase px-3 py-2 rounded-lg border border-white/15 text-white/50 hover:bg-white hover:text-black hover:border-white transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {error && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 text-sm rounded-xl">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* ─── HERO STATS ─── */}
        <div>
          <div className="mb-4">
            <h1 className="text-2xl font-black text-white tracking-tight">Platform Overview</h1>
            <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">Real-time network monitoring</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              icon={Store} label="Total Restaurants" value={restaurants.length}
              sub={`${activeCount} active · ${inactiveCount} inactive`}
              gradient="bg-gradient-to-br from-[#1a1a2e] to-[#111]"
            />
            <StatCard
              icon={Activity} label="Active Tenants" value={activeCount}
              gradient="bg-gradient-to-br from-green-900/40 to-[#111]" textColor="text-green-400"
            />
            <StatCard
              icon={ShoppingBag} label="Today's Orders" value={stats?.orderStats?.today ?? '—'}
              gradient="bg-gradient-to-br from-blue-900/40 to-[#111]" textColor="text-blue-400"
            />
            <StatCard
              icon={Zap} label="Active Subscriptions" value={stats?.activeSubscriptions ?? '—'}
              gradient="bg-gradient-to-br from-purple-900/40 to-[#111]" textColor="text-purple-400"
            />
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        {activeTab === 'restaurants' && (
          <RestaurantsTab 
            restaurants={restaurants}
            stats={stats}
            search={search}
            setSearch={setSearch}
            filterActive={filterActive}
            setFilterActive={setFilterActive}
            filtered={filtered}
            activeCount={activeCount}
            inactiveCount={inactiveCount}
            handleToggle={handleToggle}
            handleResetPassword={handleResetPassword}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'earnings' && (
          <EarningsTab 
            earningsOverview={earningsOverview}
            loadData={loadData}
            handleQuickSend={handleQuickSend}
            actionLoading={actionLoading}
          />
        )}

        {activeTab === 'payouts' && (
          <PayoutsTab 
            payouts={payouts}
            totalPayoutAmount={totalPayoutAmount}
            pendingPayoutAmount={pendingPayoutAmount}
            setShowPayoutModal={setShowPayoutModal}
            handleUpdatePayoutStatus={handleUpdatePayoutStatus}
            handleDeletePayout={handleDeletePayout}
          />
        )}

        {activeTab === 'plans' && (
          <PlansTab
            plans={plans}
            setPlans={setPlans}
            subscriptions={subscriptions}
            restaurants={restaurants}
            actionLoading={actionLoading}
          />
        )}

      </main>

      <PayoutModal 
        showPayoutModal={showPayoutModal}
        setShowPayoutModal={setShowPayoutModal}
        restaurants={restaurants}
        payoutForm={payoutForm}
        setPayoutForm={setPayoutForm}
        handleCreatePayout={handleCreatePayout}
        actionLoading={actionLoading}
      />
    </div>
  );
}
