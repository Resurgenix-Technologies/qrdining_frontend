import { ArrowRight, ShoppingBag } from 'lucide-react';

export default function CartBarSecure({ cartCount, isCheckout, cartSubtotal, handleCheckoutClick, isSubscribed, isRestaurantOpen }) {
  if (cartCount === 0 || isCheckout) return null;

  return (
    <div className="sticky bottom-0 z-40 border-t border-[#ddd5ca] bg-[#f7f3ee]/95 px-4 pb-3 pt-2.5 backdrop-blur sm:px-6 sm:pb-4">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 border border-[#d2c5b6] bg-white px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-center gap-3">
          <div className="border border-[#d2c5b6] bg-[#fbf8f2] p-2.5 text-[#111111]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.24em] text-[#554a3f]">Cart Ready</p>
            <p className="mt-1 text-[12px] font-black uppercase tracking-[0.06em] text-[#111111] sm:text-sm">
              {cartCount} item{cartCount > 1 ? 's' : ''} • ₹{cartSubtotal.toFixed(0)}
            </p>
          </div>
        </div>

        {!isRestaurantOpen ? (
          <div className="border border-[#d7cec2] bg-[#f4ece1] px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#7f1d1d]">
            Restaurant Closed
          </div>
        ) : isSubscribed ? (
          <button onClick={handleCheckoutClick} className="glass-button min-w-[136px] !px-4 !py-2 text-[10px] font-black uppercase tracking-[0.18em]">
            Checkout
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <div className="border border-[#d7cec2] bg-[#f4ece1] px-3 py-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#7f1d1d]">
            Ordering Unavailable
          </div>
        )}
      </div>
    </div>
  );
}
