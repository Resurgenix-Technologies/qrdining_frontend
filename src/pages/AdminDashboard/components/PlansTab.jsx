import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Trash2, Edit, CheckCircle, XCircle, Search, 
  CreditCard, Loader, Shield
} from 'lucide-react';
import { adminApi } from '../../../utils/api';

export default function PlansTab({ plans, setPlans, subscriptions, restaurants, actionLoading }) {
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({
    name: '',
    price: '',
    originalPrice: '',
    billingCycle: 'monthly',
    maxOrders: '-1',
    features: '',
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats
  const activeSubsCount = subscriptions.filter(s => s.status === 'active').length;

  const handleOpenModal = (plan = null) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name,
        price: plan.price.toString(),
        originalPrice: (plan.originalPrice || '').toString(),
        billingCycle: plan.billingCycle,
        maxOrders: plan.maxOrders.toString(),
        features: plan.features.join('\n'), // Convert array to newline string
        isActive: plan.isActive,
      });
    } else {
      setEditingPlan(null);
      setPlanForm({
        name: '', price: '', originalPrice: '', billingCycle: 'monthly', maxOrders: '-1', features: '', isActive: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const featureArray = planForm.features.split('\n').map(s => s.trim()).filter(Boolean);
      const payload = {
        ...planForm,
        price: parseFloat(planForm.price),
        originalPrice: planForm.originalPrice ? parseFloat(planForm.originalPrice) : undefined,
        maxOrders: parseInt(planForm.maxOrders, 10),
        features: featureArray
      };

      if (editingPlan) {
        const updated = await adminApi.updatePlan(editingPlan._id, payload);
        setPlans(plans.map(p => p._id === updated._id ? updated : p));
      } else {
        const created = await adminApi.createPlan(payload);
        setPlans([...plans, created]);
      }
      setShowModal(false);
    } catch (err) {
      alert(err.message || 'Failed to save plan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const updated = await adminApi.togglePlan(id);
      setPlans(plans.map(p => p._id === updated._id ? updated : p));
    } catch (err) { alert(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this plan? This does not affect existing subscriptions on this plan, but hides it from new owners.')) return;
    try {
      await adminApi.deletePlan(id);
      setPlans(plans.filter(p => p._id !== id));
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5" /> Subscription Plans
          </h2>
          <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">
            Manage plans & pricing
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-200 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan._id} className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col relative group">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`inline-flex mb-2 items-center gap-1.5 px-2 py-0.5 rounded-sm text-[8px] font-black tracking-widest uppercase ${plan.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                   {plan.isActive ? 'Active Plan' : 'Inactive'}
                </span>
                <h3 className="text-lg font-black text-white leading-tight">{plan.name}</h3>
                <p className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5">
                  {plan.billingCycle}
                </p>
              </div>
              <div className="text-right">
                {plan.originalPrice && (
                  <div className="text-[10px] text-white/30 line-through font-bold">₹{plan.originalPrice}</div>
                )}
                <span className="text-2xl font-black tracking-tighter text-white">₹{plan.price}</span>
              </div>
            </div>

            <div className="space-y-2 flex-grow">
              <p className="text-[11px] text-white/70 font-semibold mb-3">
                 <strong className="text-white/40 font-bold uppercase tracking-widest text-[9px]">Limit:</strong> {plan.maxOrders === -1 ? 'Unlimited' : plan.maxOrders.toLocaleString()} orders/mo
              </p>
              <div className="space-y-1.5">
                {plan.features.slice(0, 4).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-white/60">
                    <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    {f}
                  </div>
                ))}
                {plan.features.length > 4 && (
                   <p className="text-[10px] text-white/40 pl-5">+{plan.features.length - 4} more</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-white/10 opacity-0 group-hover:opacity-100 transition duration-300">
               <button onClick={() => handleToggle(plan._id)} className="flex-1 py-2 bg-white/5 text-white/60 hover:text-white hover:bg-white/10 text-[9px] font-bold uppercase tracking-widest rounded transition">
                  {plan.isActive ? 'Disable' : 'Enable'}
               </button>
               <button onClick={() => handleOpenModal(plan)} className="flex-1 py-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 text-[9px] font-bold uppercase tracking-widest rounded transition">
                 Edit
               </button>
               <button onClick={() => handleDelete(plan._id)} className="py-2 px-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded transition">
                 <Trash2 className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
         <div className="text-center py-12 bg-white/5 border border-white/10 border-dashed rounded-xl">
            <Package className="w-8 h-8 text-white/20 mx-auto mb-3" />
            <p className="text-sm font-bold text-white/40">No plans created yet</p>
         </div>
      )}

      {/* CREATE/EDIT MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#111] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-5 border-b border-white/10 flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-white/40 hover:text-white">
                   <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5">
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-white/50">Plan Name</label>
                      <input type="text" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="e.g. Pro Plan" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <label className="text-[9px] font-bold uppercase tracking-widest text-white/50">Current Price (₹)</label>
                         <input type="number" value={planForm.price} onChange={e => setPlanForm({...planForm, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" required />
                       </div>
                       <div className="space-y-1">
                         <label className="text-[9px] font-bold uppercase tracking-widest text-white/50">Original Price / MRP (₹)</label>
                         <input type="number" value={planForm.originalPrice} onChange={e => setPlanForm({...planForm, originalPrice: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" placeholder="Optional" />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                         <label className="text-[9px] font-bold uppercase tracking-widest text-white/50">Billing Cycle</label>
                         <select value={planForm.billingCycle} onChange={e => setPlanForm({...planForm, billingCycle: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none appearance-none">
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                         </select>
                       </div>
                       <div className="space-y-1">
                         <label className="text-[9px] font-bold uppercase tracking-widest text-white/50">Max Orders (-1 for UNLIMITED)</label>
                         <input type="number" value={planForm.maxOrders} onChange={e => setPlanForm({...planForm, maxOrders: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" required />
                       </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-white/50">Features (One per line)</label>
                      <textarea value={planForm.features} onChange={e => setPlanForm({...planForm, features: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500 outline-none min-h-[100px]" placeholder="Unlimited orders&#10;Premium Support&#10;Custom QR" />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                       <input type="checkbox" id="isActive" checked={planForm.isActive} onChange={e => setPlanForm({...planForm, isActive: e.target.checked})} className="accent-emerald-500" />
                       <label htmlFor="isActive" className="text-xs font-bold text-white/80 select-none">Make this plan active</label>
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-white/5 text-white/60 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition">
                        Cancel
                      </button>
                      <button type="submit" disabled={isSubmitting} className="flex-1 py-2.5 bg-emerald-500 text-black hover:bg-emerald-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition flex justify-center items-center gap-2">
                        {isSubmitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                        {editingPlan ? 'Save Changes' : 'Create Plan'}
                      </button>
                    </div>
                 </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
