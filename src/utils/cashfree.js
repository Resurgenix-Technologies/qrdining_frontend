const CASHFREE_SDK_URL = 'https://sdk.cashfree.com/js/v3/cashfree.js';

let cashfreeScriptPromise = null;

const isMobileViewport = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(max-width: 768px)').matches || window.innerWidth <= 768;
};

const loadCashfreeSdk = () => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Cashfree checkout is only available in the browser.'));
  }

  if (window.Cashfree) {
    return Promise.resolve(window.Cashfree);
  }

  if (!cashfreeScriptPromise) {
    cashfreeScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${CASHFREE_SDK_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Cashfree));
        existing.addEventListener('error', () => reject(new Error('Failed to load Cashfree checkout SDK.')));
        return;
      }

      const script = document.createElement('script');
      script.src = CASHFREE_SDK_URL;
      script.async = true;
      script.onload = () => resolve(window.Cashfree);
      script.onerror = () => reject(new Error('Failed to load Cashfree checkout SDK.'));
      document.head.appendChild(script);
    });
  }

  return cashfreeScriptPromise;
};

export const openCashfreeCheckout = async ({ paymentSessionId, mode, preferRedirect = false }) => {
  const Cashfree = await loadCashfreeSdk();
  if (typeof Cashfree !== 'function') {
    throw new Error('Cashfree SDK is unavailable.');
  }

  const cashfree = Cashfree({
    mode: mode === 'production' ? 'production' : 'sandbox',
  });

  const redirectTarget = preferRedirect || isMobileViewport() ? '_self' : '_modal';

  const result = await cashfree.checkout({
    paymentSessionId,
    redirectTarget,
  });

  if (result?.error && redirectTarget === '_modal') {
    return cashfree.checkout({
      paymentSessionId,
      redirectTarget: '_self',
    });
  }

  return result;
};
