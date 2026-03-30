import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, CheckCircle, XCircle, Clock, AlertTriangle, Zap, Star,
  RefreshCw, Ban, ChevronRight, Shield, ArrowUpRight, Loader, X,
  Sparkles, Calendar, Package, ArrowLeft
} from 'lucide-react';
import { subscriptionApi } from '../../../utils/api';

// ─── Helpers ────────────────────────────────────────────────────────────────
const getDaysRemaining = (endDate) => {
  if (!endDate) return 0;
  const end = new Date(endDate);
  const now = new Date();
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
};

const getTotalDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;
  const s = new Date(startDate), e = new Date(endDate);
  return Math.max(1, Math.ceil((e - s) / (1000 * 60 * 60 * 24)));
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const STATUS_CONFIG = {
  active: {
    label: 'Active', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200',
    dot: 'bg-emerald-500', icon: CheckCircle
  },
  expired: {
    label: 'Expired', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200',
    dot: 'bg-red-500', icon: XCircle
  },
  canceled: {
    label: 'Canceled', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200',
    dot: 'bg-orange-500', icon: Ban
  },
  pending: {
    label: 'Pending', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200',
    dot: 'bg-blue-500', icon: Clock
  },
};

// ─── Circular Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ percent, daysRemaining, size = 140, stroke = 10, color = '#10b981' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (circ * Math.min(percent, 100)) / 100;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-black text-gray-900 leading-none">{daysRemaining}</p>
        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">days left</p>
      </div>
    </div>
  );
}

