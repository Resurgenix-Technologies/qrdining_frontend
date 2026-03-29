import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { ordersApi, menuApi, tablesApi, restaurantApi } from '../utils/api';
import { io } from 'socket.io-client';
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
];

const STATUS_CONFIG = {
  new: { label: 'New', icon: Clock, next: 'preparing', bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  preparing: { label: 'Preparing', icon: ChefHat, next: 'ready', bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  ready: { label: 'Ready', icon: Package, next: 'completed', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  completed: { label: 'Done', icon: CheckCircle, next: null, bg: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400' },
};

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
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
  const [newItem, setNewItem] = useState({ name: '', price: '', categoryId: '', description: '', dietType: 'veg', imageFile: null });
  const [editingItemId, setEditingItemId] = useState(null);
  const [addTableCount, setAddTableCount] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [dateFilter, setDateFilter] = useState('today');
  const [customDate, setCustomDate] = useState('');
  const dateFilterRef = useRef(dateFilter);
  useEffect(() => { dateFilterRef.current = dateFilter; }, [dateFilter]);

  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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
    setIsAcceptingOrders(profile?.isAcceptingOrders !== false);

    if (profile?.operatingHours) {
      const oh = profile.operatingHours;
      const normalized = DAYS.reduce((acc, d) => ({
        ...acc,
        [d]: { open: oh[d]?.open || '09:00', close: oh[d]?.close || '22:00', isOpen: oh[d]?.isOpen !== false }
      }), {});
      setHoursForm(normalized);
    }

    setProfileForm({
      name: profile?.name || '',
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
      setOrders(ordersResult.value.orders || []);
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
      if (dateFilterRef.current === 'today') {
        setOrders(prev => [order, ...prev]);
      }
      setNewOrders(n => n + 1);

      // Show animated popup notification
      const notifId = `notif-${Date.now()}`;
      const itemCount = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
      const label = order.orderType === 'Takeaway'
        ? 'Takeaway'
        : order.tableNumber ? `Table ${order.tableNumber}` : 'Dine-In';
      const notif = {
        id: notifId,
        label,
        customerName: order.customerName || 'Guest',
        itemCount,
        totalAmount: order.totalAmount,
        items: (order.items || []).slice(0, 3),
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
      setOrders(prev => prev.map(o => (o._id === orderId || o.id === orderId) ? { ...o, orderStatus: status } : o));
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
    if (tab && (TABS.some(t => t.id === tab) || tab === 'payments' || tab === 'settings')) {
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
    } else if (activeTab === 'payments') {
      withTabRequest('payments', loadPaymentsData, { force: true });
    } else if (activeTab === 'settings') {
      withTabRequest('settings', loadSettingsData, { force: true });
    }
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

  const activeTabLabel = TABS.find(tab => tab.id === activeTab)?.label
    || (activeTab === 'payments' ? 'Payments' : activeTab === 'settings' ? 'Settings' : 'Dashboard');
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

  const toggleAcceptingOrders = async () => {
    setActionLoading(true);
    try {
      const newVal = !isAcceptingOrders;
      await restaurantApi.updateProfile({ isAcceptingOrders: newVal });
      setIsAcceptingOrders(newVal);
      setRestaurant(prev => ({ ...prev, isAcceptingOrders: newVal }));
    } catch (err) { alert('Failed to update status'); }
    finally { setActionLoading(false); }
  };

  const handleStatusUpdate = async (orderId, currentStatus) => {
    const nextStatus = STATUS_CONFIG[currentStatus]?.next;
    if (!nextStatus) return;
    try {
      await ordersApi.updateStatus(orderId, nextStatus);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: nextStatus } : o));
    } catch (err) { alert('Failed to update order'); }
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

  const handleAddItem = async () => {
    if (!newItem.name || !newItem.price || !newItem.categoryId) return;
    setActionLoading(true);
    try {
      let payload;
      if (newItem.imageFile) {
        payload = new FormData();
        payload.append('name', newItem.name);
        payload.append('price', newItem.price);
        payload.append('categoryId', newItem.categoryId);
        payload.append('description', newItem.description || '');
        payload.append('dietType', newItem.dietType || 'veg');
        payload.append('image', newItem.imageFile);
      } else {
        payload = {
          name: newItem.name,
          price: parseFloat(newItem.price),
          categoryId: newItem.categoryId,
          description: newItem.description,
          dietType: newItem.dietType
        };
      }

      if (editingItemId) {
        const item = await menuApi.updateItem(editingItemId, payload);
        setMenuItems(prev => prev.map(i => i._id === editingItemId ? item : i));
      } else {
        const item = await menuApi.createItem(payload);
        setMenuItems(prev => [...prev, item]);
      }
      setNewItem({ name: '', price: '', categoryId: '', description: '', dietType: 'veg', imageFile: null });
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
      const result = await tablesApi.bulkCreateTables(addTableCount, tables.length + 1, 'Table');
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

  const filteredOrders = filterStatus === 'all' ? orders : orders.filter(o => (o.orderStatus || 'new') === filterStatus);

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
              {restaurant?.name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-[7px] uppercase tracking-widest text-muted opacity-60">PROPRIETOR</p>
              <p className="text-[10px] font-bold truncate leading-tight text-gray-900">{restaurant?.name || 'Restaurant'}</p>
              {user?.email && <p className="text-[8px] truncate leading-tight text-gray-400">{user.email}</p>}
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
      <aside className={`hidden ${activeTab === 'payments' || activeTab === 'settings' ? '' : 'lg:flex'} flex-col w-56 bg-white border-r border-border shadow-sm z-10 shrink-0 h-full`}>
        <SidebarContent />
      </aside>

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

            {showTabLoader ? (
              <div className="rounded-xl border border-border bg-white px-6 py-12 text-center shadow-sm">
                <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  Loading {activeTabLabel}...
                </p>
              </div>
            ) : (
              <>

            {/* ── ORDERS ── */}
            {activeTab === 'orders' && (
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
                      {['all', 'new', 'preparing', 'ready', 'completed'].map(status => (
                        <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest transition rounded flex-1 sm:flex-none whitespace-nowrap ${filterStatus === status ? 'bg-black text-white shadow' : 'hover:bg-gray-50 text-gray-400'}`}>
                          {status}
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
                    const status = order.orderStatus || 'new';
                    const cfg = STATUS_CONFIG[status];
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

                        {cfg.next && (
                          <button onClick={() => handleStatusUpdate(order._id, status)} className="w-full bg-black text-white h-[42px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-800 transition flex items-center justify-center gap-2 rounded-[14px]">
                            {STATUS_CONFIG[cfg.next].label} <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'menu' && (
              <div className="animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-black text-white rounded-lg flex-shrink-0">
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Menu</h2>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowCategoryModal(true)} className="bg-white border border-border text-black px-4 py-2 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg hover:bg-gray-50 transition shadow-sm">
                      <Plus size={14} /> Add Category
                    </button>
                    <button onClick={() => setShowItemModal(true)} className="bg-black text-white px-4 py-2 font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 rounded-lg hover:bg-gray-800 transition shadow-sm">
                      <Plus size={14} /> Add Item
                    </button>
                  </div>
                </div>


                <div className="space-y-8">
                  {categories.map(cat => (
                    <div key={cat._id} className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-black text-sm uppercase tracking-widest text-gray-800">{cat.name}</h3>
                        <div className="flex items-center gap-1">
                          <button onClick={() => { setEditingCategoryId(cat._id); setNewCategory(cat.name); setShowCategoryModal(true); }} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded transition flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest border border-transparent hover:border-blue-100"><Edit size={12} /> Edit</button>
                          <button onClick={() => handleDeleteCategory(cat._id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest border border-transparent hover:border-red-100"><Trash2 size={12} /> Drop</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {menuItems.filter(i => i.categoryId === cat._id).map(item => (
                          <div key={item._id} className="bg-white border border-border p-4 rounded-lg flex flex-col hover:shadow-sm transition shadow-sm">
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="font-bold text-sm text-gray-900 truncate pr-2">{item.name}</h4>
                              <span className="font-black text-sm text-green-600">₹{item.price}</span>
                            </div>
                            <p className="text-[10px] text-gray-400 mb-3 line-clamp-2 min-h-[1.5rem] leading-tight">{item.description || '...'}</p>
                            <div className="flex items-center justify-between pt-3 border-t border-gray-50 mt-auto">
                              <div className="flex items-center gap-2">
                                {/* Diet indicator */}
                                {item.dietType === 'veg' && (
                                  <span title="Vegetarian" className="inline-flex items-center justify-center w-3.5 h-3.5 border border-green-600 flex-shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                  </span>
                                )}
                                {item.dietType === 'non-veg' && (
                                  <span title="Non-Vegetarian" className="inline-flex items-center justify-center w-3.5 h-3.5 border border-red-600 flex-shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                                  </span>
                                )}
                                {item.dietType === 'vegan' && (
                                  <span title="Vegan" className="inline-flex items-center justify-center w-3.5 h-3.5 border border-emerald-600 flex-shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                                  </span>
                                )}
                                <span className={`text-[8px] font-bold uppercase tracking-widest ${item.isAvailable ? 'text-green-500' : 'text-red-400'}`}>
                                  ● {item.isAvailable ? 'Online' : 'Offline'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => { setEditingItemId(item._id); setNewItem({ name: item.name, price: item.price, categoryId: item.categoryId, description: item.description || '', dietType: item.dietType || 'veg', imageFile: null }); setShowItemModal(true); }} className="text-gray-400 hover:text-blue-500 transition p-1 rounded-md hover:bg-blue-50"><Edit size={12} /></button>
                                <button onClick={() => handleDeleteItem(item._id)} className="text-gray-400 hover:text-red-500 transition p-1 rounded-md hover:bg-red-50"><Trash2 size={12} /></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'tables' && (
              <div className="animate-fade-in">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 bg-black text-white rounded-lg flex-shrink-0">
                      <Menu className="w-5 h-5" />
                    </button>
                    <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">Tables</h2>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    <button onClick={handlePrintAllQRs} className="flex-1 md:flex-none bg-white border border-border text-gray-700 px-3 py-1.5 font-bold uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-lg hover:bg-gray-50 transition shadow-sm">
                      <Printer size={12} /> Print
                    </button>
                    <button onClick={handleDeleteAllTables} className="flex-1 md:flex-none bg-red-50 border border-red-100 text-red-600 px-3 py-1.5 font-bold uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-lg hover:bg-red-100 transition shadow-sm">
                      <Trash2 size={12} /> Clear
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-border p-4 mb-6 flex flex-col sm:flex-row gap-3 items-end rounded-xl shadow-sm">
                  <div className="flex-1 w-full flex flex-col items-start">
                    <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block mb-1.5">Batch Count</label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white w-full sm:max-w-[120px] h-[34px]">
                      <button onClick={() => setAddTableCount(Math.max(1, addTableCount - 1))} className="w-10 h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition border-r border-gray-200 outline-none">
                        <Minus size={14} />
                      </button>
                      <input type="text" value={addTableCount} readOnly className="flex-1 px-2 text-xs font-black text-center outline-none bg-transparent w-full" />
                      <button onClick={() => setAddTableCount(Math.min(50, addTableCount + 1))} className="w-10 h-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 transition border-l border-gray-200 outline-none">
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <button onClick={handleAddTables} disabled={actionLoading} className="w-full sm:w-auto bg-black text-white px-6 py-1.5 h-[34px] font-bold uppercase text-[9px] tracking-widest flex items-center justify-center gap-2 rounded-lg hover:bg-gray-800 transition disabled:opacity-50">
                    <RefreshCw size={12} className={actionLoading ? 'animate-spin' : ''} /> Generate
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                  {tables.map(table => (
                    <div key={table._id} className="bg-white border border-border p-3 rounded-lg flex flex-col items-center hover:shadow-sm transition shadow-sm group">
                      <div className="bg-gray-50 p-2 mb-3 rounded-md border border-gray-100 qr-container">
                        <QRCodeSVG id={`qr-svg-${table._id}`} value={`${window.location.origin}/menu/${restaurant?.slug || 'default'}/table/${table.tableNumber}`} size={84} level="H" />
                      </div>
                      <div className="w-full mt-auto">
                        <p className="font-black text-xs tracking-tight border-t border-gray-50 pt-2 text-center mb-2">T-{table.tableNumber}</p>
                        <div className="flex justify-between items-center gap-1">
                          <button onClick={() => downloadQR(table.tableNumber, `qr-svg-${table._id}`)} className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 py-1 rounded text-[8px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-1">
                            <Download size={10} /> Save
                          </button>
                          <button onClick={() => handleDeleteTable(table._id)} className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
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
                    <div className="text-3xl font-black tracking-tight mb-2">₹{monthRevenue.toFixed(0)}</div>
                    <div className="text-[9px] font-bold text-green-400 flex items-center gap-1"><TrendingUp size={10} /> +22.4%</div>
                  </div>
                  <div className="bg-white border border-border p-6 rounded-xl">
                    <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">Throughput</p>
                    <div className="text-3xl font-black tracking-tight text-blue-600">{totalOrdersCount}</div>
                    <p className="text-[8px] font-bold uppercase text-gray-400 mt-2">Resolved Units</p>
                  </div>
                  <div className="bg-white border border-border p-6 rounded-xl">
                    <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500 mb-1">Processing</p>
                    <div className="text-3xl font-black tracking-tight text-amber-500">₹{averageOrderValue.toFixed(0)}</div>
                    <p className="text-[8px] font-bold uppercase text-gray-400 mt-2">Avg Order Value</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'payments' && (() => {
              const maxEarning = Math.max(...dailyEarnings.map(d => d.amount), 1);
              return (
                <div className="animate-fade-in space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl md:text-2xl font-black tracking-tighter uppercase leading-none">My Payments</h2>
                      </div>
                      <p className="text-[9px] text-gray-400 font-bold mt-2 ml-0 lg:ml-0">Money received from QR Dining after your daily sales</p>
                    </div>
                  </div>

                  {/* ── Top Summary: 6 cards ── */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* Today's Earning — most prominent */}
                    <div className="col-span-2 sm:col-span-1 lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white p-5 rounded-xl shadow-lg shadow-blue-500/20">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[9px] font-bold tracking-widest uppercase text-blue-200">Today's Sales</p>
                          <p className="text-[8px] text-blue-300 mt-0.5">{earningsSummary?.today?.orders || 0} orders received</p>
                        </div>
                        {earningsSummary?.today?.payoutStatus ? (
                          <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${earningsSummary.today.payoutStatus === 'Paid'
                              ? 'bg-green-400/20 text-green-200 border-green-400/30'
                              : 'bg-orange-400/20 text-orange-200 border-orange-400/30'
                            }`}>
                            {earningsSummary.today.payoutStatus === 'Paid' ? 'Money Sent ✓' : 'Awaiting Transfer'}
                          </span>
                        ) : (
                          <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-white/10 text-white/50 border border-white/20">
                            Not Yet Sent
                          </span>
                        )}
                      </div>
                      <div className="text-3xl font-black tracking-tighter">₹{(earningsSummary?.today?.amount || 0).toLocaleString()}</div>
                      <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />
                    </div>

                    <div className="col-span-2 sm:col-span-1 lg:col-span-2 relative overflow-hidden bg-white border border-border p-5 rounded-xl shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[9px] font-bold tracking-widest uppercase text-gray-500">Yesterday's Sales</p>
                          <p className="text-[8px] text-gray-400 mt-0.5">{earningsSummary?.yesterday?.orders || 0} orders received</p>
                        </div>
                        {earningsSummary?.yesterday?.payoutStatus ? (
                          <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${earningsSummary.yesterday.payoutStatus === 'Paid'
                              ? 'bg-green-100 text-green-700 border-green-200'
                              : 'bg-orange-100 text-orange-700 border-orange-200'
                            }`}>
                            {earningsSummary.yesterday.payoutStatus === 'Paid' ? 'Money Sent ✓' : 'Awaiting Transfer'}
                          </span>
                        ) : earningsSummary?.yesterday?.amount > 0 ? (
                          <span className="text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                            Not Sent Yet
                          </span>
                        ) : null}
                      </div>
                      <div className="text-3xl font-black tracking-tighter text-gray-800">₹{(earningsSummary?.yesterday?.amount || 0).toLocaleString()}</div>
                    </div>

                    {/* Total Received */}
                    <div className="bg-black text-white p-4 rounded-xl">
                      <p className="text-[8px] font-bold tracking-widest uppercase text-gray-400 mb-1">Total Money Received</p>
                      <div className="text-xl font-black tracking-tight">₹{totalReceived.toLocaleString()}</div>
                    </div>

                    {/* This Month */}
                    <div className="bg-white border border-border p-4 rounded-xl">
                      <p className="text-[8px] font-bold tracking-widest uppercase text-gray-500 mb-1">Received This Month</p>
                      <div className="text-xl font-black tracking-tight text-green-600">₹{thisMonthReceived.toLocaleString()}</div>
                    </div>

                    {/* Pending Clearance */}
                    <div className="bg-white border border-border p-4 rounded-xl">
                      <p className="text-[8px] font-bold tracking-widest uppercase text-gray-500 mb-1">Amount Due to You</p>
                      <div className="text-xl font-black tracking-tight text-amber-500">₹{pendingAmount.toLocaleString()}</div>
                    </div>

                    {/* Last Payment */}
                    <div className="bg-white border border-border p-4 rounded-xl">
                      <p className="text-[8px] font-bold tracking-widest uppercase text-gray-500 mb-1">Last Money Sent</p>
                      <div className="text-xs font-black tracking-tight text-gray-800 mt-1">
                        {lastPayment ? new Date(lastPayment.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                      </div>
                    </div>
                  </div>


                  {/* Daily Earnings Chart */}
                  <div className="bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Daily Sales — Last 30 Days</h3>
                        <p className="text-[9px] text-gray-400 mt-0.5">How much your restaurant earned from orders each day</p>
                      </div>
                      <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500 inline-block" />Sales Day</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200 inline-block" />No Orders</span>
                      </div>
                    </div>
                    <div className="p-4">
                      {/* Bar chart */}
                      <div className="flex items-end gap-[3px] h-24 w-full">
                        {dailyEarnings.map((day) => {
                          const heightPct = day.amount > 0 ? Math.max((day.amount / maxEarning) * 100, 8) : 0;
                          const date = new Date(day.date + 'T00:00:00');
                          const dayLabel = date.toLocaleDateString('en-IN', { day: '2-digit' });
                          const isToday = day.date === new Date().toISOString().slice(0, 10);
                          return (
                            <div key={day.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative" title={`${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ₹${day.amount.toLocaleString()} (${day.orders} orders)`}>
                              <div
                                className={`w-full rounded-t-sm transition-all duration-300 ${day.amount > 0
                                    ? isToday ? 'bg-blue-500 group-hover:bg-blue-600' : 'bg-green-500 group-hover:bg-green-600'
                                    : 'bg-gray-100 border-t border-gray-200'
                                  }`}
                                style={{ height: day.amount > 0 ? `${heightPct}%` : '10%' }}
                              />
                              {/* tooltip on hover */}
                              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[8px] font-bold px-1.5 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                                {day.amount > 0 ? `₹${day.amount.toLocaleString()}` : 'No orders'}
                                <br />{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis date labels - show only every 5th */}
                      <div className="flex gap-[3px] mt-1">
                        {dailyEarnings.map((day, i) => {
                          const date = new Date(day.date + 'T00:00:00');
                          const show = i === 0 || i === 7 || i === 14 || i === 21 || i === 29;
                          return (
                            <div key={day.date} className="flex-1 text-center">
                              {show && <span className="text-[7px] font-bold text-gray-400">{date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                        <div className="text-center">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Days With Sales</p>
                          <p className="text-sm font-black text-green-600">{dailyEarnings.filter(d => d.amount > 0).length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Days Without Orders</p>
                          <p className="text-sm font-black text-gray-400">{dailyEarnings.filter(d => d.amount === 0).length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Best Day So Far</p>
                          <p className="text-sm font-black text-gray-800">₹{Math.max(...dailyEarnings.map(d => d.amount)).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col lg:flex-row gap-6 items-start">

                    {/* Left: Payout History Table */}
                    <div className="flex-1 w-full bg-white border border-border rounded-xl overflow-hidden shadow-sm">
                      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/50">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
                          <ArrowRight size={14} className="text-gray-400" /> Payment History from QR Dining
                        </h3>
                        <div className="flex items-center gap-3">
                          <select value={payoutDateFilter} onChange={e => setPayoutDateFilter(e.target.value)} className="text-[9px] font-bold uppercase tracking-widest bg-white border border-gray-200 rounded px-2 py-1.5 outline-none">
                            <option value="all">All Time</option>
                            <option value="7_days">Last 7 Days</option>
                            <option value="this_month">This Month</option>
                          </select>
                          <select value={payoutStatusFilter} onChange={e => setPayoutStatusFilter(e.target.value)} className="text-[9px] font-bold uppercase tracking-widest bg-white border border-gray-200 rounded px-2 py-1.5 outline-none">
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs whitespace-nowrap">
                          <thead className="bg-gray-50/80 border-b border-gray-100 text-[8px] font-black tracking-widest uppercase text-gray-400">
                            <tr>
                              <th className="p-3 pl-4">Date</th>
                              <th className="p-3">Payment Type</th>
                              <th className="p-3 text-right">Amount</th>
                              <th className="p-3 pr-4 text-right">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {filteredPayouts.map(p => (
                              <tr key={p._id} onClick={() => setSelectedPayout(p)} className="hover:bg-gray-50/50 transition cursor-pointer group">
                                <td className="p-3 pl-4 text-gray-600 font-semibold">{new Date(p.createdAt).toLocaleDateString()}</td>
                                <td className="p-3">
                                  <span className="font-bold text-gray-900 block">{p.type}</span>
                                  <span className="text-[9px] text-gray-400">Ref: {p.referenceId || '—'}</span>
                                </td>
                                <td className="p-3 text-right font-black text-gray-900">₹{p.amount.toLocaleString()}</td>
                                <td className="p-3 pr-4 text-right">
                                  <span className={`inline-block text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-sm ${p.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {p.status === 'Paid' ? 'Received ✓' : 'Awaiting'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {filteredPayouts.length === 0 && (
                              <tr><td colSpan="4" className="p-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">No payments found for this filter</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Right: Bank Configurations Panel */}
                    <div className="w-full lg:w-80 shrink-0 space-y-4">
                      <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-800 flex items-center gap-2"><Banknote size={14} className="text-gray-400" /> Where to Send My Money</h3>
                          <button onClick={() => setShowBankEdit(true)} className="text-[9px] font-bold uppercase tracking-widest text-blue-600 hover:text-blue-800 border border-blue-200 bg-blue-50 px-2 py-1 rounded">Edit</button>
                        </div>

                        {restaurant?.paymentInfo?.method ? (
                          <div className="space-y-4">
                            <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg">
                              <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">How You Receive Money</p>
                              <p className="text-xs font-black text-gray-900">{restaurant.paymentInfo.method === 'upi' ? 'UPI Payment' : 'Bank Transfer'}</p>
                            </div>

                            {restaurant.paymentInfo.method === 'upi' ? (
                              <div className="px-1 space-y-1">
                                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Linked UPI ID</p>
                                <p className="text-xs font-mono font-bold text-gray-800">{restaurant.paymentInfo.upiId || 'Not Set'}</p>
                              </div>
                            ) : (
                              <div className="px-1 space-y-3">
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Account Holder Name</p>
                                  <p className="text-xs font-bold text-gray-800">{restaurant.paymentInfo.accountHolderName || 'Not Set'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Bank Name</p>
                                  <p className="text-xs font-bold text-gray-800">{restaurant.paymentInfo.bankName || 'Not Set'}</p>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400">Account Number</p>
                                  <p className="text-xs font-mono font-bold text-gray-800">
                                    {restaurant.paymentInfo.accountNumber ? `••••${restaurant.paymentInfo.accountNumber.slice(-4)}` : 'Not Set'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-6 bg-amber-50 border border-amber-100 rounded-lg">
                            <AlertCircle size={16} className="mx-auto text-amber-500 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700">No Bank Account Added</p>
                            <p className="text-[9px] text-amber-500 mt-1">Tap Edit to add your bank or UPI details</p>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {activeTab === 'settings' && (
              <div className="animate-fade-in max-w-7xl space-y-6">
                <div className="flex items-center gap-3 lg:hidden mb-2">
                  <h2 className="text-xl font-black tracking-tighter uppercase leading-none">Settings</h2>
                </div>
                <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-gradient-to-br from-[#f6f1e8] via-white to-[#eef3f1] shadow-[0_28px_70px_-40px_rgba(15,23,42,0.35)]">
                  <div className="grid gap-6 px-5 py-6 sm:px-7 lg:grid-cols-[minmax(0,1.35fr)_300px] lg:px-8 lg:py-8">
                    <div className="space-y-8">
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-gray-600 shadow-sm">
                            <Settings size={12} className="text-gray-500" />
                            Restaurant Settings
                          </span>
                          <div className="space-y-3">
                            <h2 className="text-2xl font-black uppercase tracking-[-0.06em] text-gray-950 md:text-4xl">
                              Shape how your brand feels before the first order arrives.
                            </h2>
                            <p className="max-w-2xl text-sm leading-6 text-gray-600">
                              Update your restaurant identity, customer-facing details, and operating rules from one clean control center.
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-10 items-center justify-center gap-2 rounded-[14px] border border-gray-200 bg-white px-5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-800 transition hover:border-black hover:text-black"
                          >
                            <Upload size={13} />
                            Upload Logo
                          </button>
                          <button
                            onClick={() => setShowPasswordModal(true)}
                            type="button"
                            className="flex h-10 items-center justify-center gap-2 rounded-[14px] bg-black px-5 text-[9px] font-black uppercase tracking-[0.15em] text-white transition hover:bg-gray-800"
                          >
                            <Lock size={13} />
                            Change Password
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-6 items-start rounded-2xl pt-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="group relative flex h-[110px] w-[110px] shrink-0 flex-col items-center justify-center gap-2 rounded-[24px] border border-black/5 bg-white shadow-sm transition hover:border-black/20"
                        >
                          {restaurant?.logo ? (
                            <img src={restaurant?.logo} alt="Logo" className="absolute inset-0 h-full w-full rounded-[24px] object-cover" />
                          ) : (
                            <>
                              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-black text-lg font-black text-white">
                                {profileForm?.name?.charAt(0) || restaurant?.name?.charAt(0) || 'R'}
                              </div>
                              <span className="text-[7.5px] font-black uppercase tracking-[0.1em] text-gray-500 group-hover:text-black">
                                Add Logo
                              </span>
                            </>
                          )}
                        </button>

                        <div className="space-y-4 flex-1">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Current Profile</p>
                            <h3 className="mt-1.5 text-xl font-black uppercase tracking-tight text-gray-950">
                              {profileForm?.name || restaurant?.name || 'Restaurant Name'}
                            </h3>
                            <p className="mt-1.5 text-[12px] text-gray-500 font-medium">
                              {profileForm?.description || restaurant?.description || 'Add a short description so customers immediately understand your style, cuisine, and atmosphere.'}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 mt-4">
                            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                              <Phone size={12} className="text-gray-400" />
                              {profileForm?.phone || restaurant?.phone || 'No phone added'}
                            </span>
                            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                              <MapPin size={12} className="text-gray-400" />
                              {profileForm?.address || restaurant?.address ? 'Location added' : 'Location incomplete'}
                            </span>
                            <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-transparent px-3 py-1.5 text-[9px] font-black text-gray-700">
                              <Tag size={12} className="text-gray-400" />
                              {profileForm?.cuisineTags || restaurant?.cuisineTags?.length > 0 ? 'Cuisine tags active' : '0 cuisine tags'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 font-medium pb-1">
                        Tap the logo tile to upload or replace your restaurant image without leaving settings.
                      </p>

                      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 self-start h-fit">
                      <div className="rounded-[22px] border border-black/10 bg-white/85 p-4 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Store Status</p>
                        <div className="mt-3 flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${isAcceptingOrders ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <p className="text-sm font-black uppercase tracking-wide text-gray-900">
                            {isAcceptingOrders ? 'Accepting Orders' : 'Paused'}
                          </p>
                        </div>
                      </div>
                      <div className="rounded-[22px] border border-black/10 bg-white/85 p-4 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Open Days</p>
                        <p className="mt-3 text-3xl font-black tracking-[-0.06em] text-gray-950">
                          {openDaysCount}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">Days active in current schedule</p>
                      </div>
                      <div className="rounded-[22px] border border-black/10 bg-white/85 p-4 shadow-sm">
                        <p className="text-[9px] font-black uppercase tracking-[0.26em] text-gray-400">Sync Mode</p>
                        <div className="mt-3 flex items-start gap-3">
                          <ShieldCheck size={16} className="mt-0.5 text-gray-400" />
                          <p className="text-[11px] font-bold uppercase tracking-widest leading-5 text-gray-600">
                            Automatic status sync is active. Hours update your live store availability.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {profileError && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-red-600 shadow-sm">{profileError}</div>}
                {profileSuccess && <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-green-700 shadow-sm">{profileSuccess}</div>}

                <form onSubmit={handleUpdateProfile} className="grid gap-5 pb-32 xl:grid-cols-[minmax(0,1fr)_370px]">

                  <div className="grid gap-6 xl:col-span-2 xl:grid-cols-[minmax(0,1fr)_370px]">

                    <div className="space-y-5">
                      {/* --- BRAND IDENTITY --- */}
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                              <Store size={15} /> Brand Identity
                            </h3>
                            <p className="mt-1 text-[13px] text-gray-500">Logo, name, and description shown across the storefront and dashboard.</p>
                          </div>
                          <span className="rounded-full bg-gray-100 px-3 py-1.5 text-[8px] font-black uppercase tracking-[0.15em] text-gray-600">Primary</span>
                        </div>
                        <div className="mb-5 border-t border-gray-100"></div>

                        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Restaurant Name</label>
                            <input
                              type="text"
                              value={profileForm?.name}
                              onChange={e => updateProfileField('name', e.target.value)}
                              className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                              placeholder="e.g. SHIMLA BIRYANI"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Restaurant Description</label>
                            <textarea
                              value={profileForm?.description}
                              onChange={e => updateProfileField('description', e.target.value)}
                              className="min-h-[50px] w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-black focus:bg-white resize-none"
                              placeholder="A brief overview of your restaurant..."
                            />
                          </div>
                        </div>
                      </div>

                      {/* --- CONTACT AND LOCATION --- */}
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="mb-4">
                          <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                            <MapPin size={15} /> Contact and Location
                          </h3>
                          <p className="mt-1 text-[13px] text-gray-500">Make sure customers can reach you easily and find the restaurant without friction.</p>
                        </div>
                        <div className="mb-5 border-t border-gray-100"></div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Contact Phone</label>
                            <input
                              type="text"
                              value={profileForm?.phone}
                              onChange={e => updateProfileField('phone', e.target.value)}
                              className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">City</label>
                            <input
                              type="text"
                              value={profileForm?.city}
                              onChange={e => updateProfileField('city', e.target.value)}
                              className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Pincode</label>
                            <input
                              type="text"
                              value={profileForm?.pincode}
                              onChange={e => updateProfileField('pincode', e.target.value)}
                              className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                            />
                          </div>
                        </div>
                        <div className="mt-4 space-y-1.5">
                          <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Street Address</label>
                          <textarea
                            value={profileForm?.address}
                            onChange={e => updateProfileField('address', e.target.value)}
                            className="min-h-[50px] w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-800 outline-none transition focus:border-black focus:bg-white resize-none"
                          />
                        </div>
                      </div>

                      {/* --- ADDITIONAL SPECS --- */}
                      <div className="rounded-[24px] border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
                        <div className="mb-4">
                          <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                            <Tag size={15} /> Additional Specs
                          </h3>
                          <p className="mt-1 text-[13px] text-gray-500">Extra metadata that helps with discoverability and customer messaging.</p>
                        </div>
                        <div className="mb-5 border-t border-gray-100"></div>

                        <div className="space-y-5">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Cuisine Tags (Comma Separated)</label>
                            <input
                              type="text"
                              value={profileForm?.cuisineTags}
                              onChange={e => updateProfileField('cuisineTags', e.target.value)}
                              className="w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white"
                              placeholder="Cafe"
                            />
                            <p className="text-[8px] font-black uppercase tracking-[0.1em] text-gray-400">Tags improve discoverability and categorization.</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Customer Message</label>
                            <textarea
                              value={profileForm?.customMessage}
                              onChange={e => updateProfileField('customMessage', e.target.value)}
                              className="min-h-[60px] w-full rounded-[14px] border border-gray-200 bg-[#FCFCFC] px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition focus:border-black focus:bg-white resize-none"
                              placeholder="Thank you for dining with us! We hope you enjoy your meal."
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* --- SECTION: Operating Hours --- */}
                    <div className="xl:sticky xl:top-24 xl:self-start">
                      <div className="overflow-hidden rounded-[26px] border border-gray-200 bg-white p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)]">
                        <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3">
                          <div>
                            <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-gray-950">
                              <Clock size={14} /> Opening Hours
                            </h3>
                            <p className="mt-0.5 text-[11px] text-gray-500">Set daily timings</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Select Day</label>
                            <select
                              value={selectedHourDay}
                              onChange={e => setSelectedHourDay(e.target.value)}
                              className="w-full appearance-none rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 outline-none transition hover:border-gray-300 focus:border-black capitalize"
                              style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em", paddingRight: "2.5rem" }}
                            >
                              {DAYS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>

                          <div className="rounded-[24px] border border-gray-100 bg-[#faf8f4] p-4 shadow-sm">
                            <div className="mb-4 flex items-center justify-between gap-3">
                              <p className="text-sm font-black uppercase tracking-[0.15em] text-gray-900">{selectedHourDay}</p>
                              {(() => {
                                const isDayOpen = hoursForm[selectedHourDay]?.isOpen !== false;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => updateHoursField(selectedHourDay, 'isOpen', !isDayOpen)}
                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDayOpen ? 'bg-[#00c853]' : 'bg-gray-200'}`}
                                  >
                                    <span className={`pointer-events-none inline-block h-[24px] w-[24px] transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDayOpen ? 'translate-x-5' : 'translate-x-0'}`} />
                                  </button>
                                );
                              })()}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Opens At</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="HH:MM"
                                    maxLength={5}
                                    value={hoursForm[selectedHourDay]?.open ?? '09:00'}
                                    disabled={hoursForm[selectedHourDay]?.isOpen === false}
                                    onChange={e => {
                                      const val = e.target.value.replace(/[^0-9:]/g, '');
                                      updateHoursField(selectedHourDay, 'open', val);
                                    }}
                                    onBlur={e => {
                                      let val = e.target.value.trim();
                                      if (val && !val.includes(':') && val.length <= 4) {
                                        if (val.length === 3) val = `0${val[0]}:${val.slice(1)}`;
                                        else if (val.length === 4) val = `${val.slice(0, 2)}:${val.slice(2)}`;
                                        else if (val.length <= 2) val = `${val.padStart(2, '0')}:00`;
                                        updateHoursField(selectedHourDay, 'open', val);
                                      } else if (val && val.includes(':')) {
                                        const [h, m] = val.split(':');
                                        val = `${(h || '00').padStart(2, '0')}:${(m || '00').padEnd(2, '0')}`;
                                        updateHoursField(selectedHourDay, 'open', val.slice(0, 5));
                                      }
                                    }}
                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-black disabled:bg-gray-50 disabled:text-gray-400"
                                  />
                                  <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                                </div>
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[9px] font-black uppercase tracking-[0.1em] text-gray-500">Closes At</label>
                                <div className="relative">
                                  <input
                                    type="text"
                                    placeholder="HH:MM"
                                    maxLength={5}
                                    value={hoursForm[selectedHourDay]?.close ?? '22:00'}
                                    disabled={hoursForm[selectedHourDay]?.isOpen === false}
                                    onChange={e => {
                                      const val = e.target.value.replace(/[^0-9:]/g, '');
                                      updateHoursField(selectedHourDay, 'close', val);
                                    }}
                                    onBlur={e => {
                                      let val = e.target.value.trim();
                                      if (val && !val.includes(':') && val.length <= 4) {
                                        if (val.length === 3) val = `0${val[0]}:${val.slice(1)}`;
                                        else if (val.length === 4) val = `${val.slice(0, 2)}:${val.slice(2)}`;
                                        else if (val.length <= 2) val = `${val.padStart(2, '0')}:00`;
                                        updateHoursField(selectedHourDay, 'close', val);
                                      } else if (val && val.includes(':')) {
                                        const [h, m] = val.split(':');
                                        val = `${(h || '00').padStart(2, '0')}:${(m || '00').padEnd(2, '0')}`;
                                        updateHoursField(selectedHourDay, 'close', val.slice(0, 5));
                                      }
                                    }}
                                    className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm font-semibold text-gray-900 outline-none transition focus:border-black disabled:bg-gray-50 disabled:text-gray-400"
                                  />
                                  <Clock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-4">
                          {hoursError && <p className="mb-2 text-[10px] font-bold text-red-600 uppercase tracking-widest">{hoursError}</p>}
                          {hoursSuccess && <p className="mb-2 text-[10px] font-bold text-green-600 uppercase tracking-widest">{hoursSuccess}</p>}
                          <button
                            type="button"
                            disabled={hoursSaving}
                            onClick={saveOperatingHours}
                            className="flex h-14 w-full items-center justify-center rounded-[20px] bg-black px-4 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-gray-900 disabled:opacity-50"
                          >
                            {hoursSaving ? 'Saving...' : 'Save Hours'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-3 z-10 xl:col-span-2">
                    <div className="flex flex-col gap-3 rounded-[24px] border border-gray-200 bg-white/90 p-3 shadow-[0_18px_60px_-40px_rgba(15,23,42,0.45)] backdrop-blur-md md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.28em] text-gray-400">Profile Sync</p>
                        <p className="mt-1 text-sm font-semibold text-gray-600">
                          Save your restaurant identity, contact details, tags, and customer messaging.
                        </p>
                      </div>
                      <button type="submit" disabled={profileLoading} className="flex h-14 items-center justify-center gap-2 rounded-[20px] bg-black px-8 text-xs font-black uppercase tracking-[0.15em] text-white transition hover:bg-gray-900 disabled:opacity-50">
                        <Save size={16} /> {profileLoading ? 'Updating...' : 'Update Configuration'}
                      </button>
                    </div>
                  </div>

                </form>
              </div>
            )}
              </>
            )}

          </div>
        </main>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
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
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="relative bg-white w-full max-w-md p-6 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-black tracking-tight uppercase">Dish draft</h3>
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
                <button onClick={handleAddItem} className="flex-1 bg-black text-white py-2 font-bold text-[10px] uppercase tracking-widest rounded-lg">Create</button>
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
