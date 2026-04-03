import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { ordersApi, menuApi, tablesApi, restaurantApi } from '../../utils/api';
import { io } from 'socket.io-client';
import AnalyticsTab from './components/AnalyticsTab';
import MenuTab from './components/MenuTab';
import OrdersTab from './components/OrdersTab';
import PaymentsTab from './components/PaymentsTab';
import SettingsTab from './components/SettingsTab';
import TablesTab from './components/TablesTab';
import SubscriptionTab from './components/SubscriptionTab';
import Modal from '../../components/ui/Modal';
import { CHATBOT_CRAVING_TAGS, normalizeChatbotTags } from '../chat/constants';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Utensils, Grid3x3, BarChart3, Plus, Trash2, Eye, EyeOff,
  CheckCircle, Clock, ChefHat, Download, RefreshCw, Package, Bell, LogOut,
  TrendingUp, TrendingDown, QrCode, Menu, X, Wifi, WifiOff, ArrowRight,
  DollarSign, Users, Star, AlertCircle, Settings, Lock, ShieldCheck,
  Store, Phone, MapPin, Tag, Percent, MessageSquare, Save, Upload, UploadCloud,
  CreditCard, Wallet, Banknote, ShieldAlert, Info, Printer, Edit, Minus
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || undefined;

const TABS = [
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'menu', label: 'Menu', icon: Utensils },
  { id: 'tables', label: 'Tables', icon: Grid3x3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  // { id: 'payments', label: 'Payments', icon: Wallet },
];

