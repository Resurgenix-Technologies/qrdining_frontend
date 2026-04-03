import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

import { paymentsApi, publicApi } from '../../utils/api';
import { openCashfreeCheckout } from '../../utils/cashfree';
import { isValidEmail } from '../../utils/auth';
import { focusAndScrollToField, getFriendlyErrorMessage } from '../../utils/errorHandling';
import { useToast } from '../../components/ui/ToastProvider';
import InlineAlert from '../../components/ui/InlineAlert';
import { SkeletonBlock, SkeletonText } from '../../components/ui/Skeleton';

import ClosedPopup from './components/ClosedPopup';
import OrderConfirmed from './components/OrderConfirmedSecure';
import MenuHeader from './components/MenuHeader';
import CategoryTabs from './components/CategoryTabs';
import DietFilters from './components/DietFilters';
import MenuList from './components/MenuListSecure';
import CartBar from './components/CartBarSecure';
import CheckoutPanel from './components/CheckoutPanelSecure';

const MENU_REFRESH_MS = 30000;
const PAYMENT_VERIFY_RETRY_MS = 4000;
const MAX_PAYMENT_VERIFY_ATTEMPTS = 2;

const FIELD_LABELS = {
  customerName: 'Name',
  customerPhone: 'Phone number',
  customerEmail: 'Email address',
  paymentMethod: 'Payment method',
  orderType: 'Order type',
};

function sanitizePendingPayment(pendingPayment) {
  if (!pendingPayment || typeof pendingPayment !== 'object') return null;

  const orderRef = typeof pendingPayment.orderRef === 'string' ? pendingPayment.orderRef.trim() : '';
  const paymentSessionId = typeof pendingPayment.paymentSessionId === 'string' ? pendingPayment.paymentSessionId.trim() : '';

  if (!orderRef || !paymentSessionId) return null;

  return {
    orderRef,
    orderDisplayId: typeof pendingPayment.orderDisplayId === 'string' ? pendingPayment.orderDisplayId.trim() : '',
    paymentSessionId,
    mode: pendingPayment.mode === 'production' ? 'production' : 'sandbox',
    checkoutFingerprint: typeof pendingPayment.checkoutFingerprint === 'string' ? pendingPayment.checkoutFingerprint : '',
    cartSnapshot: normalizeIncomingCart(pendingPayment.cartSnapshot || []),
    formSnapshot: typeof pendingPayment.formSnapshot === 'object' && pendingPayment.formSnapshot
      ? pendingPayment.formSnapshot
      : null,
    orderType: pendingPayment.orderType === 'Dine-In' ? 'Dine-In' : 'Takeaway',
  };
}