// ─── Plan Card (for available plans list) ───────────────────────────────────
function PlanCard({ plan, isCurrent, onSelect, loading }) {
  const hasDiscount = plan.originalPrice && plan.originalPrice > plan.price;
  const discountPercent = hasDiscount 
    ? Math.round(((plan.originalPrice - plan.price) / plan.originalPrice) * 100) 
    : 0;

  return (
    <div
      className={`relative bg-white border ${isCurrent ? 'border-black border-2' : 'border-gray-200'} p-8 sm:p-10 flex flex-col gap-5 cursor-pointer group`}
    >
      {hasDiscount && (
        <div className="absolute top-0 right-0 bg-black text-white text-xs font-bold px-4 py-2">
          {discountPercent}% OFF
        </div>
      )}

      {isCurrent && (
        <div className="absolute top-0 left-0 bg-black text-white text-[10px] font-black uppercase tracking-widest px-4 py-2">
          CURRENT PLAN
        </div>
      )}

      <div className={`${isCurrent ? 'mt-4' : ''}`}>
        <p className={`text-xs font-bold tracking-[0.15em] text-gray-500 uppercase`}>
          {plan.name} PLAN
        </p>

        {hasDiscount && (
          <div className="flex items-center gap-3 mt-4 mb-2">
            <span className="text-gray-400 font-medium line-through text-lg">
              ₹{plan.originalPrice.toLocaleString()}
            </span>
            <span className="bg-black text-white text-xs font-bold px-2 py-1">
              Save ₹{(plan.originalPrice - plan.price).toLocaleString()}
            </span>
          </div>
        )}

        <div className={`flex items-end gap-1 ${!hasDiscount ? 'mt-4' : ''}`}>
          <span className="text-5xl font-black tracking-tighter text-black leading-none">
            ₹{plan.price.toLocaleString()}
          </span>
          <span className="text-sm text-gray-500 mb-1.5 ml-1">
            / month
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-2">+ GST applicable</p>
      </div>

      <div className="flex-1 mt-6">
        {plan.features?.length > 0 && (
          <ul className="space-y-4">
            {plan.features.slice(0, 6).map((f, i) => (
              <li key={i} className="flex items-start gap-4 text-[15px] text-black">
                <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L20 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {f}
              </li>
            ))}
            {plan.maxOrders !== -1 && (
              <li className="flex items-start gap-4 text-[15px] text-black">
                <svg className="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12L10 17L20 7" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Up to {plan.maxOrders.toLocaleString()} orders
              </li>
            )}
          </ul>
        )}
      </div>

      {!isCurrent && (
        <button
          onClick={() => onSelect(plan)}
          disabled={loading}
          className="mt-6 w-full py-4 bg-black text-white font-bold text-sm tracking-wide hover:bg-gray-900 transition flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : null}
          {loading ? 'PROCESSING...' : 'GET STARTED'} 
          {!loading && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Confirm Cancel Modal ────────────────────────────────────────────────────
function CancelModal({ subscription, onConfirm, onClose, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <h3 className="text-lg font-black tracking-tight text-gray-900 mb-1">Cancel Subscription?</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Your subscription will be canceled. You'll retain access until{' '}
            <span className="font-bold text-gray-900">{fmtDate(subscription?.endDate)}</span>.
            After that, your restaurant won't be accessible to customers.
          </p>

          <div className="mt-5 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">What happens next</p>
            <ul className="mt-2 space-y-1">
              {['Auto-renewal is disabled', 'Access until plan end date', 'Customers can\'t place new orders after expiry'].map((item, i) => (
                <li key={i} className="text-[11px] text-amber-600 flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-amber-400 shrink-0" />{item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-100 font-bold text-[10px] uppercase tracking-widest text-gray-500 rounded-xl hover:border-gray-200 transition"
          >
            Keep Plan
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-3 bg-red-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
            {loading ? 'Canceling...' : 'Yes, Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Payment Redirect Modal ──────────────────────────────────────────────────
function PaymentModal({ plan, onConfirm, onClose, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 10 }}
        className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-violet-500 via-blue-500 to-emerald-500" />

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Subscribing to</p>
              <h3 className="text-2xl font-black tracking-tight text-gray-900 mt-0.5">{plan?.name}</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Price display */}
          <div className="bg-gray-50 rounded-2xl p-5 flex items-end gap-2 mb-5">
            <span className="text-4xl font-black tracking-tighter text-gray-900">₹{plan?.price?.toLocaleString()}</span>
            <span className="text-sm font-bold text-gray-400 mb-1">/ {plan?.billingCycle === 'yearly' ? 'year' : 'month'}</span>
          </div>

          {/* Features preview */}
          {plan?.features?.length > 0 && (
            <div className="space-y-2 mb-5">
              {plan.features.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl mb-5">
            <p className="text-[10px] font-bold text-blue-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Secure payment via Cashfree
            </p>
            <p className="text-[10px] text-blue-600 mt-1">You'll be redirected to complete the payment. Your plan activates instantly after successful payment.</p>
          </div>

          <button
            onClick={() => onConfirm(plan)}
            disabled={loading}
            className="w-full py-3.5 bg-black text-white font-black text-[11px] uppercase tracking-widest rounded-xl hover:bg-gray-800 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Redirecting to Payment...</>
            ) : (
              <><Zap className="w-4 h-4" /> Pay & Activate Plan</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Payment Success Banner ──────────────────────────────────────────────────
function PaymentSuccessBanner({ message, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white p-5 flex items-center gap-4 shadow-lg shadow-emerald-200"
    >
      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
        <CheckCircle className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-black text-sm">{message}</p>
        <p className="text-[11px] text-white/80 mt-0.5">Your subscription is now active. Refresh if you don't see changes.</p>
      </div>
      <button onClick={onDismiss} className="p-1.5 hover:bg-white/10 rounded-lg transition">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Main SubscriptionTab Component ─────────────────────────────────────────
export default function SubscriptionTab({ restaurant, setIsSidebarOpen, setActiveTab }) {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // ── Load subscription & plans ─────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sub, plansData] = await Promise.allSettled([
        subscriptionApi.getSubscription(),
        subscriptionApi.getPlans(),
      ]);
      if (sub.status === 'fulfilled') setSubscription(sub.value);
      if (plansData.status === 'fulfilled') setPlans(plansData.value || []);
    } catch (err) {
      setError(err.message || 'Failed to load subscription data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Verify payment on return from Cashfree ────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cashfreeOrderId = params.get('verifySubPaymentId')
      ? `qrdine_sub_${params.get('verifySubPaymentId')}` : null;
    const planId = params.get('planId');

    if (!cashfreeOrderId || !planId) return;

    // Clean URL
    const clean = new URL(window.location.href);
    clean.searchParams.delete('verifySubPaymentId');
    clean.searchParams.delete('planId');
    window.history.replaceState({}, '', clean.toString());

    const verify = async () => {
      setVerifyingPayment(true);
      try {
        const result = await subscriptionApi.verifyPaymentOrder(cashfreeOrderId, planId);
        if (result.status === 'paid') {
          setSubscription(result.subscription);
          setSuccessMessage(result.message || 'Plan activated successfully!');
          setTimeout(() => setSuccessMessage(''), 8000);
        } else if (result.status === 'failed') {
          setError('Payment failed or was cancelled. Please try again.');
          setTimeout(() => setError(''), 8000);
        }
      } catch (err) {
        setError(err.message || 'Could not verify payment.');
        setTimeout(() => setError(''), 8000);
      } finally {
        setVerifyingPayment(false);
      }
    };
    verify();
  }, []);

  // ── Cancel subscription ───────────────────────────────────────────────────
  const handleCancel = async () => {
    setCancelLoading(true);
    try {
      const res = await subscriptionApi.cancelSubscription();
      setSubscription(res.subscription);
      setShowCancelModal(false);
    } catch (err) {
      setError(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Start payment flow ────────────────────────────────────────────────────
  const handlePayAndActivate = async (plan) => {
    setPaymentLoading(true);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}?tab=subscription`;
      const res = await subscriptionApi.createPaymentOrder(plan._id, returnUrl);

      if (!res.paymentSessionId) {
        throw new Error('Failed to get payment session from gateway.');
      }

      // Use Cashfree JS SDK if available, else redirect via form post
      if (window.Cashfree) {
        const cf = await window.Cashfree({ mode: res.mode || 'sandbox' });
        await cf.checkout({ paymentSessionId: res.paymentSessionId });
      } else {
        // Fallback: redirect to Cashfree hosted page
        window.location.href = `https://payments${res.mode === 'production' ? '' : '-test'}.cashfree.com/order/#${res.paymentSessionId}`;
      }
    } catch (err) {
      setError(err.message || 'Payment initialization failed.');
      setPaymentLoading(false);
    }
  };

  // ─── Derived display values ───────────────────────────────────────────────
  const plan = subscription?.planId;
  const daysRemaining = getDaysRemaining(subscription?.endDate);
  const totalDays = getTotalDays(subscription?.startDate, subscription?.endDate);
  const daysPercent = totalDays > 0 ? Math.round((daysRemaining / totalDays) * 100) : 0;
  const statusCfg = STATUS_CONFIG[subscription?.status] || STATUS_CONFIG.expired;
  const StatusIcon = statusCfg.icon;
  const isActive = subscription?.status === 'active';
  const isCritical = isActive && daysRemaining <= 7;
  const ringColor = isCritical ? '#ef4444' : isActive ? '#10b981' : '#9ca3af';
  const currentPlanId = plan?._id?.toString();

  if (verifyingPayment) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Loader className="w-6 h-6 text-blue-500 animate-spin" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Verifying Payment...</p>
        <p className="text-[10px] text-gray-400 max-w-xs text-center">Please wait while we confirm your subscription payment with Cashfree.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading Subscription...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* ─── Page Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => setActiveTab('orders')} 
            className="p-2 sm:p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 transition text-gray-600 flex items-center justify-center shrink-0 mt-0.5"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div>
            <h2 className="text-xl md:text-3xl font-black tracking-tighter uppercase leading-none flex items-center gap-3">
              My Subscription
            </h2>
            <p className="text-[10px] sm:text-xs text-gray-500 font-bold mt-2 uppercase tracking-widest">
              Manage your QR Dining plan & billing
            </p>
          </div>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition text-gray-500 hover:text-gray-900"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* ─── Alerts ─── */}
      <AnimatePresence>
        {successMessage && (
          <PaymentSuccessBanner message={successMessage} onDismiss={() => setSuccessMessage('')} />
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-[10px] font-bold text-red-600 uppercase tracking-widest"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── No Subscription State ─── */}
      {!subscription ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed border-gray-200">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <CreditCard className="w-7 h-7 text-gray-300" />
          </div>
          <h3 className="font-black text-lg text-gray-800 mb-1">No Active Plan</h3>
          <p className="text-[11px] text-gray-400 text-center max-w-xs mb-6">
            Your restaurant is not on any subscription plan. Choose a plan below to get started.
          </p>
          <a href="#plans-section" className="px-6 py-2.5 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-800 transition flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" /> View Plans
          </a>
        </div>
      ) : (
        <>
          {/* ─── Status Hero Card ─── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-white rounded-2xl border border-border shadow-sm"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: `radial-gradient(circle at 2px 2px, black 1px, transparent 0)`, backgroundSize: '24px 24px' }} />

            {/* Expiry/Critical Banner */}
            {isCritical && (
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-5 py-2 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest">
                  ⚡ Expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} — Renew now to avoid interruption
                </p>
              </div>
            )}

            <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">

              {/* Left: Ring + Status */}
              <div className="flex items-center gap-5">
                <ProgressRing
                  percent={daysPercent}
                  daysRemaining={daysRemaining}
                  color={ringColor}
                />
                <div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border} mb-2`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                    <StatusIcon className="w-3 h-3" />
                    {statusCfg.label}
                  </div>
                  <h3 className="text-2xl font-black tracking-tight text-gray-900">{plan?.name || 'Plan'}</h3>
                  <p className="text-[11px] font-semibold text-gray-400 mt-0.5 capitalize">
                    {plan?.billingCycle || 'monthly'} · ₹{plan?.price?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="hidden md:block w-px h-20 bg-gray-100" />

              {/* Center: Dates */}
              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Started</p>
                  <p className="text-sm font-black text-gray-900">{fmtDate(subscription.startDate)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Expires</p>
                  <p className={`text-sm font-black ${isCritical ? 'text-red-600' : 'text-gray-900'}`}>
                    {fmtDate(subscription.endDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Auto-Renew</p>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black ${subscription.autoRenew ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {subscription.autoRenew ? <><CheckCircle className="w-3 h-3" /> Enabled</> : <><XCircle className="w-3 h-3" /> Disabled</>}
                  </div>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Last Payment</p>
                  <p className="text-sm font-black text-gray-900">{fmtDate(subscription.lastPaymentDate)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment Status</p>
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[9px] font-black ${subscription.paymentStatus === 'paid' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {subscription.paymentStatus === 'paid' ? 'Paid ✓' : 'Unpaid'}
                  </div>
                </div>
              </div>

              {/* Right: Action Buttons */}
              <div className="flex flex-col gap-2 w-full md:w-auto">
                {/* Renew with another plan from plans section - scroll down */}
                <a href="#plans-section">
                  <button className="w-full md:w-auto px-5 py-2.5 bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-800 transition flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5" /> Renew / Upgrade
                  </button>
                </a>
                {isActive && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="w-full md:w-auto px-5 py-2.5 border-2 border-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition flex items-center justify-center gap-2"
                  >
                    <Ban className="w-3.5 h-3.5" /> Stop Plan
                  </button>
                )}
              </div>
            </div>

            {/* Timeline bar */}
            <div className="px-6 pb-5">
              <div className="flex items-center justify-between text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">
                <span>{fmtDate(subscription.startDate)}</span>
                <span>{daysRemaining} days remaining</span>
                <span>{fmtDate(subscription.endDate)}</span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - daysPercent}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${isCritical ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-emerald-400 to-green-500'}`}
                />
              </div>
            </div>
          </motion.div>

          {/* ─── Plan Features ─── */}
          {plan?.features?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-border p-5 shadow-sm"
            >
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" /> What's Included in Your Plan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <p className="text-[11px] font-semibold text-gray-700 leading-snug">{feature}</p>
                  </div>
                ))}
                {plan.maxOrders !== -1 && (
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <p className="text-[11px] font-semibold text-blue-700 leading-snug">
                      {plan.maxOrders.toLocaleString()} orders per month
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* ─── Available Plans ─── */}
      {plans.length > 0 && (
        <motion.div
          id="plans-section"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-400" /> Available Plans
              </h3>
              <p className="text-[9px] text-gray-400 mt-0.5">Choose a plan to renew or upgrade your subscription</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((p) => (
              <PlanCard
                key={p._id}
                plan={p}
                isCurrent={currentPlanId && p._id === currentPlanId}
                onSelect={(selected) => setSelectedPlanForPayment(selected)}
                loading={paymentLoading && selectedPlanForPayment?._id === p._id}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Modals ─── */}
      <AnimatePresence>
        {showCancelModal && (
          <CancelModal
            subscription={subscription}
            onConfirm={handleCancel}
            onClose={() => setShowCancelModal(false)}
            loading={cancelLoading}
          />
        )}
        {selectedPlanForPayment && (
          <PaymentModal
            plan={selectedPlanForPayment}
            onConfirm={handlePayAndActivate}
            onClose={() => setSelectedPlanForPayment(null)}
            loading={paymentLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
