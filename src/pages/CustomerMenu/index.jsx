import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { paymentsApi, publicApi } from '../../utils/api';
import { openCashfreeCheckout } from '../../utils/cashfree';
import { isValidEmail } from '../../utils/auth';
import { AlertCircle } from 'lucide-react';

import ClosedPopup from './components/ClosedPopup';
import OrderConfirmed from './components/OrderConfirmed';
import MenuHeader from './components/MenuHeader';
import CategoryTabs from './components/CategoryTabs';
import DietFilters from './components/DietFilters';
import MenuList from './components/MenuList';
import CartBar from './components/CartBar';
import CheckoutPanel from './components/CheckoutPanel';

export default function CustomerMenu() {
  const { slug, tableNumber: routeTable } = useParams();
  const [tableNumber, setTableNumber] = useState(routeTable);

  const { state } = useLocation();

  const [restaurantData, setRestaurantData] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dietFilter, setDietFilter] = useState('all');

  // Cart state
  const [cart, setCart] = useState(() => {
    if (state?.cart) {
        return state.cart.map(item => ({
            id: item._id,
            name: item.name,
            price: item.price,
            qty: item.quantity
        }));
    }
    return [];
  });
  const [orderType, setOrderType] = useState('Takeaway');
  const [isCheckout, setIsCheckout] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(null);

  // Closed popup state
  const [showClosedPopup, setShowClosedPopup] = useState(false);

  // Extract table from hash fallback if path param missing
  useEffect(() => {
    if (routeTable) {
      setTableNumber(routeTable);
      setOrderType('Dine-In');
    } else if (window.location.hash) {
      const hashVal = window.location.hash.replace('#', '');
      if (hashVal && !isNaN(hashVal)) {
        setTableNumber(hashVal);
        setOrderType('Dine-In');
      }
    }
  }, [routeTable]);

  useEffect(() => {
    if (window.location.hash === '#checkout' && cart.length > 0) {
        setIsCheckout(true);
        // remove the hash
        window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    }
  }, [cart]);

  // Customer info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [formError, setFormError] = useState('');

  const clearVerificationParam = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('verifyOrderId');
    url.searchParams.delete('order_id');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const verifyExistingOrder = useCallback(async (orderId, fallbackPending = null) => {
    if (!orderId) return;

    setIsVerifyingPayment(true);
    setFormError('');

    try {
      const result = await paymentsApi.verifyOrder(orderId);

      if (result.status === 'paid' && result.order) {
        setPlacedOrder(result.order);
        setOrderPlaced(true);
        setPendingPayment(null);
        setCart([]);
        setIsCheckout(false);
        clearVerificationParam();
        return;
      }

      if (result.status === 'failed') {
        setPendingPayment(fallbackPending);
        setFormError('Payment was not completed. You can try again with the same checkout session.');
        clearVerificationParam();
        return;
      }

      setPendingPayment(fallbackPending);
      setFormError('Payment is still pending confirmation. Please wait a few seconds and try again.');
    } catch (err) {
      setPendingPayment(fallbackPending);
      setFormError(err.message || 'We could not verify your payment yet. Please try again.');
    } finally {
      setIsVerifyingPayment(false);
    }
  }, [clearVerificationParam]);

  // Load menu from real backend
  useEffect(() => {
    if (!slug) {
      setError('Invalid QR code — no restaurant found.');
      setLoading(false);
      return;
    }
    publicApi.getMenu(slug)
      .then(data => {
        setRestaurantData(data.restaurant);
        setMenu(data.menu || []);
        setIsSubscribed(data.restaurant?.isSubscribed !== false);
        if (data.menu && data.menu.length > 0) {
          setActiveCategory('all');
        }
        // Show closed popup immediately if restaurant is closed
        if (data.restaurant && !data.restaurant.isOpen) {
          setShowClosedPopup(true);
        }
      })
      .catch(err => {
        setError(err.message || 'Restaurant not found or unavailable.');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const verifyOrderId = new URLSearchParams(window.location.search).get('verifyOrderId');
    if (!verifyOrderId) {
      return;
    }

    verifyExistingOrder(verifyOrderId);
  }, [verifyExistingOrder]);

  // Category items before dietary filter
  const categoryItems = useMemo(() => {
    if (activeCategory === 'all') {
      return menu.flatMap(c => c.items.filter(i => i.isAvailable !== false));
    }
    const cat = menu.find(c => c._id === activeCategory);
    return cat ? cat.items.filter(i => i.isAvailable !== false) : [];
  }, [menu, activeCategory]);

  // Current items after dietary filter
  const currentItems = useMemo(() => {
    if (dietFilter === 'all') return categoryItems;
    return categoryItems.filter(i => i.dietType === dietFilter);
  }, [categoryItems, dietFilter]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.qty, 0), [cart]);
  const cartTotal = cartSubtotal;

  const addToCart = useCallback((item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item._id);
      if (existing) return prev.map(i => i.id === item._id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: item._id, name: item.name, price: item.price, qty: 1 }];
    });
  }, []);

  const updateQty = useCallback((id, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        return newQty > 0 ? { ...i, qty: newQty } : i;
      }
      return i;
    }).filter(i => i.qty > 0));
  }, []);

  // Handle checkout button click — show popup if closed
  const handleCheckoutClick = () => {
    if (!restaurantData?.isOpen) {
      setShowClosedPopup(true);
    } else {
      setIsCheckout(true);
    }
  };

  const startCheckout = async (checkoutPayload = null) => {
    const payload = checkoutPayload || pendingPayment;
    if (!payload) {
      setFormError('Payment session is unavailable. Please start checkout again.');
      return;
    }

    setFormError('');

    try {
      const checkoutResult = await openCashfreeCheckout({
        paymentSessionId: payload.paymentSessionId,
        mode: payload.mode,
      });

      if (checkoutResult?.error) {
        setFormError(checkoutResult.error.message || 'Unable to open the payment page. Please try again.');
        return;
      }

      await verifyExistingOrder(payload.orderId, payload);
    } catch (err) {
      setFormError(err.message || 'Failed to launch Cashfree checkout. Please try again.');
    }
  };

  const placeOrder = async () => {
    setFormError('');
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    const trimmedEmail = customerEmail.trim().toLowerCase();
    const phoneDigits = trimmedPhone.replace(/\D/g, '');

    if (!trimmedName) { setFormError('Please enter your name.'); return; }
    if (!trimmedPhone || phoneDigits.length < 10) { setFormError('Please enter a valid phone number.'); return; }
    if (!trimmedEmail) { setFormError('Please enter your email address.'); return; }
    if (!isValidEmail(trimmedEmail)) { setFormError('Please enter a valid email address.'); return; }
    if (cart.length === 0) return;

    setIsProcessing(true);
    try {
      const result = await paymentsApi.createOrder({
        restaurantId: restaurantData._id,
        customerName: trimmedName,
        customerPhone: trimmedPhone,
        customerEmail: trimmedEmail,
        tableNumber: orderType === 'Dine-In' && tableNumber ? parseInt(tableNumber) : null,
        specialInstructions: specialInstructions.trim(),
        returnUrl: window.location.href,
        items: cart.map(i => ({
          name: i.name,
          quantity: i.qty,
          unitPrice: i.price,
        })),
      });

      const pendingOrder = {
        orderId: result.orderId,
        orderDisplayId: result.orderDisplayId,
        cashfreeOrderId: result.cashfreeOrderId,
        paymentSessionId: result.paymentSessionId,
        mode: result.mode,
      };

      setPendingPayment(pendingOrder);
      await startCheckout(pendingOrder);
    } catch (err) {
      setFormError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Loading ───
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ─── Error ───
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-white/30 mx-auto mb-4" />
          <h1 className="text-white text-2xl font-bold mb-3">Unavailable</h1>
          <p className="text-white/40 text-xs">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Order Confirmed ───
  if (orderPlaced && placedOrder) {
    return (
      <OrderConfirmed
        placedOrder={placedOrder}
        tableNumber={tableNumber}
        resetOrder={() => { setOrderPlaced(false); setPlacedOrder(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Closed Restaurant Popup */}
      {showClosedPopup && (
        <ClosedPopup
          restaurantData={restaurantData}
          onClose={() => setShowClosedPopup(false)}
        />
      )}

      {/* Restaurant Header */}
      <MenuHeader
        restaurantData={restaurantData}
        tableNumber={tableNumber}
        setShowClosedPopup={setShowClosedPopup}
      />

      {/* Category Tabs */}
      <CategoryTabs
        menu={menu}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
      />

      {/* Diet Filters */}
      <DietFilters
        menu={menu}
        categoryItems={categoryItems}
        dietFilter={dietFilter}
        setDietFilter={setDietFilter}
      />

      {/* Menu Items */}
      <MenuList
        currentItems={currentItems}
        cart={cart}
        addToCart={addToCart}
        updateQty={updateQty}
        restaurantData={restaurantData}
        isSubscribed={isSubscribed}
      />

      {/* Cart Bar */}
      <CartBar
        cartCount={cartCount}
        isCheckout={isCheckout}
        cartSubtotal={cartSubtotal}
        handleCheckoutClick={handleCheckoutClick}
        isSubscribed={isSubscribed}
      />

      {/* Checkout Panel */}
      <CheckoutPanel
        isCheckout={isCheckout}
        setIsCheckout={setIsCheckout}
        orderType={orderType}
        setOrderType={setOrderType}
        tableNumber={tableNumber}
        cart={cart}
        updateQty={updateQty}
        customerName={customerName}
        setCustomerName={setCustomerName}
        customerPhone={customerPhone}
        setCustomerPhone={setCustomerPhone}
        customerEmail={customerEmail}
        setCustomerEmail={setCustomerEmail}
        specialInstructions={specialInstructions}
        setSpecialInstructions={setSpecialInstructions}
        formError={formError}
        setFormError={setFormError}
        pendingPayment={pendingPayment}
        startCheckout={startCheckout}
        placeOrder={placeOrder}
        isProcessing={isProcessing}
        isVerifyingPayment={isVerifyingPayment}
        cartTotal={cartTotal}
        isSubscribed={isSubscribed}
      />

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
      `}</style>
    </div>
  );
}