function readCheckoutDraft(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function buildCheckoutFingerprint({ cart, formValues, orderType, tableToken }) {
  const normalizedItems = (Array.isArray(cart) ? cart : [])
    .map((item) => ({
      id: String(item.id || ''),
      qty: Number.parseInt(item.qty ?? item.quantity ?? 0, 10) || 0,
    }))
    .filter((item) => item.id && item.qty > 0)
    .sort((left, right) => left.id.localeCompare(right.id));

  return JSON.stringify({
    items: normalizedItems,
    customerName: String(formValues?.customerName || '').trim(),
    customerPhone: String(formValues?.customerPhone || '').replace(/\D/g, '').slice(-10),
    customerEmail: String(formValues?.customerEmail || '').trim().toLowerCase(),
    specialInstructions: String(formValues?.specialInstructions || '').trim(),
    paymentMethod: String(formValues?.paymentMethod || '').trim(),
    orderType: orderType === 'Dine-In' ? 'Dine-In' : 'Takeaway',
    tableToken: orderType === 'Dine-In' ? String(tableToken || '') : '',
  });
}

function normalizeIncomingCart(cart = []) {
  if (!Array.isArray(cart)) return [];

  return cart
    .map((item) => {
      const qty = Number.parseInt(item.qty ?? item.quantity ?? 1, 10);
      const price = Number(item.price);
      const id = item.id || item.publicId || item.menuItemId || '';

      if (!id || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(price)) {
        return null;
      }

      return {
        id,
        name: item.name || 'Menu item',
        price,
        qty,
      };
    })
    .filter(Boolean);
}

function mergeMenuCategories(menu = []) {
  const categoryMap = new Map();

  menu.forEach((category) => {
    if (!category?.id) return;

    const normalizedName = String(category.name || '').trim().toLowerCase();
    const mergeKey = normalizedName || category.id;
    const existing = categoryMap.get(mergeKey);

    if (!existing) {
      categoryMap.set(mergeKey, {
        ...category,
        items: Array.isArray(category.items) ? [...category.items] : [],
      });
      return;
    }

    const seenItemIds = new Set(existing.items.map((item) => item.id));
    (category.items || []).forEach((item) => {
      if (!item?.id || seenItemIds.has(item.id)) return;
      existing.items.push(item);
      seenItemIds.add(item.id);
    });
  });

  return Array.from(categoryMap.values());
}

function MenuSkeleton() {
  return (
    <div className="surface-grid min-h-screen px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <SkeletonBlock className="h-24 rounded-[32px]" />
        <SkeletonBlock className="h-14 rounded-[28px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="glass-panel p-4">
              <SkeletonBlock className="h-48 rounded-[24px]" />
              <SkeletonBlock className="mt-4 h-5 w-2/3" />
              <SkeletonText lines={2} className="mt-3" />
              <SkeletonBlock className="mt-5 h-11 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getCheckoutErrors({ formValues, orderType, hasValidatedTable, cartLength }) {
  const errors = {};
  const trimmedName = formValues.customerName.trim();
  const trimmedPhone = formValues.customerPhone.trim();
  const trimmedEmail = formValues.customerEmail.trim().toLowerCase();
  const phoneDigits = trimmedPhone.replace(/\D/g, '');

  if (!trimmedName) errors.customerName = 'Please enter your name.';
  if (!trimmedPhone) {
    errors.customerPhone = 'Please enter your phone number.';
  } else if (phoneDigits.length < 10) {
    errors.customerPhone = 'Please enter a valid phone number.';
  }

  if (!trimmedEmail) {
    errors.customerEmail = 'Please enter your email address.';
  } else if (!isValidEmail(trimmedEmail)) {
    errors.customerEmail = 'Please enter a valid email address.';
  }

  if (!formValues.paymentMethod) {
    errors.paymentMethod = 'Please select a payment method.';
  }

  if (orderType === 'Dine-In' && !hasValidatedTable) {
    errors.orderType = 'Please use a valid dine-in QR code or switch to takeaway.';
  }

  if (!cartLength) {
    errors.cart = 'Your cart is empty.';
  }

  return errors;
}

export default function CustomerMenuSecure() {
  const { slug, qrToken } = useParams();
  const { state } = useLocation();
  const toast = useToast();
  const checkoutStorageKey = useMemo(
    () => `qr-checkout:${slug || 'unknown'}:${qrToken || 'takeaway'}`,
    [slug, qrToken],
  );
  const savedCheckoutDraft = useMemo(() => readCheckoutDraft(checkoutStorageKey), [checkoutStorageKey]);
  const incomingCart = useMemo(
    () => (state?.cart ? normalizeIncomingCart(state.cart) : []),
    [state?.cart],
  );
  const restoredCart = useMemo(
    () => normalizeIncomingCart(savedCheckoutDraft?.cart || savedCheckoutDraft?.pendingPayment?.cartSnapshot || []),
    [savedCheckoutDraft],
  );
  const restoredPendingPayment = useMemo(
    () => sanitizePendingPayment(savedCheckoutDraft?.pendingPayment),
    [savedCheckoutDraft],
  );

  const [tableNumber, setTableNumber] = useState(null);
  const [validatedTableToken, setValidatedTableToken] = useState('');
  const hasValidatedTable = Boolean(validatedTableToken);

  const [restaurantData, setRestaurantData] = useState(null);
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscribed, setIsSubscribed] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [dietFilter, setDietFilter] = useState('all');

  const [cart, setCart] = useState(() => (incomingCart.length ? incomingCart : restoredCart));
  const [orderType, setOrderType] = useState(() => savedCheckoutDraft?.orderType || 'Takeaway');
  const [isCheckout, setIsCheckout] = useState(() => Boolean(savedCheckoutDraft?.isCheckout));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrder, setPlacedOrder] = useState(null);
  const [pendingPayment, setPendingPayment] = useState(() => restoredPendingPayment);
  const [showClosedPopup, setShowClosedPopup] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [checkoutAlert, setCheckoutAlert] = useState(null);

  const [formValues, setFormValues] = useState({
    customerName: savedCheckoutDraft?.formValues?.customerName || '',
    customerPhone: savedCheckoutDraft?.formValues?.customerPhone || '',
    customerEmail: savedCheckoutDraft?.formValues?.customerEmail || '',
    specialInstructions: savedCheckoutDraft?.formValues?.specialInstructions || '',
    paymentMethod: savedCheckoutDraft?.formValues?.paymentMethod || 'cashfree',
  });
  const [fieldErrors, setFieldErrors] = useState({});

  const pendingPaymentRef = useRef(pendingPayment);
  const startCheckoutRef = useRef(null);
  const verifyTimeoutRef = useRef(null);

  useEffect(() => {
    let active = true;

    if (!slug || !qrToken) {
      setValidatedTableToken('');
      setTableNumber(null);
      setOrderType('Takeaway');
      return undefined;
    }

    publicApi.getContext(slug, qrToken)
      .then((data) => {
        if (!active) return;
        setValidatedTableToken(data.table?.token || '');
        setTableNumber(data.table?.number || null);
        setOrderType('Dine-In');
      })
      .catch(() => {
        if (!active) return;
        setValidatedTableToken('');
        setTableNumber(null);
        setOrderType('Takeaway');
        setCheckoutAlert({
          title: 'Invalid dine-in QR',
          message: 'This QR code is no longer valid for dine-in ordering. You can continue with takeaway instead.',
          variant: 'error',
        });
      });

    return () => {
      active = false;
    };
  }, [slug, qrToken]);

  useEffect(() => {
    if (window.location.hash === '#checkout' && cart.length > 0) {
      setIsCheckout(true);
      window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    }
  }, [cart]);

  useEffect(() => {
    pendingPaymentRef.current = pendingPayment;
  }, [pendingPayment]);

  const clearScheduledVerification = useCallback(() => {
    if (verifyTimeoutRef.current) {
      window.clearTimeout(verifyTimeoutRef.current);
      verifyTimeoutRef.current = null;
    }
  }, []);

  const clearVerificationParam = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('orderRef');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const clearCheckoutDraft = useCallback(() => {
    if (typeof window === 'undefined' || !checkoutStorageKey) return;
    window.sessionStorage.removeItem(checkoutStorageKey);
  }, [checkoutStorageKey]);

  const verifyExistingOrder = useCallback(async (orderRef, fallbackPending = null, options = {}) => {
    if (!orderRef) return;

    const { attempt = 0, manual = false } = options;
    const activePending = sanitizePendingPayment(fallbackPending || pendingPaymentRef.current);

    clearScheduledVerification();
    setIsVerifyingPayment(true);
    if (manual || attempt === 0) {
      setCheckoutAlert(null);
    }

    try {
      const result = await paymentsApi.verifyOrder(orderRef);

      if (result.status === 'paid' && result.order) {
        clearScheduledVerification();
        setPlacedOrder(result.order);
        setOrderPlaced(true);
        setPendingPayment(null);
        setCart([]);
        setIsCheckout(false);
        clearVerificationParam();
        clearCheckoutDraft();
        toast.success('Order placed successfully', 'Payment is verified and the kitchen has your order.', { duration: 3200 });
        return;
      }

      if (result.status === 'failed') {
        setPendingPayment(activePending);
        setCheckoutAlert({
          title: result.canRetry ? 'Payment not completed' : 'Payment session ended',
          message: result.canRetry
            ? 'The payment was not completed. Your cart and details are saved, and you can safely retry the same secure payment session.'
            : 'The earlier payment session is no longer reusable. Your cart and details are still here, so you can place the order again to create a fresh secure payment session.',
          variant: 'error',
          onRetry: result.canRetry && activePending ? () => startCheckoutRef.current?.(activePending) : undefined,
          retryLabel: result.canRetry ? 'Retry Payment' : undefined,
          secondaryAction: !result.canRetry
            ? () => {
              setCheckoutAlert(null);
              setIsCheckout(true);
            }
            : () => verifyExistingOrder(orderRef, activePending, { manual: true }),
          secondaryLabel: result.canRetry ? 'Check Status' : 'Review Checkout',
        });
        clearVerificationParam();
        return;
      }

      setPendingPayment(activePending);
      if (attempt < MAX_PAYMENT_VERIFY_ATTEMPTS) {
        verifyTimeoutRef.current = window.setTimeout(() => {
          verifyExistingOrder(orderRef, activePending, { attempt: attempt + 1 });
        }, PAYMENT_VERIFY_RETRY_MS);
      }

      setCheckoutAlert({
        title: 'Payment pending confirmation',
        message: attempt < MAX_PAYMENT_VERIFY_ATTEMPTS
          ? 'The payment is still being confirmed. We will keep checking automatically for a few seconds, and you can also check again manually.'
          : 'The payment is still being confirmed. Your cart and checkout details are safe, so you can check again or reopen the payment page.',
        variant: 'offline',
        onRetry: () => verifyExistingOrder(orderRef, activePending, { manual: true }),
        retryLabel: 'Check Again',
        secondaryAction: result.canRetry && activePending ? () => startCheckoutRef.current?.(activePending) : undefined,
        secondaryLabel: result.canRetry && activePending ? 'Reopen Payment' : undefined,
      });
      clearVerificationParam();
    } catch (err) {
      setPendingPayment(activePending);
      setCheckoutAlert({
        title: 'Verification issue',
        message: getFriendlyErrorMessage(err, 'We could not verify your payment yet. Your cart and payment attempt are still saved, so you can check again or reopen the payment page.'),
        variant: 'error',
        onRetry: () => verifyExistingOrder(orderRef, activePending, { manual: true }),
        retryLabel: 'Check Again',
        secondaryAction: activePending ? () => startCheckoutRef.current?.(activePending) : undefined,
        secondaryLabel: activePending ? 'Reopen Payment' : undefined,
      });
      clearVerificationParam();
    } finally {
      setIsVerifyingPayment(false);
    }
  }, [clearCheckoutDraft, clearScheduledVerification, clearVerificationParam, toast]);

  const loadMenuSnapshot = useCallback(async ({ silent = false } = {}) => {
    if (!slug) {
      setError('Invalid QR code - no restaurant found.');
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);

    try {
      const data = await publicApi.getMenu(slug);
      setRestaurantData((prev) => {
        if (prev?.isOpen !== false && data.restaurant && !data.restaurant.isOpen) {
          setShowClosedPopup(true);
          toast.info('Restaurant closed', 'New orders are currently paused for this restaurant.', { duration: 2800 });
        }
        return data.restaurant;
      });
      setMenu(data.menu || []);
      setIsSubscribed(data.restaurant?.isSubscribed !== false);
      if ((data.menu || []).length > 0) {
        setActiveCategory((prev) => prev || 'all');
      }
      setError(null);
    } catch (err) {
      setError(getFriendlyErrorMessage(err, 'Restaurant not found or unavailable.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    loadMenuSnapshot();
  }, [loadMenuSnapshot]);

  useEffect(() => {
    if (!slug) return undefined;

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadMenuSnapshot({ silent: true });
      }
    }, MENU_REFRESH_MS);

    return () => window.clearInterval(interval);
  }, [slug, loadMenuSnapshot]);

  useEffect(() => {
    const orderRef = new URLSearchParams(window.location.search).get('orderRef');
    if (!orderRef) return;
    verifyExistingOrder(orderRef, pendingPaymentRef.current);
  }, [verifyExistingOrder]);

  const normalizedMenu = useMemo(() => mergeMenuCategories(menu), [menu]);

  useEffect(() => {
    if (!normalizedMenu.length) return;

    if (activeCategory !== 'all' && !normalizedMenu.some((category) => category.id === activeCategory)) {
      setActiveCategory('all');
    }
  }, [normalizedMenu, activeCategory]);

  const categoryItems = useMemo(() => {
    if (activeCategory === 'all') {
      return normalizedMenu.flatMap((category) => category.items.filter((item) => item.isAvailable !== false));
    }
    const category = normalizedMenu.find((entry) => entry.id === activeCategory);
    return category ? category.items.filter((item) => item.isAvailable !== false) : [];
  }, [normalizedMenu, activeCategory]);

  const currentItems = useMemo(() => {
    if (dietFilter === 'all') return categoryItems;
    return categoryItems.filter((item) => item.dietType === dietFilter);
  }, [categoryItems, dietFilter]);

  const itemLookup = useMemo(() => {
    const map = new Map();
    normalizedMenu.forEach((category) => {
      (category.items || []).forEach((item) => {
        map.set(item.id, item);
      });
    });
    return map;
  }, [normalizedMenu]);

  useEffect(() => {
    if (!cart.length || itemLookup.size === 0) return;

    let removedNames = [];
    let updatedCount = 0;
    setCart((prev) => {
      const nextCart = [];

      prev.forEach((cartItem) => {
        const currentItem = itemLookup.get(cartItem.id);
        const shouldRemove = !currentItem || currentItem.isAvailable === false;

        if (shouldRemove) {
          removedNames.push(currentItem?.name || cartItem.name);
        }

        if (!shouldRemove) {
          const syncedItem = {
            ...cartItem,
            name: currentItem.name || cartItem.name,
            price: Number.isFinite(Number(currentItem.price)) ? Number(currentItem.price) : cartItem.price,
          };

          if (syncedItem.name !== cartItem.name || syncedItem.price !== cartItem.price) {
            updatedCount += 1;
          }

          nextCart.push(syncedItem);
        }
      });

      return removedNames.length || updatedCount ? nextCart : prev;
    });

    if (removedNames.length) {
      toast.error(
        removedNames.length === 1 ? 'Item removed from cart' : 'Items removed from cart',
        removedNames.length === 1
          ? `${removedNames[0]} is no longer available for checkout and was removed from your cart.`
          : `${removedNames.length} cart items are no longer available for checkout and were removed.`,
        { duration: 3200 },
      );
    }

    if (updatedCount && !removedNames.length) {
      toast.info('Cart updated', 'Your cart was refreshed with the latest menu prices and item details.', {
        duration: 2600,
      });
    }
  }, [cart.length, itemLookup, toast]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const cartTotal = cartSubtotal;
  const isRestaurantOpen = restaurantData?.isOpen !== false;
  const chatPath = validatedTableToken ? `/chat/${slug}/${validatedTableToken}` : null;
  const checkoutFingerprint = useMemo(() => buildCheckoutFingerprint({
    cart,
    formValues,
    orderType,
    tableToken: validatedTableToken,
  }), [cart, formValues, orderType, validatedTableToken]);

  useEffect(() => {
    if (!checkoutStorageKey || typeof window === 'undefined') return;

    const hasFormDraft = ['customerName', 'customerPhone', 'customerEmail', 'specialInstructions']
      .some((field) => String(formValues[field] || '').trim());

    if (!cart.length && !pendingPayment && !isCheckout && !hasFormDraft) {
      clearCheckoutDraft();
      return;
    }

    window.sessionStorage.setItem(checkoutStorageKey, JSON.stringify({
      cart,
      orderType,
      isCheckout,
      formValues,
      pendingPayment,
    }));
  }, [cart, checkoutStorageKey, clearCheckoutDraft, formValues, isCheckout, orderType, pendingPayment]);

  useEffect(() => {
    if (!pendingPayment?.checkoutFingerprint) return;
    if (pendingPayment.checkoutFingerprint === checkoutFingerprint) return;

    clearScheduledVerification();
    setPendingPayment(null);
    setCheckoutAlert((prev) => prev || {
      title: 'Please place your order again',
      message: 'Your cart or checkout details were updated, so we cleared the earlier payment step to keep everything correct. Please tap Place Order again to continue.',
      variant: 'offline',
    });
  }, [checkoutFingerprint, clearScheduledVerification, pendingPayment]);

  useEffect(() => {
    if (!restoredPendingPayment || incomingCart.length) return;
    setIsCheckout((prev) => prev || Boolean(savedCheckoutDraft?.isCheckout || restoredPendingPayment));
    setCheckoutAlert((prev) => prev || {
      title: 'Checkout restored',
      message: 'Your previous payment attempt and cart were restored. You can continue payment or check the payment status safely.',
      variant: 'offline',
      onRetry: () => startCheckoutRef.current?.(restoredPendingPayment),
      retryLabel: 'Continue Payment',
      secondaryAction: () => verifyExistingOrder(restoredPendingPayment.orderRef, restoredPendingPayment, { manual: true }),
      secondaryLabel: 'Check Status',
    });
  }, [incomingCart.length, restoredPendingPayment, savedCheckoutDraft, verifyExistingOrder]);

  useEffect(() => () => {
    clearScheduledVerification();
  }, [clearScheduledVerification]);

  const addToCart = useCallback((item) => {
    if (!isRestaurantOpen) {
      setShowClosedPopup(true);
      toast.error('Restaurant closed', 'This restaurant is not accepting new orders right now.');
      return;
    }

    setCart((prev) => {
      const existing = prev.find((entry) => entry.id === item.id);
      if (existing) {
        return prev.map((entry) => entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });

    toast.success('Added to cart', `${item.name} is ready for checkout.`, { duration: 2200 });
  }, [isRestaurantOpen, toast]);

  const updateQty = useCallback((id, delta) => {
    setCart((prev) => prev.flatMap((entry) => {
      if (entry.id !== id) {
        return [entry];
      }

      const newQty = entry.qty + delta;
      return newQty > 0 ? [{ ...entry, qty: newQty }] : [];
    }));
  }, []);

  const handleCheckoutClick = () => {
    if (!cart.length) {
      toast.info('Cart is empty', 'Add at least one item before opening checkout.');
      return;
    }
    if (!isRestaurantOpen) {
      setShowClosedPopup(true);
      return;
    }
    setIsCheckout(true);
  };

  const validateAllFields = useCallback((currentFormValues = formValues) => {
    const errors = getCheckoutErrors({
      formValues: currentFormValues,
      orderType,
      hasValidatedTable,
      cartLength: cart.length,
    });
    setFieldErrors(errors);
    return errors;
  }, [formValues, orderType, hasValidatedTable, cart.length]);

  const handleFieldChange = (field, value) => {
    setFormValues((prev) => {
      const next = { ...prev, [field]: value };
      if (fieldErrors[field]) {
        const nextErrors = getCheckoutErrors({
          formValues: next,
          orderType,
          hasValidatedTable,
          cartLength: cart.length,
        });
        setFieldErrors((prevErrors) => ({ ...prevErrors, [field]: nextErrors[field] }));
      }
      return next;
    });

    if (checkoutAlert) {
      setCheckoutAlert(null);
    }
  };

  const handleFieldBlur = (field) => {
    const errors = getCheckoutErrors({
      formValues,
      orderType,
      hasValidatedTable,
      cartLength: cart.length,
    });
    setFieldErrors((prev) => ({ ...prev, [field]: errors[field] }));
  };

  const startCheckout = useCallback(async (checkoutPayload = null) => {
    const payload = sanitizePendingPayment(checkoutPayload || pendingPaymentRef.current);
    if (!payload) {
      setCheckoutAlert({
        title: 'Payment session unavailable',
        message: 'Please start checkout again to create a secure payment session.',
        variant: 'error',
      });
      return;
    }

    clearScheduledVerification();
    setPendingPayment(payload);
    setCheckoutAlert(null);

    try {
      const checkoutResult = await openCashfreeCheckout({
        paymentSessionId: payload.paymentSessionId,
        mode: payload.mode,
      });

      if (checkoutResult?.error) {
        setCheckoutAlert({
          title: 'Payment launch failed',
          message: checkoutResult.error.message || 'Unable to open the payment page. Please try again.',
          variant: 'error',
          onRetry: () => startCheckout(payload),
          retryLabel: 'Retry Payment',
        });
        return;
      }

      await verifyExistingOrder(payload.orderRef, payload);
    } catch (err) {
      setCheckoutAlert({
        title: 'Payment launch failed',
        message: getFriendlyErrorMessage(err, 'Failed to launch Cashfree checkout. Please try again.'),
        variant: 'error',
        onRetry: () => startCheckout(payload),
        retryLabel: 'Retry Payment',
      });
    }
  }, [clearScheduledVerification, verifyExistingOrder]);

  useEffect(() => {
    startCheckoutRef.current = startCheckout;
  }, [startCheckout]);

  const verifyPendingPayment = useCallback(() => {
    const activePending = sanitizePendingPayment(pendingPaymentRef.current);
    if (!activePending?.orderRef) {
      setCheckoutAlert({
        title: 'No payment to verify',
        message: 'There is no active payment attempt to check right now. Please place the order again if needed.',
        variant: 'error',
      });
      return;
    }

    verifyExistingOrder(activePending.orderRef, activePending, { manual: true });
  }, [verifyExistingOrder]);

  const placeOrder = async () => {
    setCheckoutAlert(null);

    const errors = validateAllFields(formValues);
    const missingErrors = Object.keys(errors).filter((key) => key !== 'cart');

    if (missingErrors.length) {
      setShowValidationModal(true);
      focusAndScrollToField(missingErrors[0]);
      toast.error('Missing required fields', 'Please fill all required details before placing the order.', { duration: 2800 });
      return;
    }

    if (!isRestaurantOpen) {
      setCheckoutAlert({
        title: 'Restaurant closed',
        message: 'This restaurant is currently closed. Please try again when it reopens.',
        variant: 'error',
      });
      return;
    }

    if (cart.length === 0) {
      setCheckoutAlert({
        title: 'Empty cart',
        message: 'Add at least one item before placing the order.',
        variant: 'error',
      });
      return;
    }

    const unavailableCartItems = cart.filter((item) => {
      const liveItem = itemLookup.get(item.id);
      return !liveItem || liveItem.isAvailable === false;
    });

    if (unavailableCartItems.length) {
      const unavailableIds = new Set(unavailableCartItems.map((item) => item.id));
      setCart((prev) => prev.filter((item) => !unavailableIds.has(item.id)));
      setCheckoutAlert({
        title: 'Cart updated',
        message:
          unavailableCartItems.length === 1
            ? `${unavailableCartItems[0].name} is no longer available, so it was removed from your cart. Please review your order and try again.`
            : `${unavailableCartItems.length} items are no longer available, so they were removed from your cart. Please review your order and try again.`,
        variant: 'error',
      });
      toast.error(
        unavailableCartItems.length === 1 ? 'Item removed from cart' : 'Cart updated',
        unavailableCartItems.length === 1
          ? `${unavailableCartItems[0].name} is no longer available for checkout.`
          : `${unavailableCartItems.length} items are no longer available for checkout.`,
        { duration: 3200 },
      );
      return;
    }

    setIsProcessing(true);
    try {
      const result = await paymentsApi.createOrder({
        restaurantSlug: slug,
        customerName: formValues.customerName.trim(),
        customerPhone: formValues.customerPhone.trim(),
        customerEmail: formValues.customerEmail.trim().toLowerCase(),
        tableToken: orderType === 'Dine-In' ? validatedTableToken : '',
        specialInstructions: formValues.specialInstructions.trim(),
        paymentMethod: formValues.paymentMethod,
        returnUrl: window.location.href,
        items: cart.map((item) => ({
          menuItemId: item.id,
          quantity: item.qty,
        })),
      });

      const pendingOrder = {
        orderRef: result.orderRef,
        orderDisplayId: result.orderDisplayId,
        paymentSessionId: result.paymentSessionId,
        mode: result.mode,
        checkoutFingerprint,
        cartSnapshot: cart,
        formSnapshot: {
          ...formValues,
          customerName: formValues.customerName.trim(),
          customerPhone: formValues.customerPhone.trim(),
          customerEmail: formValues.customerEmail.trim().toLowerCase(),
          specialInstructions: formValues.specialInstructions.trim(),
        },
        orderType,
      };

      setPendingPayment(pendingOrder);
      await startCheckout(pendingOrder);
    } catch (err) {
      setCheckoutAlert({
        title: 'Checkout failed',
        message: getFriendlyErrorMessage(err, 'Failed to place order. Please try again.'),
        variant: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const missingFields = useMemo(() => {
    const errors = getCheckoutErrors({
      formValues,
      orderType,
      hasValidatedTable,
      cartLength: cart.length,
    });
    return Object.keys(errors)
      .filter((key) => FIELD_LABELS[key])
      .map((key) => FIELD_LABELS[key]);
  }, [formValues, orderType, hasValidatedTable, cart.length]);

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <InlineAlert
            title="Unable to load menu"
            message={error}
            onRetry={() => loadMenuSnapshot()}
          />
        </div>
      </div>
    );
  }

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
    <div className="surface-grid min-h-screen pb-10">
      {showClosedPopup && (
        <ClosedPopup
          restaurantData={restaurantData}
          onClose={() => setShowClosedPopup(false)}
        />
      )}

      <MenuHeader
        restaurantData={restaurantData}
        tableNumber={tableNumber}
        setShowClosedPopup={setShowClosedPopup}
        chatPath={chatPath}
      />

      <div className="mx-auto w-full max-w-5xl px-4 pt-3 sm:px-6">
        {checkoutAlert && !isCheckout && (
          <InlineAlert
            title={checkoutAlert.title}
            message={checkoutAlert.message}
            onRetry={checkoutAlert.onRetry}
            variant={checkoutAlert.variant}
            className="mb-4"
          />
        )}

        <div className="mb-3 grid gap-3 xl:grid-cols-[1fr_auto]">
          <div className="min-w-0">
            <CategoryTabs
              menu={normalizedMenu}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
            />
          </div>
          <div className="border border-[#d2c5b6] bg-white px-4 py-2.5">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#554a3f]">
              <Sparkles className="h-4 w-4" />
              Filters
            </div>
            <DietFilters
              menu={normalizedMenu}
              categoryItems={categoryItems}
              dietFilter={dietFilter}
              setDietFilter={setDietFilter}
            />
          </div>
        </div>
      </div>

      <MenuList
        currentItems={currentItems}
        cart={cart}
        addToCart={addToCart}
        updateQty={updateQty}
        restaurantData={restaurantData}
        isSubscribed={isSubscribed}
        isRestaurantOpen={isRestaurantOpen}
      />

      <CartBar
        cartCount={cartCount}
        isCheckout={isCheckout}
        cartSubtotal={cartSubtotal}
        handleCheckoutClick={handleCheckoutClick}
        isSubscribed={isSubscribed}
        isRestaurantOpen={isRestaurantOpen}
      />

      <CheckoutPanel
        isCheckout={isCheckout}
        setIsCheckout={setIsCheckout}
        orderType={orderType}
        setOrderType={setOrderType}
        canUseDineIn={hasValidatedTable}
        tableNumber={tableNumber}
        cart={cart}
        updateQty={updateQty}
        formValues={formValues}
        onFieldChange={handleFieldChange}
        onFieldBlur={handleFieldBlur}
        fieldErrors={fieldErrors}
        checkoutAlert={checkoutAlert}
        setCheckoutAlert={setCheckoutAlert}
        pendingPayment={pendingPayment}
        startCheckout={startCheckout}
        verifyPendingPayment={verifyPendingPayment}
        placeOrder={placeOrder}
        isProcessing={isProcessing}
        isVerifyingPayment={isVerifyingPayment}
        cartTotal={cartTotal}
        isSubscribed={isSubscribed}
        isRestaurantOpen={isRestaurantOpen}
        showValidationModal={showValidationModal}
        setShowValidationModal={setShowValidationModal}
        missingFields={missingFields}
      />
    </div>
  );
}


