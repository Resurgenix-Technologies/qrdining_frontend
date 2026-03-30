import { Clock, Store } from 'lucide-react';
import { fmt } from '../utils/timeFormat';

export default function ClosedPopup({ restaurantData, onClose }) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const todayHours = restaurantData?.operatingHours?.[today];
  const openTime = todayHours?.open;
  const closeTime = todayHours?.close;
  const isClosedToday = !todayHours?.isOpen;

  // Find next day that's open
  const getNextOpenDay = () => {
    for (let i = 1; i <= 7; i++) {
      const nextDay = days[(new Date().getDay() + i) % 7];
      const h = restaurantData?.operatingHours?.[nextDay];
      if (h?.isOpen) {
        return { day: nextDay.charAt(0).toUpperCase() + nextDay.slice(1), time: h.open };
      }
    }
    return null;
  };

  const nextOpen = isClosedToday ? getNextOpenDay() : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-slide-up">
        {/* Red header */}
        <div className="bg-red-600 px-6 py-5 text-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-white font-black text-xl tracking-tight">We're Closed</h2>
          <p className="text-red-100 text-[11px] mt-1 font-medium">{restaurantData?.name}</p>
        </div>

        {/* Body */}
        <div className="p-6 text-center">
          <Clock className="w-8 h-8 text-gray-300 mx-auto mb-4" />

          {isClosedToday ? (
            <>
              <p className="text-gray-600 text-sm font-medium">We're closed today.</p>
              {nextOpen && (
                <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-0.5">Next Opening</p>
                  <p className="text-green-800 font-black text-base">{nextOpen.day} at {fmt(nextOpen.time)}</p>
                </div>
              )}
            </>
          ) : openTime ? (
            <>
              <p className="text-gray-600 text-sm font-medium mb-3">
                We're currently closed. Our doors are open during:
              </p>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Today's Hours</p>
                <p className="text-gray-900 font-black text-xl">{fmt(openTime)} – {fmt(closeTime)}</p>
              </div>
              <p className="text-gray-400 text-[11px] mt-3">
                Come back during opening hours to place your order.
              </p>
            </>
          ) : (
            <p className="text-gray-600 text-sm">This restaurant is currently not accepting orders.</p>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-black text-white py-3 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition"
          >
            Browse Menu Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
