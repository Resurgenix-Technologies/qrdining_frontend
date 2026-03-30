import { X, UtensilsCrossed, Package, Plus, Minus, User, Phone, Mail } from 'lucide-react';

export default function CheckoutPanel({
  isCheckout, setIsCheckout,
  orderType, setOrderType, tableNumber,
  cart, updateQty,
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  customerEmail, setCustomerEmail,
  specialInstructions, setSpecialInstructions,
  formError, setFormError,
  pendingPayment, startCheckout,
  placeOrder, isProcessing, isVerifyingPayment,
  cartTotal,
  isSubscribed
}) {
  if (!isCheckout) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-black text-white flex-shrink-0">
        <h2 className="text-sm font-bold tracking-widest uppercase">Checkout</h2>
        <button onClick={() => setIsCheckout(false)} className="p-1.5 text-white/60 hover:text-white">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">
        {/* Order Type */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Order Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setOrderType('Dine-In')} className={`flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-wider uppercase border transition-colors ${orderType === 'Dine-In' ? 'bg-black text-white border-black' : 'bg-white border-border text-muted'}`}>
              <UtensilsCrossed className="w-3.5 h-3.5" /> Dine-In
            </button>
            <button onClick={() => setOrderType('Takeaway')} className={`flex items-center justify-center gap-2 py-3 text-xs font-bold tracking-wider uppercase border transition-colors ${orderType === 'Takeaway' ? 'bg-black text-white border-black' : 'bg-white border-border text-muted'}`}>
              <Package className="w-3.5 h-3.5" /> Packed
            </button>
          </div>
          {orderType === 'Dine-In' && tableNumber && (
            <p className="text-[10px] text-muted mt-1.5">Table {tableNumber} • auto-selected from QR</p>
          )}
        </div>

        {/* Items */}
        <div>
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Items</label>
          <div className="space-y-1.5">
            {cart.map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 px-3 border border-border">
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs truncate block">{item.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="flex items-center gap-1.5 border border-border px-1.5 py-0.5">
                    <button onClick={() => updateQty(item.id, -1)} className="p-0.5"><Minus className="w-3 h-3" /></button>
                    <span className="text-[10px] font-bold w-3 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="p-0.5"><Plus className="w-3 h-3" /></button>
                  </div>
                  <span className="font-bold text-xs w-14 text-right">₹{(item.price * item.qty).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Info */}
        <div className="space-y-4">
          <label className="block text-[10px] font-bold tracking-widest uppercase text-muted">Your Details</label>
          <div className="relative">
            <User className="w-4 h-4 text-muted-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={customerName} onChange={e => { setCustomerName(e.target.value); if (formError) setFormError(''); }} className="input-premium pl-10 !py-3 !text-sm" placeholder="Your name *" autoComplete="name" required />
          </div>
          <div className="relative">
            <Phone className="w-4 h-4 text-muted-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="tel" value={customerPhone} onChange={e => { setCustomerPhone(e.target.value); if (formError) setFormError(''); }} className="input-premium pl-10 !py-3 !text-sm" placeholder="Phone number * (for order updates)" autoComplete="tel" required />
          </div>
          <div className="relative">
            <Mail className="w-4 h-4 text-muted-light absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="email" value={customerEmail} onChange={e => { setCustomerEmail(e.target.value); if (formError) setFormError(''); }} className="input-premium pl-10 !py-3 !text-sm" placeholder="Email address * (required)" autoComplete="email" required />
          </div>
          <textarea
            value={specialInstructions}
            onChange={e => setSpecialInstructions(e.target.value)}
            className="input-premium !py-3 !text-sm resize-none"
            placeholder="Special instructions (optional)"
            rows={2}
          />
        </div>

        {formError && <p className="text-xs text-danger font-bold">{formError}</p>}
        {pendingPayment && !isProcessing && !isVerifyingPayment && (
          <button
            type="button"
            onClick={() => startCheckout()}
            className="w-full border border-black text-black py-3 text-[10px] font-bold tracking-widest uppercase hover:bg-black hover:text-white transition"
          >
            Retry Payment
          </button>
        )}
      </div>

      {/* Checkout Footer */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-border bg-white">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-muted">Total</span>
          <span className="text-2xl font-black">₹{cartTotal.toFixed(0)}</span>
        </div>
        <p className="text-[10px] text-muted mb-3">💵 Pay at the counter when your food arrives.</p>
        <p className="text-[10px] text-muted mb-3">Secure online payment powered by Cashfree.</p>
        <button
          onClick={placeOrder}
          disabled={isProcessing || isVerifyingPayment || cart.length === 0 || !isSubscribed}
          className="btn-primary w-full !py-4 disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {!isSubscribed ? (
            'Ordering Unavailable'
          ) : isProcessing || isVerifyingPayment ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing...</>
          ) : (
            <>Place Order • ₹{cartTotal.toFixed(0)}</>
          )}
        </button>
      </div>
    </div>
  );
}
