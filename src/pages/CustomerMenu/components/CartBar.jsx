import { ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartBar({ cartCount, isCheckout, cartSubtotal, handleCheckoutClick, isSubscribed }) {
  if (cartCount === 0 || isCheckout) return null;

  return (
    <div className="sticky bottom-0 bg-black text-white px-4 py-3 flex items-center justify-between z-40">
      <div className="flex items-center gap-2">
        <ShoppingBag className="w-4 h-4" />
        <span className="text-xs font-bold">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
        <span className="text-white/40 text-xs">•</span>
        <span className="font-bold">₹{cartSubtotal.toFixed(0)}</span>
      </div>
      {isSubscribed ? (
        <button
          onClick={handleCheckoutClick}
          className="bg-white text-black text-[10px] font-bold tracking-widest uppercase px-5 py-2 active:scale-95 transition-transform flex items-center gap-1.5"
        >
          Checkout <ArrowRight className="w-3 h-3" />
        </button>
      ) : (
        <div className="bg-rose-600 text-white text-[9px] font-black tracking-widest uppercase px-4 py-2 rounded">
          Ordering Unavailable
        </div>
      )}
    </div>
  );
}
