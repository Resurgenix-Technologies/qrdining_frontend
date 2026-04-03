import {
  CreditCard,
  Mail,
  MessageSquareText,
  Minus,
  Package,
  Phone,
  Plus,
  ShieldCheck,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';

import Modal from '../../../components/ui/Modal';
import Spinner from '../../../components/ui/Spinner';
import TextField from '../../../components/ui/TextField';

export default function CheckoutPanelSecure({
  isCheckout,
  setIsCheckout,
  orderType,
  setOrderType,
  canUseDineIn,
  tableNumber,
  cart,
  updateQty,
  formValues,
  onFieldChange,
  onFieldBlur,
  fieldErrors,
  checkoutAlert,
  setCheckoutAlert,
  pendingPayment,
  startCheckout,
  verifyPendingPayment,
  placeOrder,
  isProcessing,
  isVerifyingPayment,
  cartTotal,
  isSubscribed,
  isRestaurantOpen,
  showValidationModal,
  setShowValidationModal,
  missingFields,
}) {
  if (!isCheckout) return null;

  return (
    <>
      <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-[2px]">
        <div className="flex h-full w-full flex-col bg-[#f7f3ee]">
          <div className="flex items-center justify-between bg-black px-4 py-3 text-white sm:px-6">
            <h2 className="text-lg font-black uppercase tracking-[0.08em] sm:text-xl">Checkout</h2>
            <button
              type="button"
              onClick={() => setIsCheckout(false)}
              className="rounded-full border border-white/15 p-2 text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto grid max-w-[1400px] gap-5 px-4 py-4 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-5">
                <section>
                  <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#554a3f]">Order Type</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => canUseDineIn && setOrderType('Dine-In')}
                      disabled={!canUseDineIn}
                      className={`flex min-h-[64px] items-center justify-center gap-2 border px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] transition sm:min-h-[70px] sm:text-[11px] ${
                        orderType === 'Dine-In'
                          ? 'border-black bg-black text-white'
                          : 'border-[#d2c5b6] bg-white text-[#554a3f]'
                      } ${fieldErrors.orderType ? 'border-[#bc2525]' : ''} disabled:cursor-not-allowed disabled:opacity-45`}
                    >
                      <UtensilsCrossed className="h-4 w-4" />
                      Dine-In
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType('Takeaway')}
                      className={`flex min-h-[64px] items-center justify-center gap-2 border px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] transition sm:min-h-[70px] sm:text-[11px] ${
                        orderType === 'Takeaway'
                          ? 'border-black bg-black text-white'
                          : 'border-[#d2c5b6] bg-white text-[#554a3f]'
                      } ${fieldErrors.orderType ? 'border-[#bc2525]' : ''}`}
                    >
                      <Package className="h-4 w-4" />
                      Packed
                    </button>
                  </div>

                  <p className="mt-2 text-[12px] font-medium leading-5 text-[#4f4438]">
                    {orderType === 'Dine-In' && tableNumber
                      ? `Table ${tableNumber} auto-selected from QR`
                      : 'Choose dine-in for table service or packed for takeaway pickup.'}
                  </p>

                  {fieldErrors.orderType && (
                    <p className="mt-2 text-[12px] font-semibold text-[#bc2525]">{fieldErrors.orderType}</p>
                  )}
                </section>

                <section>
                  <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#554a3f]">Items</p>
                  <div className="mt-3 overflow-hidden border border-[#d2c5b6] bg-white">
                    {cart.map((item) => (
                      <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-[#eee6da] px-4 py-3 last:border-b-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-black uppercase tracking-tight text-[#111111] sm:text-lg">{item.name}</p>
                          <p className="mt-1 text-[12px] font-medium text-[#4f4438]">₹{Math.round(item.price)} each</p>
                        </div>
                        <div className="flex items-center border border-[#d2c5b6] bg-[#fbf8f2]">
                          <button type="button" onClick={() => updateQty(item.id, -1)} className="flex h-10 w-10 items-center justify-center text-[#111111] transition hover:bg-[#eee3d7]">
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-[44px] text-center text-[13px] font-black text-[#111111]">{item.qty}</span>
                          <button type="button" onClick={() => updateQty(item.id, 1)} className="flex h-10 w-10 items-center justify-center text-[#111111] transition hover:bg-[#eee3d7]">
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="min-w-[84px] text-right text-base font-black text-[#111111] sm:text-lg">₹{Math.round(item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <section>
                  <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#554a3f]">Your Details</p>
                  <div className="mt-3 space-y-4">
                    <TextField
                      label="Name"
                      name="customerName"
                      value={formValues.customerName}
                      onChange={(event) => onFieldChange('customerName', event.target.value)}
                      onBlur={() => onFieldBlur('customerName')}
                      placeholder="Your name *"
                      icon={User}
                      error={fieldErrors.customerName}
                      autoComplete="name"
                      required
                    />
                    <TextField
                      label="Phone"
                      name="customerPhone"
                      value={formValues.customerPhone}
                      onChange={(event) => onFieldChange('customerPhone', event.target.value)}
                      onBlur={() => onFieldBlur('customerPhone')}
                      placeholder="Phone number *"
                      icon={Phone}
                      error={fieldErrors.customerPhone}
                      autoComplete="tel"
                      inputMode="tel"
                      required
                    />
                    <TextField
                      label="Email"
                      name="customerEmail"
                      value={formValues.customerEmail}
                      onChange={(event) => onFieldChange('customerEmail', event.target.value)}
                      onBlur={() => onFieldBlur('customerEmail')}
                      placeholder="Email address *"
                      icon={Mail}
                      error={fieldErrors.customerEmail}
                      autoComplete="email"
                      required
                    />
                    <TextField
                      label="Special Instructions"
                      name="specialInstructions"
                      as="textarea"
                      rows={4}
                      value={formValues.specialInstructions}
                      onChange={(event) => onFieldChange('specialInstructions', event.target.value)}
                      onBlur={() => onFieldBlur('specialInstructions')}
                      placeholder="Special instructions (optional)"
                      icon={MessageSquareText}
                      className="!pt-4"
                    />
                  </div>
                </section>

                <section>
                  <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#554a3f]">Payment</p>
                  <button
                    type="button"
                    onClick={() => onFieldChange('paymentMethod', 'cashfree')}
                    className={`mt-3 w-full border px-4 py-4 text-left transition ${
                      formValues.paymentMethod === 'cashfree'
                        ? 'border-black bg-black text-white'
                        : 'border-[#d2c5b6] bg-white text-[#111111]'
                    } ${fieldErrors.paymentMethod ? 'border-[#bc2525]' : ''}`}
                  >
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] sm:text-[11px]">
                      <CreditCard className="h-4 w-4" />
                      Secure online payment powered by Cashfree
                    </div>
                    <p className={`mt-2 text-[12px] leading-5 ${formValues.paymentMethod === 'cashfree' ? 'text-white/75' : 'text-[#473d34]'}`}>
                      Card, UPI, and wallet payments happen on the secure hosted payment flow.
                    </p>
                  </button>

                  {fieldErrors.paymentMethod && (
                    <p className="mt-2 text-[12px] font-semibold text-[#bc2525]">{fieldErrors.paymentMethod}</p>
                  )}

                  <div className="mt-4 border border-[#d2c5b6] bg-white p-4">
                    <div className="flex items-start gap-3">
                      <div className="border border-[#d2c5b6] bg-[#fbf8f2] p-2.5">
                        <ShieldCheck className="h-5 w-5 text-[#111111]" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#111111]">Protected payment session</p>
                        <p className="mt-2 text-[12px] leading-5 text-[#473d34]">
                          The total is recalculated server-side and the order is confirmed only after verified payment.
                          Double submission stays blocked while checkout is running.
                        </p>
                      </div>
                    </div>
                  </div>

                  {pendingPayment && !isProcessing && !isVerifyingPayment && (
                    <div className="mt-4 border border-[#d2c5b6] bg-[#fbf8f2] p-4">
                      <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#554a3f]">Recovery</p>
                      <p className="mt-3 text-[12px] leading-5 text-[#473d34]">
                        If the payment page closes, the internet drops, or the payment stays pending, we keep your cart and checkout details safe.
                        You can reopen the payment page or check the payment status without starting over.
                      </p>
                      <p className="mt-3 text-[12px] font-black uppercase tracking-[0.08em] text-[#111111]">
                        Ref: #{pendingPayment.orderDisplayId || pendingPayment.orderRef}
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <button type="button" onClick={() => startCheckout()} className="glass-button w-full justify-center sm:w-auto">
                          Continue Payment
                        </button>
                        <button type="button" onClick={verifyPendingPayment} className="glass-button-secondary w-full justify-center sm:w-auto">
                          Check Status
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>

          <div className="border-t border-[#ddd5ca] bg-white px-4 py-3 sm:px-6">
            <div className="mx-auto grid max-w-[1400px] grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.26em] text-[#554a3f]">Total</p>
                <p className="mt-1 text-3xl font-black tracking-tight text-[#111111] sm:text-[52px]">₹{Math.round(cartTotal)}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#4f4438]">Secure online payment powered by Cashfree.</p>
              </div>
              <button
                type="button"
                onClick={placeOrder}
                disabled={isProcessing || isVerifyingPayment || cart.length === 0 || !isSubscribed || !isRestaurantOpen}
                className="btn-primary ml-auto flex min-h-[48px] min-w-[180px] items-center justify-center gap-2 self-end px-5 text-[10px] font-black uppercase tracking-[0.16em] disabled:opacity-35 sm:min-w-[220px]"
              >
                {isProcessing || isVerifyingPayment ? (
                  <>
                    <Spinner className="!text-white" />
                    Processing...
                  </>
                ) : !isRestaurantOpen ? (
                  'Restaurant Closed'
                ) : !isSubscribed ? (
                  'Ordering Unavailable'
                ) : (
                  `Place Order • ₹${Math.round(cartTotal)}`
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(checkoutAlert)}
        onClose={() => setCheckoutAlert(null)}
        title={checkoutAlert?.title || 'Checkout update'}
        description={checkoutAlert?.message || ''}
        tone={checkoutAlert?.variant === 'error' ? 'danger' : 'default'}
        actions={(
          <>
            {checkoutAlert?.onRetry && (
              <button
                type="button"
                onClick={() => {
                  const retry = checkoutAlert.onRetry;
                  setCheckoutAlert(null);
                  retry();
                }}
                className="glass-button w-full justify-center sm:w-auto"
              >
                {checkoutAlert.retryLabel || 'Retry'}
              </button>
            )}
            {checkoutAlert?.secondaryAction && (
              <button
                type="button"
                onClick={() => {
                  const secondaryAction = checkoutAlert.secondaryAction;
                  setCheckoutAlert(null);
                  secondaryAction();
                }}
                className="glass-button-secondary w-full justify-center sm:w-auto"
              >
                {checkoutAlert.secondaryLabel || 'Continue'}
              </button>
            )}
            <button type="button" onClick={() => setCheckoutAlert(null)} className="glass-button-secondary w-full justify-center sm:w-auto">
              Close
            </button>
          </>
        )}
      />

      <Modal
        open={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        title="Missing Required Fields"
        description="Please fill all required details before placing the order. The highlighted fields need attention before checkout can continue."
        tone="danger"
        actions={(
          <button type="button" onClick={() => setShowValidationModal(false)} className="glass-button w-full justify-center sm:w-auto">
            Review Details
          </button>
        )}
      >
        <div className="border border-[#e0b8b8] bg-[#fff3f2] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#bc2525]">Needs attention</p>
          <ul className="mt-3 space-y-2 text-sm text-[#3f352d]">
            {missingFields.map((field) => (
              <li key={field}>• {field}</li>
            ))}
          </ul>
        </div>
      </Modal>
    </>
  );
}