const STATUS_CONFIG = {
  preparing: { label: 'Preparing', icon: ChefHat, bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  done_pending_verification: { label: 'Done (Pending Verification)', icon: Package, bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  completed: { label: 'Completed', icon: CheckCircle, bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const normalizeOrderStatus = (status) => {
  if (status === 'new') return 'preparing';
  if (status === 'ready') return 'done_pending_verification';
  return status || 'preparing';
};

const normalizeOrderForUi = (order) => ({
  ...order,
  orderStatus: normalizeOrderStatus(order?.orderStatus),
});

const EMPTY_MENU_ITEM = {
  name: '',
  price: '',
  categoryId: '',
  description: '',
  dietType: 'veg',
  tags: [],
  imageFile: null,
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'orders';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newOrders, setNewOrders] = useState(0);
  const [connected, setConnected] = useState(false);
  const [isAcceptingOrders, setIsAcceptingOrders] = useState(true);
  const [tabLoading, setTabLoading] = useState({});
  const [tabErrors, setTabErrors] = useState({});
  const [loadedTabs, setLoadedTabs] = useState({});
  const [isSubscribed, setIsSubscribed] = useState(true);
  const socketRef = useRef(null);
  const loadedTabsRef = useRef({});
  const [orderNotifications, setOrderNotifications] = useState([]);
  const notifTimersRef = useRef({});

  // Synthesize a short chime using Web Audio API (no file needed)
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const times = [0, 0.15, 0.3];
      const freqs = [880, 1108, 1320];
      times.forEach((t, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freqs[i], ctx.currentTime + t);
        gain.gain.setValueAtTime(0.35, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.45);
      });
    } catch (_) { /* browser may block autoplay */ }
  };

  const dismissNotification = (id) => {
    if (notifTimersRef.current[id]) clearTimeout(notifTimersRef.current[id]);
    setOrderNotifications(prev => prev.filter(n => n.id !== id));
  };

  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newItem, setNewItem] = useState(EMPTY_MENU_ITEM);
  const [editingItemId, setEditingItemId] = useState(null);
  const [addTableCount, setAddTableCount] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [pinModalOrder, setPinModalOrder] = useState(null);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinNotice, setPinNotice] = useState('');
  const [pinSubmitting, setPinSubmitting] = useState(false);
  const [pinResending, setPinResending] = useState(false);

  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const dateFilterRef = useRef(dateFilter);
  useEffect(() => { dateFilterRef.current = dateFilter; }, [dateFilter]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Email changes
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailModalMode, setEmailModalMode] = useState('request'); // request, verify
  const [emailForm, setEmailForm] = useState({ newEmail: '', otp: '' });

  const [profileForm, setProfileForm] = useState(null);
  const [paymentInfoForm, setPaymentInfoForm] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const [payouts, setPayouts] = useState([]);
  const [dailyEarnings, setDailyEarnings] = useState([]);
  const [earningsSummary, setEarningsSummary] = useState(null);

  // Operating hours state
  const [selectedHourDay, setSelectedHourDay] = useState('monday');
  const [hoursForm, setHoursForm] = useState(
    DAYS.reduce((acc, d) => ({ ...acc, [d]: { open: '09:00', close: '22:00', isOpen: true } }), {})
  );
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState('');
  const [hoursError, setHoursError] = useState('');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [payoutDateFilter, setPayoutDateFilter] = useState('all');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all');
  const [showBankEdit, setShowBankEdit] = useState(false);

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef(null);

  const buildOrderParams = useCallback(() => {
    let dateFrom;
    let dateTo;
    const today = new Date();

    if (dateFilterRef.current === 'today') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
      dateFrom = start.toISOString();
      dateTo = end.toISOString();
    } else if (dateFilterRef.current === 'yesterday') {
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
      const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      dateFrom = start.toISOString();
      dateTo = end.toISOString();
    } else if (dateFilterRef.current === 'custom' && customDate) {
      const start = new Date(customDate);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      dateFrom = start.toISOString();
      dateTo = end.toISOString();
    }

    if (!dateFrom || !dateTo) {
      return null;
    }

    return { dateFrom, dateTo, limit: 1000 };
  }, [customDate]);

  const applyProfileState = useCallback((profile) => {
    setRestaurant(profile);
    setIsAcceptingOrders(profile?.restaurantIsOpen !== false && profile?.isAcceptingOrders !== false);

    if (profile?.operatingHours) {
      const oh = profile.operatingHours;
      const normalized = DAYS.reduce((acc, d) => ({
        ...acc,
        [d]: { open: oh[d]?.open || '09:00', close: oh[d]?.close || '22:00', isOpen: oh[d]?.isOpen !== false }
      }), {});
      setHoursForm(normalized);
    }

    // Check subscription status
    const sub = profile?.currentSubscription;
    const active = sub && sub.status === 'active' && new Date(sub.endDate) > new Date();
    setIsSubscribed(!!active);

    setProfileForm({
      name: profile?.name || '',
      email: profile?.email || '',
      description: profile?.description || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      city: profile?.city || '',
      pincode: profile?.pincode || '',
      logo: profile?.logo || '',
      cuisineTags: (profile?.cuisineTags || []).join(', '),
      customMessage: profile?.customMessage || '',
    });

    setPaymentInfoForm({
      method: profile?.paymentInfo?.method && profile.paymentInfo.method !== 'cash' ? profile.paymentInfo.method : 'bank',
      upiId: profile?.paymentInfo?.upiId || '',
      accountHolderName: profile?.paymentInfo?.accountHolderName || '',
      bankName: profile?.paymentInfo?.bankName || '',
      accountNumber: profile?.paymentInfo?.accountNumber || '',
      ifscCode: profile?.paymentInfo?.ifscCode || '',
      branchName: profile?.paymentInfo?.branchName || '',
    });
  }, []);

  const markTabLoaded = useCallback((tab) => {
    loadedTabsRef.current[tab] = true;
    setLoadedTabs(prev => ({ ...prev, [tab]: true }));
  }, []);

  const withTabRequest = useCallback(async (tab, loader, { force = false } = {}) => {
    if (!force && loadedTabsRef.current[tab]) {
      return;
    }

    setTabLoading(prev => ({ ...prev, [tab]: true }));
    setTabErrors(prev => ({ ...prev, [tab]: '' }));

    try {
      await loader();
      markTabLoaded(tab);
    } catch (error) {
      console.error(`${tab} loading error:`, error);
      setTabErrors(prev => ({
        ...prev,
        [tab]: error.message || `Failed to load ${tab}.`,
      }));
    } finally {
      setTabLoading(prev => ({ ...prev, [tab]: false }));
    }
  }, [markTabLoaded]);

  const ensureProfileLoaded = useCallback(async ({ force = false } = {}) => {
    if (restaurant && !force) {
      return restaurant;
    }

    const profile = await restaurantApi.getProfile();
    applyProfileState(profile);
    markTabLoaded('settings');
    return profile;
  }, [restaurant, applyProfileState, markTabLoaded]);

  const loadOrdersData = useCallback(async () => {
    await ensureProfileLoaded();

    const orderParams = buildOrderParams();
    const [ordersResult, statsResult] = await Promise.allSettled([
      orderParams ? ordersApi.getOrders(orderParams) : Promise.resolve({ orders: [] }),
      ordersApi.getStats(),
    ]);

    let hasSuccess = false;

    if (ordersResult.status === 'fulfilled') {
      setOrders((ordersResult.value.orders || []).map(normalizeOrderForUi));
      hasSuccess = true;
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value || null);
      hasSuccess = true;
    }

    if (!hasSuccess) {
      throw ordersResult.reason || statsResult.reason || new Error('Failed to load orders data.');
    }
  }, [buildOrderParams, ensureProfileLoaded]);

  const loadMenuData = useCallback(async () => {
    const [categoriesResult, itemsResult] = await Promise.allSettled([
      menuApi.getCategories(),
      menuApi.getItems(),
    ]);

    let hasSuccess = false;

    if (categoriesResult.status === 'fulfilled') {
      setCategories(categoriesResult.value || []);
      hasSuccess = true;
    }

    if (itemsResult.status === 'fulfilled') {
      setMenuItems(itemsResult.value || []);
      hasSuccess = true;
    }

    if (!hasSuccess) {
      throw categoriesResult.reason || itemsResult.reason || new Error('Failed to load menu data.');
    }
  }, []);

  const loadTablesData = useCallback(async () => {
    await ensureProfileLoaded();
    const tablesData = await tablesApi.getTables();
    setTables(tablesData || []);
  }, [ensureProfileLoaded]);

  const loadAnalyticsData = useCallback(async () => {
    await ensureProfileLoaded();
    const orderStats = await ordersApi.getStats();
    setStats(orderStats || null);
  }, [ensureProfileLoaded]);

  const loadPaymentsData = useCallback(async () => {
    await ensureProfileLoaded();
    const [payoutsResult, earningsResult, summaryResult] = await Promise.allSettled([
      restaurantApi.getPayouts(),
      ordersApi.getDailyEarnings(),
      ordersApi.getDailyEarningsSummary(),
    ]);

    let hasSuccess = false;

    if (payoutsResult.status === 'fulfilled') {
      setPayouts(payoutsResult.value || []);
      hasSuccess = true;
    }

    if (earningsResult.status === 'fulfilled') {
      setDailyEarnings(earningsResult.value || []);
      hasSuccess = true;
    }

    if (summaryResult.status === 'fulfilled') {
      setEarningsSummary(summaryResult.value || null);
      hasSuccess = true;
    }

    if (!hasSuccess) {
      throw payoutsResult.reason || earningsResult.reason || summaryResult.reason || new Error('Failed to load payments data.');
    }
  }, [ensureProfileLoaded]);

  const loadSettingsData = useCallback(async () => {
    await ensureProfileLoaded({ force: true });
  }, [ensureProfileLoaded]);

  // Init socket once on mount, clean up on unmount
  useEffect(() => {
    const socket = io(SOCKET_URL, { withCredentials: true });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('new-order', (order) => {
      const normalizedOrder = normalizeOrderForUi(order);
      if (dateFilterRef.current === 'today') {
        setOrders(prev => [normalizedOrder, ...prev]);
      }
      setNewOrders(n => n + 1);

      // Show animated popup notification
      const notifId = `notif-${Date.now()}`;
      const itemCount = (normalizedOrder.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
      const label = normalizedOrder.orderType === 'Takeaway'
        ? 'Takeaway'
        : normalizedOrder.tableNumber ? `Table ${normalizedOrder.tableNumber}` : 'Dine-In';
      const notif = {
        id: notifId,
        label,
        customerName: normalizedOrder.customerName || 'Guest',
        itemCount,
        totalAmount: normalizedOrder.totalAmount,
        items: (normalizedOrder.items || []).slice(0, 3),
        createdAt: new Date(),
      };
      setOrderNotifications(prev => [notif, ...prev].slice(0, 5));
      playChime();

      // Auto-dismiss after 12 seconds
      notifTimersRef.current[notifId] = setTimeout(() => {
        setOrderNotifications(prev => prev.filter(n => n.id !== notifId));
        delete notifTimersRef.current[notifId];
      }, 12000);
    });
    socket.on('order-updated', ({ orderId, status }) => {
      const normalizedStatus = normalizeOrderStatus(status);
      setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, orderStatus: normalizedStatus } : o));
      if (normalizedStatus === 'completed') {
        setPinValue('');
        setPinError('');
        setPinNotice('');
      }
      setPinModalOrder((prev) => {
        if (!prev || (prev._id !== orderId && prev.id !== orderId)) {
          return prev;
        }
        return normalizedStatus === 'completed'
          ? null
          : { ...prev, orderStatus: normalizedStatus };
      });
    });
    return () => {
      socket.disconnect();
      // Clear all pending notification timers
      Object.values(notifTimersRef.current).forEach(clearTimeout);
    };
  }, []);

  // Join restaurant socket room once restaurant profile is loaded
  // IMPORTANT: room key = restaurant._id (NOT user.id)
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !restaurant?._id) return;
    if (socket.connected) {
      socket.emit('join-restaurant', restaurant._id.toString());
    } else {
      socket.once('connect', () => {
        socket.emit('join-restaurant', restaurant._id.toString());
      });
    }
  }, [restaurant?._id]);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const ALL_VALID_TABS = [...TABS.map(t => t.id), 'payments', 'subscription', 'settings'];
    if (tab && ALL_VALID_TABS.includes(tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab('orders');
    }
  }, [searchParams]);

  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    if (activeTab === 'orders') {
      withTabRequest('orders', loadOrdersData, { force: true });
    } else if (activeTab === 'menu') {
      withTabRequest('menu', loadMenuData, { force: true });
    } else if (activeTab === 'tables') {
      withTabRequest('tables', loadTablesData, { force: true });
    } else if (activeTab === 'analytics') {
      withTabRequest('analytics', loadAnalyticsData, { force: true });
    }
    // } else if (activeTab === 'payments') {
    //   withTabRequest('payments', loadPaymentsData, { force: true });
    // } else if (activeTab === 'settings') {
    //   withTabRequest('settings', loadSettingsData, { force: true });
    // }
    // subscription tab manages its own data loading inside SubscriptionTab component
  }, [activeTab, withTabRequest, loadOrdersData, loadMenuData, loadTablesData, loadAnalyticsData, loadPaymentsData, loadSettingsData]);

  useEffect(() => {
    if (activeTab !== 'orders') return;
    if (!loadedTabsRef.current.orders) return;
    withTabRequest('orders', loadOrdersData, { force: true });
  }, [activeTab, dateFilter, customDate, withTabRequest, loadOrdersData]);

  const totalReceived = payouts.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
  const thisMonthReceived = payouts.filter(p => {
    const d = new Date(p.createdAt); const n = new Date();
    return p.status === 'Paid' && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payouts.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
  const lastPayment = payouts.filter(p => p.status === 'Paid').sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];

  const filteredPayouts = payouts.filter(p => {
    if (payoutStatusFilter !== 'all' && p.status.toLowerCase() !== payoutStatusFilter.toLowerCase()) return false;
    if (payoutDateFilter === '7_days') {
      if (new Date(p.createdAt) < new Date(Date.now() - 7 * 86400000)) return false;
    }
    if (payoutDateFilter === 'this_month') {
      const d = new Date(p.createdAt); const n = new Date();
      if (d.getMonth() !== n.getMonth() || d.getFullYear() !== n.getFullYear()) return false;
    }
    return true;
  });

  const activeTabLabel = TABS.find(tab => tab.id === activeTab)?.label || 'Dashboard';
  const showTabLoader = Boolean(tabLoading[activeTab] && !loadedTabs[activeTab]);
  const activeTabError = tabErrors[activeTab];
  const monthRevenue = stats?.monthRevenue || 0;
  const totalOrdersCount = stats?.totalOrders || 0;
  const averageOrderValue = totalOrdersCount ? monthRevenue / totalOrdersCount : 0;
  const openDaysCount = DAYS.filter(day => hoursForm[day]?.isOpen).length;
  const profileChecks = [
    profileForm?.name,
    profileForm?.phone,
    profileForm?.city,
    profileForm?.address,
    profileForm?.description,
    profileForm?.cuisineTags,
  ];
  const completedProfileFields = profileChecks.filter(value => String(value || '').trim()).length;
  const profileCompletionPercent = Math.round((completedProfileFields / profileChecks.length) * 100);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Synchronizing Gateway...</p>
      </div>
    </div>
  );

  const handleLogout = async () => { await logout(); navigate('/owner-login'); };

  const closePinModal = useCallback(() => {
    if (pinSubmitting || pinResending) return;
    setPinModalOrder(null);
    setPinValue('');
    setPinError('');
    setPinNotice('');
  }, [pinResending, pinSubmitting]);

  const openPinModal = useCallback((order) => {
    setPinModalOrder(normalizeOrderForUi(order));
    setPinValue('');
    setPinError('');
    setPinNotice('');
  }, []);

  const toggleAcceptingOrders = async () => {
    setActionLoading(true);
    try {
      const newVal = !isAcceptingOrders;
      await restaurantApi.updateProfile({ isAcceptingOrders: newVal, restaurantIsOpen: newVal });
      setIsAcceptingOrders(newVal);
      setRestaurant(prev => ({ ...prev, isAcceptingOrders: newVal, restaurantIsOpen: newVal }));
    } catch (err) { alert('Failed to update status'); }
    finally { setActionLoading(false); }
  };

  const handleOrderAction = async (order) => {
    const currentStatus = normalizeOrderStatus(order?.orderStatus);

    if (currentStatus === 'preparing') {
      setActionLoading(true);
      try {
        const response = await ordersApi.updateStatus(order._id, 'done_pending_verification');
        const updatedOrder = normalizeOrderForUi(response.order || { ...order, orderStatus: 'done_pending_verification' });
        setOrders(prev => prev.map((entry) => entry._id === order._id ? updatedOrder : entry));
        openPinModal(updatedOrder);
      } catch (err) {
        alert(err.message || 'Failed to move order to PIN verification.');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    if (currentStatus === 'done_pending_verification') {
      openPinModal(order);
    }
  };

  const handleVerifyPin = async () => {
    if (!pinModalOrder?._id) return;

    setPinSubmitting(true);
    setPinError('');
    setPinNotice('');
    try {
      const response = await ordersApi.verifyPin(pinModalOrder._id, pinValue);
      const updatedOrder = normalizeOrderForUi(response.order);
      setOrders(prev => prev.map((entry) => entry._id === updatedOrder._id ? updatedOrder : entry));
      setPinModalOrder(updatedOrder);
      setPinNotice('PIN verified. Invoice email is being sent to the customer.');
      setPinValue('');
      window.setTimeout(() => {
        setPinModalOrder(null);
        setPinNotice('');
      }, 900);
    } catch (err) {
      const responseMessage = err?.details?.message || err?.message || 'Incorrect PIN. Please try again.';
      setPinError(responseMessage);
      if (err?.details?.order) {
        setPinModalOrder(normalizeOrderForUi(err.details.order));
      }
    } finally {
      setPinSubmitting(false);
    }
  };

  const handleResendPin = async () => {
    if (!pinModalOrder?._id) return;

    setPinResending(true);
    setPinError('');
    setPinNotice('');
    try {
      const response = await ordersApi.resendPin(pinModalOrder._id);
      if (response.order) {
        const updatedOrder = normalizeOrderForUi(response.order);
        setOrders(prev => prev.map((entry) => entry._id === updatedOrder._id ? updatedOrder : entry));
        setPinModalOrder(updatedOrder);
      }
      setPinNotice(response.message || 'A fresh PIN was emailed to the customer.');
      setPinValue('');
    } catch (err) {
      setPinError(err?.details?.message || err?.message || 'Failed to resend PIN.');
    } finally {
      setPinResending(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setActionLoading(true);
    try {
      if (editingCategoryId) {
        const cat = await menuApi.updateCategory(editingCategoryId, { name: newCategory.trim() });
        setCategories(prev => prev.map(c => c._id === editingCategoryId ? cat : c));
      } else {
        const cat = await menuApi.createCategory(newCategory.trim());
        setCategories(prev => [...prev, cat]);
      }
      setNewCategory('');
      setEditingCategoryId(null);
      setShowCategoryModal(false);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!confirm('Delete this category? Items must be reassigned or deleted first.')) return;
    try {
      await menuApi.deleteCategory(categoryId);
      setCategories(prev => prev.filter(c => c._id !== categoryId));
    } catch (err) { alert(err.message); }
  };

  const toggleItemTag = (tag) => {
    setNewItem((prev) => {
      const currentTags = normalizeChatbotTags(prev.tags || []);
      const nextTags = currentTags.includes(tag)
        ? currentTags.filter((entry) => entry !== tag)
        : [...currentTags, tag];

      return { ...prev, tags: nextTags };
    });
  };

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.categoryId) return;
    setActionLoading(true);
    try {
      const normalizedTags = normalizeChatbotTags(newItem.tags || []);
      let payload;
      if (newItem.imageFile) {
        payload = new FormData();
        payload.append('name', newItem.name);
        payload.append('price', newItem.price);
        payload.append('categoryId', newItem.categoryId);
        payload.append('description', newItem.description || '');
        payload.append('dietType', newItem.dietType || 'veg');
        payload.append('tags', normalizedTags.join(','));
        payload.append('image', newItem.imageFile);
      } else {
        payload = {
          name: newItem.name,
          price: parseFloat(newItem.price),
          categoryId: newItem.categoryId,
          description: newItem.description,
          dietType: newItem.dietType,
          tags: normalizedTags,
        };
      }

      if (editingItemId) {
        const item = await menuApi.updateItem(editingItemId, payload);
        setMenuItems(prev => prev.map(i => i._id === editingItemId ? item : i));
      } else {
        const item = await menuApi.createItem(payload);
        setMenuItems(prev => [...prev, item]);
      }
      setNewItem(EMPTY_MENU_ITEM);
      setEditingItemId(null);
      setShowItemModal(false);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Delete this menu item?')) return;
    try {
      await menuApi.deleteItem(itemId);
      setMenuItems(prev => prev.filter(i => i._id !== itemId));
    } catch (err) { alert(err.message); }
  };

  const handleAddTables = async () => {
    if (addTableCount < 1) return;
    setActionLoading(true);
    try {
      const result = await tablesApi.bulkCreateTables(addTableCount, 1, 'Table');
      setTables(prev => [...prev, ...(result.tables || [])]);
      setAddTableCount(1);
    } catch (err) { alert(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDeleteTable = async (tableId) => {
    if (!window.confirm("Are you sure you want to delete this table?")) return;
    try {
      await tablesApi.deleteTable(tableId);
      setTables(prev => prev.filter(t => t._id !== tableId));
    } catch (err) { alert(err.message); }
  };

  const handleDeleteAllTables = async () => {
    if (!window.confirm("DANGER: Are you sure you want to delete ALL tables?")) return;
    try {
      for (const table of tables) {
        await tablesApi.deleteTable(table._id);
      }
      setTables([]);
    } catch (err) { alert(err.message); }
  };

  // Common QR card sizes for PNG
  const QR_PNG = {
    card: { w: 800, h: 1000 },
    qr: 560,
    topH: 220,
    bottomH: 200,
    margin: 120,
  };

  const drawQRCard = (ctx, svgElem, tableNumber, w, h, opts = {}) => {
    return new Promise((resolve) => {
      const { qrSize = 480, topH = 220, margin = 160 } = opts;
      const img = new Image();
      const svgData = new XMLSerializer().serializeToString(svgElem);
      img.onload = () => {
        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);

        // Black top banner
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, topH);

        // Restaurant name in top banner
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(w * 0.052)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const name = (restaurant?.name || 'RESTAURANT').toUpperCase();
        ctx.fillText(name, w / 2, topH * 0.42);

        // Tagline
        ctx.font = `600 ${Math.round(w * 0.022)}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText('SCAN TO ORDER', w / 2, topH * 0.72);

        // QR code centered
        const qrX = (w - qrSize) / 2;
        const qrY = topH + (h - topH - qrSize - 140) / 2;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // Table label box
        const boxW = Math.round(w * 0.55);
        const boxH = Math.round(h * 0.10);
        const boxX = (w - boxW) / 2;
        const boxY = qrY + qrSize + Math.round(h * 0.03);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 14);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${Math.round(w * 0.055)}px sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.fillText(`TABLE ${tableNumber}`, w / 2, boxY + boxH / 2);

        // Footer branding
        ctx.fillStyle = '#d1d5db';
        ctx.font = `700 ${Math.round(w * 0.018)}px sans-serif`;
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Powered by Resurgenix Technologies', w / 2, h - Math.round(h * 0.025));

        resolve();
      };
      img.onerror = resolve;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    });
  };

  const downloadQR = (tableNumber, elementId) => {
    const svgElem = document.getElementById(elementId);
    if (!svgElem) return;
    const { w, h, qr, topH, margin } = { w: QR_PNG.card.w, h: QR_PNG.card.h, qr: QR_PNG.qr, topH: QR_PNG.topH, margin: QR_PNG.margin };
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    drawQRCard(ctx, svgElem, tableNumber, w, h, { qrSize: qr, topH }).then(() => {
      const link = document.createElement('a');
      link.download = `${restaurant?.name || 'Table'}-T${tableNumber}-QR.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  };

  const handlePrintAllQRs = () => {
    const printWin = window.open('', '_blank', 'width=900,height=1200');
    if (!printWin) return;

    // Collect all QR SVG data URLs
    const qrItems = tables.map(t => {
      const svgElem = document.getElementById(`qr-svg-${t._id}`);
      if (!svgElem) return null;
      const svgData = new XMLSerializer().serializeToString(svgElem);
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      return { tableNumber: t.tableNumber, dataUrl };
    }).filter(Boolean);

    const restaurantName = (restaurant?.name || 'Restaurant').toUpperCase();

    printWin.document.write(`<!DOCTYPE html>
<html>
<head>
<title>QR Codes - ${restaurantName}</title>
<style>
  @page {
    margin: 0;
    size: A4;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #fff; font-family: sans-serif; -webkit-print-color-adjust: exact; }
  
  .page {
    width: 210mm;
    height: 297mm;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 8mm;
    padding: 10mm;
    page-break-after: always;
    background: white;
  }
  
  .qr-card {
    display: flex;
    flex-direction: column;
    border: 1.5px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    break-inside: avoid;
    height: 100%;
  }
  
  .card-top {
    background: #000;
    padding: 15px 10px;
    text-align: center;
  }
  
  .rest-name {
    color: #fff;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: 1.5px;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .tagline {
    color: rgba(255,255,255,0.5);
    font-size: 8px;
    font-weight: 700;
    letter-spacing: 3px;
    margin-top: 4px;
  }
  
  .card-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 10px;
  }
  
  .qr-img {
    width: 85%;
    max-width: 260px;
    height: auto;
    display: block;
    margin-bottom: 20px;
  }
  
  .table-box {
    background: #000;
    color: #fff;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: 2px;
    padding: 8px 30px;
    border-radius: 8px;
  }
  
  .card-footer {
    font-size: 7px;
    color: #9ca3af;
    text-align: center;
    padding: 8px;
    border-top: 1px solid #f3f4f6;
    font-weight: 700;
    letter-spacing: 1px;
  }

  @media print {
    body { background: white; }
    .page { margin: 0; }
  }
</style>
</head>
<body>
`);

    // Group into pages of 4
    for (let i = 0; i < qrItems.length; i += 4) {
      const group = qrItems.slice(i, i + 4);
      const groupCards = group.map(item => `
        <div class="qr-card">
          <div class="card-top">
            <div class="rest-name">${restaurantName}</div>
            <div class="tagline">SCAN TO ORDER</div>
          </div>
          <div class="card-body">
            <img src="${item.dataUrl}" class="qr-img" alt="QR" />
            <div class="table-box">TABLE ${item.tableNumber}</div>
          </div>
          <div class="card-footer">Powered by Resurgenix Technologies</div>
        </div>
      `).join('');
      printWin.document.write(`<div class="page">${groupCards}</div>`);
    }

    printWin.document.write('</body></html>');
    printWin.document.close();

    // Wait for images to load before printing
    setTimeout(() => {
      printWin.focus();
      printWin.print();
    }, 1000);
  };




  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const res = await restaurantApi.uploadLogo(file);
      setProfileForm(prev => ({ ...prev, logo: res.imageUrl }));
      setRestaurant(prev => prev ? { ...prev, logo: res.imageUrl } : prev);
      setProfileSuccess('Logo uploaded successfully');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.message || 'Failed to upload logo');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true); setProfileSuccess(''); setProfileError('');
    try {
      const payload = {
        ...profileForm,
        cuisineTags: profileForm.cuisineTags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const result = await restaurantApi.updateProfile(payload);
      if (result.restaurant) {
        applyProfileState(result.restaurant);
      } else if (result) {
        applyProfileState(result);
      }
      setProfileSuccess('Profile updated successfully.');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) { setProfileError(err.message); }
    finally { setProfileLoading(false); }
  };

  const updateProfileField = (field, value) => {
    if (profileError) setProfileError('');
    setProfileForm(prev => ({ ...(prev || {}), [field]: value }));
  };

  const updateHoursField = (day, field, value) => {
    if (hoursError) setHoursError('');
    setHoursForm(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      }
    }));
  };

  const saveOperatingHours = async () => {
    setHoursSaving(true);
    setHoursSuccess('');
    setHoursError('');

    try {
      for (const day of DAYS) {
        const entry = hoursForm[day];
        if (!entry) continue;
        if (entry.isOpen && entry.open >= entry.close) {
          throw new Error(`${day.charAt(0).toUpperCase() + day.slice(1)} opening time must be earlier than closing time.`);
        }
      }

      const result = await restaurantApi.updateOperatingHours(hoursForm);
      const savedRestaurant = result.restaurant;

      if (savedRestaurant?.operatingHours) {
        setHoursForm(savedRestaurant.operatingHours);
      }

      if (savedRestaurant) {
        setRestaurant(savedRestaurant);
      }
      setIsAcceptingOrders(result.isAcceptingOrders);
      setHoursSuccess('Hours saved successfully.');
      setTimeout(() => setHoursSuccess(''), 3000);
    } catch (err) {
      setHoursError(err.message || 'Failed to save hours');
    } finally {
      setHoursSaving(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    setPaymentLoading(true); setPaymentSuccess(''); setPaymentError('');
    try {
      const result = await restaurantApi.updateProfile({ paymentInfo: paymentInfoForm });
      setRestaurant(result.restaurant || result);
      setPaymentSuccess('Payment details configured.');
      setTimeout(() => setPaymentSuccess(''), 3000);
    } catch (err) { setPaymentError(err.message); }
    finally { setPaymentLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPw.length < 8) return setPwError('Security too weak.');
    if (pwForm.newPw !== pwForm.confirm) return setPwError('Key mismatch.');
    setPwLoading(true);
    try {
      await restaurantApi.changePassword(pwForm.current, pwForm.newPw);
      setPwSuccess('Access credentials updated.');
      setTimeout(() => setPwSuccess(''), 3000);
      setPwForm({ current: '', newPw: '', confirm: '' });
      setShowPasswordModal(false);
    } catch (err) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  const handleEmailChangeRequest = async (e) => {
    e.preventDefault();
    if (!emailForm.newEmail) return setPwError('Email is required.');
    setPwLoading(true);
    setPwError('');
    try {
      await restaurantApi.requestEmailChangeOtp(emailForm.newEmail);
      setEmailModalMode('verify');
      setPwSuccess('OTP sent to new email.');
      setTimeout(() => setPwSuccess(''), 3000);
    } catch (err) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  const handleEmailChangeVerify = async (e) => {
    e.preventDefault();
    if (!emailForm.otp) return setPwError('OTP is required.');
    setPwLoading(true);
    setPwError('');
    try {
      const res = await restaurantApi.verifyEmailChangeOtp(emailForm.newEmail, emailForm.otp);
      setRestaurant(res.restaurant || res);
      setPwSuccess('Email updated successfully.');
      setTimeout(() => setPwSuccess(''), 3000);
      setShowEmailModal(false);
      setEmailModalMode('request');
      setEmailForm({ newEmail: '', otp: '' });
    } catch (err) { setPwError(err.message); }
    finally { setPwLoading(false); }
  };

  const filteredOrders = filterStatus === 'all'
    ? orders
    : orders.filter((o) => normalizeOrderStatus(o.orderStatus) === filterStatus);

  const SidebarContent = () => (
    <>
      <div className="p-3 border-b border-border flex items-center justify-between bg-white sticky top-0 lg:hidden">
        <span className="font-black tracking-widest text-[10px] uppercase text-muted">Core Modules</span>
        <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-gray-100 transition rounded-md">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="hidden lg:flex p-4 border-b border-border items-center gap-3">
        <div className="w-8 h-8 bg-black flex items-center justify-center text-white font-black text-[10px] rounded-sm tracking-tighter shrink-0">
          {restaurant?.name?.charAt(0) || 'QD'}
        </div>
        <h1 className="font-black text-sm uppercase tracking-tight leading-none truncate">
          {restaurant?.name || 'QR Dining'}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 hide-scrollbar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2 transition rounded-lg ${active ? 'bg-black text-white' : 'hover:bg-gray-50 text-muted'}`}>
              <Icon className={`w-3.5 h-3.5 ${active ? 'text-white' : 'text-muted'}`} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              {tab.id === 'orders' && newOrders > 0 && <span className="ml-auto bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">{newOrders}</span>}
            </button>
          );
        })}
      </div>

      <div className="p-3 border-t border-border bg-[#FDFCFB]">
        <div className="flex items-center justify-between gap-2 overflow-hidden">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-black flex flex-shrink-0 items-center justify-center text-white font-black text-[10px] rounded-full">
              {restaurant?.name?.charAt(0) || currentUser?.email?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-[7px] uppercase tracking-widest text-muted opacity-60">PROPRIETOR</p>
              <p className="text-[10px] font-bold truncate leading-tight text-gray-900">{restaurant?.name || 'Restaurant'}</p>
              {currentUser?.email && <p className="text-[8px] truncate leading-tight text-gray-400">{currentUser.email}</p>}
            </div>
          </div>
          <button onClick={handleLogout} title="Log Out" className="p-1.5 flex-shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition border border-transparent hover:border-red-100">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-65px)] bg-gray-50/50 text-gray-900 overflow-hidden font-sans">

      {/* ─── REAL-TIME ORDER NOTIFICATION TOASTS ─── */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-3 pointer-events-none" style={{ maxWidth: '360px', width: '90vw' }}>
        <AnimatePresence initial={false}>
          {orderNotifications.map((notif, idx) => (
            <motion.div
              key={notif.id}
              layout
              initial={{ opacity: 0, x: 120, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 120, scale: 0.88 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              className="pointer-events-auto w-full"
              style={{ zIndex: 200 - idx }}
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-green-100 overflow-hidden">
                {/* Green progress bar auto-dismiss indicator */}
                <motion.div
                  className="h-1 bg-gradient-to-r from-green-400 to-emerald-500"
                  initial={{ scaleX: 1, originX: 0 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 12, ease: 'linear' }}
                />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                      <ShoppingBag className="w-5 h-5 text-white" />
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded-full">New Order</span>
                        <span className="text-[9px] text-gray-400">{notif.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="font-black text-sm text-gray-900 leading-tight">{notif.label}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{notif.customerName} · {notif.itemCount} item{notif.itemCount !== 1 ? 's' : ''}</p>
                      {notif.items.length > 0 && (
                        <p className="text-[10px] text-gray-400 mt-1 truncate">
                          {notif.items.map(i => i.name).join(', ')}{(notif.items.length < (notif.itemCount)) ? '…' : ''}
                        </p>
                      )}
                    </div>
                    {/* Amount + dismiss */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-base font-black text-gray-900">₹{notif.totalAmount?.toFixed(2)}</span>
                      <button
                        onClick={() => dismissNotification(notif.id)}
                        className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                      >
                        <X className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ─── DESKTOP SIDEBAR ─── */}
      {!['settings', 'subscription', 'payments'].includes(activeTab) && (
        <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-border shadow-sm z-10 shrink-0 h-full">
          <SidebarContent />
        </aside>
      )}

      {/* ─── MOBILE SIDEBAR DRAWER ─── */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm lg:hidden" />
            <motion.aside initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 left-0 bottom-0 z-[120] w-[240px] bg-white border-r border-border shadow-2xl flex flex-col lg:hidden">
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header removed as requested */}

        {/* Header removed as requested */}

        {/* ─── MAIN CONTENT ─── */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 hide-print">
          <div className="max-w-[1600px] mx-auto pb-10">
            {activeTabError && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-600">
                {activeTabError}
              </div>
            )}

            {!isSubscribed && activeTab !== 'subscription' && (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50/50 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 shadow-lg shadow-rose-200">
                    <ShieldAlert className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-black text-rose-900 uppercase tracking-tight">Active Plan Required</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-rose-700/80">
                      Your subscription is currently inactive. You are in <span className="font-black underline">Read-Only Mode</span>. 
                      Ordering via QR codes is disabled and you cannot modify your menu or settings until you renew.
                    </p>
                    <button 
                      onClick={() => setActiveTab('subscription')}
                      className="mt-4 flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-md hover:bg-rose-700 transition"
                    >
                      Renew Subscription <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {showTabLoader ? (
              <div className="rounded-xl border border-border bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Loading {activeTabLabel}...
                </p>
              </div>
            ) : (
              <>
                {activeTab === 'orders' && (
                  <OrdersTab
                    filteredOrders={filteredOrders}
                    isAcceptingOrders={isAcceptingOrders}
                    actionLoading={actionLoading}
                    dateFilter={dateFilter}
                    customDate={customDate}
                    filterStatus={filterStatus}
                    STATUS_CONFIG={STATUS_CONFIG}
                    setIsSidebarOpen={setIsSidebarOpen}
                    toggleAcceptingOrders={toggleAcceptingOrders}
                    setDateFilter={setDateFilter}
                    setCustomDate={setCustomDate}
                    setFilterStatus={setFilterStatus}
                    handleOrderAction={handleOrderAction}
                  />
                )}
                
                {activeTab === 'menu' && (
                  <MenuTab
                    categories={categories}
                    menuItems={menuItems}
                    setIsSidebarOpen={setIsSidebarOpen}
                    setShowCategoryModal={setShowCategoryModal}
                    setShowItemModal={setShowItemModal}
                    setEditingCategoryId={setEditingCategoryId}
                    setNewCategory={setNewCategory}
                    setEditingItemId={setEditingItemId}
                    setNewItem={setNewItem}
                    handleDeleteCategory={handleDeleteCategory}
                    handleDeleteItem={handleDeleteItem}
                    isReadOnly={!isSubscribed}
                  />
                )}
                
                {activeTab === 'tables' && (
                  <TablesTab
                    tables={tables}
                    restaurant={restaurant}
                    addTableCount={addTableCount}
                    setAddTableCount={setAddTableCount}
                    actionLoading={actionLoading}
                    setIsSidebarOpen={setIsSidebarOpen}
                    handleAddTables={handleAddTables}
                    handleDeleteTable={handleDeleteTable}
                    handleDeleteAllTables={handleDeleteAllTables}
                    handlePrintAllQRs={handlePrintAllQRs}
                    downloadQR={downloadQR}
                    isReadOnly={!isSubscribed}
                  />
                )}
                
                {activeTab === 'analytics' && (
                  <AnalyticsTab
                    monthRevenue={monthRevenue}
                    totalOrdersCount={totalOrdersCount}
                    averageOrderValue={averageOrderValue}
                    setIsSidebarOpen={setIsSidebarOpen}
                  />
                )}
                
                {activeTab === 'payments' && (
                  <PaymentsTab
                    dailyEarnings={dailyEarnings}
                    earningsSummary={earningsSummary}
                    totalReceived={totalReceived}
                    thisMonthReceived={thisMonthReceived}
                    pendingAmount={pendingAmount}
                    lastPayment={lastPayment}
                    filteredPayouts={filteredPayouts}
                    payoutDateFilter={payoutDateFilter}
                    setPayoutDateFilter={setPayoutDateFilter}
                    payoutStatusFilter={payoutStatusFilter}
                    setPayoutStatusFilter={setPayoutStatusFilter}
                    setSelectedPayout={setSelectedPayout}
                    restaurant={restaurant}
                    setShowBankEdit={setShowBankEdit}
                    paymentInfoForm={paymentInfoForm}
                    setPaymentInfoForm={setPaymentInfoForm}
                    handleUpdatePayment={handleUpdatePayment}
                    paymentLoading={paymentLoading}
                    paymentError={paymentError}
                    paymentSuccess={paymentSuccess}
                    setActiveTab={setActiveTab}
                  />
                )}

                {activeTab === 'subscription' && (
                  <SubscriptionTab
                    restaurant={restaurant}
                    setIsSidebarOpen={setIsSidebarOpen}
                    setActiveTab={setActiveTab}
                  />
                )}

                {activeTab === 'settings' && (
                  <SettingsTab
                    restaurant={restaurant}
                    profileForm={profileForm}
                    updateProfileField={updateProfileField}
                    fileInputRef={fileInputRef}
                    handleLogoUpload={handleLogoUpload}
                    setShowPasswordModal={setShowPasswordModal}
                    setShowEmailModal={setShowEmailModal}
                    isAcceptingOrders={isAcceptingOrders}
                    openDaysCount={openDaysCount}
                    DAYS={DAYS}
                    selectedHourDay={selectedHourDay}
                    setSelectedHourDay={setSelectedHourDay}
                    hoursForm={hoursForm}
                    updateHoursField={updateHoursField}
                    saveOperatingHours={saveOperatingHours}
                    hoursError={hoursError}
                    hoursSuccess={hoursSuccess}
                    hoursSaving={hoursSaving}
                    profileLoading={profileLoading}
                    profileError={profileError}
                    profileSuccess={profileSuccess}
                    handleUpdateProfile={handleUpdateProfile}
                    pwForm={pwForm}
                    setPwForm={setPwForm}
                    pwError={pwError}
                    pwSuccess={pwSuccess}
                    pwLoading={pwLoading}
                    showPasswordModal={showPasswordModal}
                    handleChangePassword={handleChangePassword}
                    setActiveTab={setActiveTab}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showEmailModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowEmailModal(false)} className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md overflow-hidden border border-gray-200 bg-white shadow-2xl">
              <div className="border-b border-gray-200 bg-[#fbfaf7] px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400">Account Email</p>
                    <h3 className="mt-2 flex items-center gap-2 text-base font-black uppercase tracking-tight text-gray-950">
                      <Lock size={18} />
                      Change Email
                    </h3>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-gray-500">
                      Update your login email with a one-time verification code. Your current dashboard stays untouched until verification is complete.
                    </p>
                  </div>
                  <button type="button" onClick={() => setShowEmailModal(false)} className="rounded-md border border-gray-200 p-2 text-gray-400 transition hover:bg-white hover:text-gray-700">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="px-6 py-5">
                {pwError && <div className="mb-4 border border-red-200 bg-red-50 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-red-600">{pwError}</div>}
                {pwSuccess && <div className="mb-4 border border-green-200 bg-green-50 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-green-700">{pwSuccess}</div>}

                {emailModalMode === 'request' ? (
                  <form onSubmit={handleEmailChangeRequest} className="space-y-5">
                    <div className="border border-gray-200 bg-[#fbfaf7] px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center border border-gray-200 bg-white text-gray-900">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-900">Send Verification Email</p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">We will send a 6-digit OTP to the new email address before replacing your current login email.</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.24em] text-gray-400">New Email Address</label>
                      <input
                        type="email"
                        value={emailForm.newEmail}
                        onChange={e => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                        className="w-full border border-gray-300 bg-white px-3 py-3 text-sm outline-none transition focus:border-black"
                        placeholder="owner@restaurant.com"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowEmailModal(false)} className="flex-1 border border-gray-200 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 transition hover:border-gray-300 hover:text-gray-700">Cancel</button>
                      <button type="submit" disabled={pwLoading} className="flex flex-1 items-center justify-center gap-2 bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition disabled:opacity-50">
                        Send OTP
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleEmailChangeVerify} className="space-y-5">
                    <div className="border border-gray-200 bg-[#fbfaf7] px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-900">Verification Sent</p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">
                        Enter the 6-digit code sent to <span className="font-semibold text-gray-900">{emailForm.newEmail}</span>.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase tracking-[0.24em] text-gray-400">Verification Code</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={emailForm.otp}
                        onChange={e => setEmailForm({ ...emailForm, otp: e.target.value.replace(/\D/g, '') })}
                        className="w-full border border-gray-300 bg-white px-3 py-3 text-center text-lg font-black tracking-[0.45em] outline-none transition focus:border-black"
                        placeholder="123456"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setEmailModalMode('request')} className="flex-1 border border-gray-200 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 transition hover:border-gray-300 hover:text-gray-700">Back</button>
                      <button type="submit" disabled={pwLoading} className="flex flex-1 items-center justify-center gap-2 bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition disabled:opacity-50">
                        Verify Email
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {showPasswordModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPasswordModal(false)} className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white w-full max-w-sm p-6 rounded-xl shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-black tracking-tight uppercase flex items-center gap-2"><Lock size={18} /> Change Password</h3>
                <button type="button" onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-gray-100 transition rounded-md text-gray-400"><X size={18} /></button>
              </div>

              {pwError && <div className="mb-4 p-2 bg-red-50 text-red-600 text-[9px] font-bold uppercase rounded">{pwError}</div>}
              {pwSuccess && <div className="mb-4 p-2 bg-green-50 text-green-700 text-[9px] font-bold uppercase rounded">{pwSuccess}</div>}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Current Password</label>
                  <input type="password" value={pwForm.current} onChange={e => setPwForm({ ...pwForm, current: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">New Password</label>
                  <input type="password" value={pwForm.newPw} onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Confirm Password</label>
                  <input type="password" value={pwForm.confirm} onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none" required />
                </div>
                <div className="flex gap-2 mt-6">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-2 border border-gray-200 font-bold text-[10px] uppercase tracking-widest text-gray-500 rounded-lg">Cancel</button>
                  <button type="submit" disabled={pwLoading} className="flex-1 bg-black text-white py-2 font-bold text-[10px] uppercase tracking-widest rounded-lg">Confirm</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showItemModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowItemModal(false)} className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-white w-full max-w-xl p-5 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh] sm:p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-black tracking-tight uppercase">{editingItemId ? 'Edit Dish' : 'Dish draft'}</h3>
                <button onClick={() => setShowItemModal(false)} className="p-1 hover:bg-gray-100 transition rounded-md text-gray-400"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Name</label>
                  <input type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none" placeholder="e.g. Wagyu Burger" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Price (₹)</label>
                    <input type="number" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Dept</label>
                    <select value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none bg-white font-bold">
                      <option value="">Select...</option>
                      {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Descriptor</label>
                  <textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg min-h-[60px] outline-none" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Chatbot Tags</label>
                    <span className="text-[10px] font-semibold text-gray-400">{(newItem.tags || []).length} selected</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CHATBOT_CRAVING_TAGS.map((tag) => {
                      const isActive = (newItem.tags || []).includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleItemTag(tag)}
                          className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] transition ${
                            isActive
                              ? 'border-black bg-black text-white'
                              : 'border-gray-300 bg-white text-gray-600 hover:border-black hover:text-black'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] leading-5 text-gray-400">
                    These tags power the chatbot recommendations. Pick the tags that match this dish.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Diet Type</label>
                    <select value={newItem.dietType} onChange={e => setNewItem({ ...newItem, dietType: e.target.value })} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none bg-white font-bold">
                      <option value="veg">Veg</option>
                      <option value="non-veg">Non-Veg</option>
                      <option value="vegan">Vegan</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Image Upload</label>
                    <input type="file" accept="image/*" onChange={e => setNewItem({ ...newItem, imageFile: e.target.files[0] })} className="w-full px-3 py-1.5 text-xs border border-gray-300 rounded-lg outline-none bg-white" />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-8">
                <button onClick={() => setShowItemModal(false)} className="flex-1 py-2 border border-gray-200 font-bold text-[10px] uppercase tracking-widest text-gray-500 rounded-lg">Cancel</button>
                <button onClick={handleAddItem} disabled={actionLoading} className="flex-1 bg-black text-white py-2 font-bold text-[10px] uppercase tracking-widest rounded-lg disabled:opacity-50">
                  {editingItemId ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showCategoryModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCategoryModal(false)} className="absolute inset-0 bg-gray-900/30 backdrop-blur-sm" />
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-white w-full max-w-sm p-6 rounded-xl shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-black tracking-tight uppercase">New category</h3>
                <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-gray-100 transition rounded-md text-gray-400"><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Category Name</label>
                  <input type="text" value={newCategory} onChange={e => setNewCategory(e.target.value)} className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg outline-none" placeholder="e.g. Main Course" />
                </div>
              </div>
              <div className="flex gap-2 mt-8">
                <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-2 border border-gray-200 font-bold text-[10px] uppercase tracking-widest text-gray-500 rounded-lg">Cancel</button>
                <button onClick={handleAddCategory} className="flex-1 bg-black text-white py-2 font-bold text-[10px] uppercase tracking-widest rounded-lg">Create</button>
              </div>
            </motion.div>
          </div>
        )}

        <Modal
          open={Boolean(pinModalOrder)}
          onClose={closePinModal}
          title="Verify Customer PIN"
          description={pinModalOrder ? `Order #${pinModalOrder.orderIdString || pinModalOrder._id} is waiting for customer verification before completion.` : ''}
          actions={
            <>
              <button
                type="button"
                onClick={handleResendPin}
                disabled={pinSubmitting || pinResending}
                className="flex-1 rounded-2xl border border-[#cdbfaa] bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-[#554a3f] transition hover:bg-[#f2e9de] disabled:opacity-60"
              >
                {pinResending ? 'Sending...' : 'Resend PIN'}
              </button>
              <button
                type="button"
                onClick={handleVerifyPin}
                disabled={pinSubmitting || pinResending}
                className="flex-1 rounded-2xl bg-[#111111] px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-white transition hover:bg-[#2b2b2b] disabled:opacity-60"
              >
                {pinSubmitting ? 'Verifying...' : 'Complete Order'}
              </button>
            </>
          }
        >
          {pinModalOrder && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#d9cfbf] bg-white p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#6d655c]">Guest</p>
                <p className="mt-2 text-lg font-semibold text-[#111111]">{pinModalOrder.customerName}</p>
                <p className="mt-1 text-sm text-[#5c564e]">
                  {pinModalOrder.tableNumber ? `Table ${pinModalOrder.tableNumber}` : pinModalOrder.orderType || 'Takeaway'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-[0.22em] text-[#6d655c]">
                  Enter PIN
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={pinValue}
                  onChange={(event) => {
                    setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6));
                    if (pinError) setPinError('');
                    if (pinNotice) setPinNotice('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      handleVerifyPin();
                    }
                  }}
                  className="w-full rounded-2xl border border-[#cdbfaa] bg-white px-4 py-4 text-center font-mono text-2xl tracking-[0.5em] text-[#111111] outline-none transition focus:border-[#111111]"
                  placeholder="000000"
                />
                <p className="text-xs leading-5 text-[#6d655c]">
                  Ask the customer for the PIN from their confirmation email. The order completes only after a successful match.
                </p>
              </div>

              {pinError && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[#b91c1c]">
                  {pinError}
                </div>
              )}

              {pinNotice && (
                <div className="rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
                  {pinNotice}
                </div>
              )}
            </div>
          )}
        </Modal>
      </AnimatePresence>

      <style>{`
        @media print {
          body * { visibility: hidden; }
          .qr-container, .qr-container * { visibility: visible; }
          .qr-container {
            position: absolute; left: 0; top: 0;
            page-break-after: always; border: none !important;
            background: transparent !important;
          }
        }
      `}</style>
      {/* Payout Details Modal / Receipt View */}
      {selectedPayout && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedPayout(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden print:w-full print:shadow-none print:border-0 print:border-black print:text-black">

            <div className="p-6 border-b border-gray-100 flex items-center justify-between print:hidden">
              <h3 className="font-black tracking-tight text-lg text-gray-900">Payment Receipt</h3>
              <button onClick={() => setSelectedPayout(null)} className="p-1.5 hover:bg-gray-100 rounded-full transition"><X size={18} className="text-gray-500" /></button>
            </div>

            <div id="print-receipt" className="p-8 pb-10 bg-white">
              <div className="text-center mb-8">
                <Store className="w-10 h-10 text-black mx-auto mb-3" />
                <h2 className="text-xl font-black uppercase tracking-widest">{restaurant?.name || 'Restaurant'}</h2>
                <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-1">Payment Receipt</p>
              </div>

              <div className="flex justify-center mb-8">
                <div className="text-center">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 mb-1">Amount Sent to You</p>
                  <p className="text-4xl font-black tracking-tighter text-gray-900">₹{selectedPayout.amount.toLocaleString()}</p>
                  <span className={`inline-block mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${selectedPayout.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {selectedPayout.status === 'Paid' ? 'Money Sent ✓' : 'Not Yet Sent'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 border-t border-gray-100 pt-6">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400 tracking-wide uppercase">Date</span>
                  <span className="font-bold text-gray-900">{new Date(selectedPayout.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} {new Date(selectedPayout.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400 tracking-wide uppercase">How It Was Sent</span>
                  <span className="font-bold text-gray-900">{selectedPayout.method} Transfer</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400 tracking-wide uppercase">Payment For</span>
                  <span className="font-bold text-gray-900">{selectedPayout.type}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-400 tracking-wide uppercase">Transaction ID</span>
                  <span className="font-mono text-xs font-bold text-gray-900">{selectedPayout.referenceId || '—'}</span>
                </div>
                {selectedPayout.notes && (
                  <div className="pt-2">
                    <span className="block text-[10px] font-bold text-gray-400 tracking-wide uppercase mb-1">Note from QR Dining</span>
                    <span className="text-xs font-medium text-gray-600 bg-gray-50 p-2 block rounded italic">"{selectedPayout.notes}"</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between print:hidden">
              <button onClick={() => window.print()} className="flex items-center gap-2 flex-1 justify-center bg-black text-white py-3 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-gray-800 transition">
                <Download size={14} /> Download PDF
              </button>
            </div>

            {/* Minimal print styles targeting the receipt specifically */}
            <style jsx="true">{`
              @media print {
                body * { visibility: hidden; }
                #print-receipt, #print-receipt * { visibility: visible; }
                #print-receipt { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Edit Bank Information Modal */}
      {showBankEdit && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBankEdit(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="font-black tracking-tight text-lg text-gray-900 leading-none">My Bank / UPI Details</h3>
                <p className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-1.5">Tell us where to send your money</p>
              </div>
              <button onClick={() => setShowBankEdit(false)} className="p-2 hover:bg-gray-200 bg-gray-100 rounded-full transition"><X size={16} className="text-gray-600" /></button>
            </div>

            <div className="p-6 overflow-y-auto">
              {paymentError && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-[9px] font-bold uppercase tracking-widest rounded-lg">{paymentError}</div>}
              {paymentSuccess && <div className="mb-4 p-3 bg-green-50 border border-green-100 text-green-700 text-[9px] font-bold uppercase tracking-widest rounded-lg">{paymentSuccess}</div>}

              <form id="bank-form" onSubmit={(e) => { handleUpdatePayment(e); setTimeout(() => { if (!paymentError) setShowBankEdit(false) }, 1500) }} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-gray-600 mb-2 block">How do you want to receive money?</label>
                  <div className="flex gap-4">
                    {['upi', 'bank'].map((m) => (
                      <label key={m} className={`flex items-center justify-center flex-1 gap-2 p-3 border-2 rounded-xl cursor-pointer transition ${paymentInfoForm?.method === m ? 'border-black bg-gray-50' : 'border-gray-100 hover:border-gray-200'}`}>
                        <input type="radio" name="method" value={m} checked={paymentInfoForm?.method === m} onChange={e => setPaymentInfoForm({ ...paymentInfoForm, method: e.target.value })} className="hidden" />
                        <span className="text-xs font-black uppercase tracking-widest">
                          {m === 'bank' ? '🏦 Bank Transfer' : '📱 UPI (Instant)'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentInfoForm?.method === 'upi' && (
                  <div className="animate-fade-in space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block">Your UPI ID</label>
                    <input type="text" value={paymentInfoForm?.upiId} onChange={e => setPaymentInfoForm({ ...paymentInfoForm, upiId: e.target.value })} className="w-full px-4 py-3 text-xs border border-gray-200 shadow-sm rounded-xl outline-none focus:ring-1 focus:ring-black focus:border-black transition" placeholder="e.g. yourname@okicici" required />
                  </div>
                )}

                {paymentInfoForm?.method === 'bank' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Account Holder Name</label>
                      <input type="text" value={paymentInfoForm?.accountHolderName} onChange={e => setPaymentInfoForm({ ...paymentInfoForm, accountHolderName: e.target.value })} className="w-full px-4 py-2.5 text-xs border border-gray-200 shadow-sm rounded-lg outline-none focus:ring-1 focus:ring-black" placeholder="e.g. John Doe" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Bank Name</label>
                      <input type="text" value={paymentInfoForm?.bankName} onChange={e => setPaymentInfoForm({ ...paymentInfoForm, bankName: e.target.value })} className="w-full px-4 py-2.5 text-xs border border-gray-200 shadow-sm rounded-lg outline-none focus:ring-1 focus:ring-black" placeholder="e.g. HDFC Bank" required />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Account Number</label>
                      <input type="text" value={paymentInfoForm?.accountNumber} onChange={e => setPaymentInfoForm({ ...paymentInfoForm, accountNumber: e.target.value })} className="w-full px-4 py-2.5 text-xs border border-gray-200 shadow-sm rounded-lg outline-none focus:ring-1 focus:ring-black font-mono" required />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">IFSC Code</label>
                      <input type="text" value={paymentInfoForm?.ifscCode} onChange={e => setPaymentInfoForm({ ...paymentInfoForm, ifscCode: e.target.value })} className="w-full px-4 py-2.5 text-xs border border-gray-200 shadow-sm rounded-lg outline-none focus:ring-1 focus:ring-black font-mono uppercase" required />
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="p-4 border-t border-gray-100 flex items-center justify-end gap-3 bg-white">
              <button type="button" onClick={() => setShowBankEdit(false)} className="px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-black transition">Cancel</button>
              <button form="bank-form" type="submit" disabled={paymentLoading} className="bg-black text-white px-8 py-2.5 font-black uppercase text-[10px] tracking-widest hover:bg-gray-800 transition rounded-lg shadow-md disabled:opacity-50">
                {paymentLoading ? 'Saving...' : 'Save My Bank Details'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
