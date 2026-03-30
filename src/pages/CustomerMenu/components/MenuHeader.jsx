import { Clock } from 'lucide-react';
import { fmt } from '../utils/timeFormat';
import LazyImg from './LazyImg';

export default function MenuHeader({ restaurantData, tableNumber, setShowClosedPopup }) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[new Date().getDay()];
  const todayHours = restaurantData?.operatingHours?.[todayKey];
  const isOpen = restaurantData?.isOpen;

  return (
    <>
      {/* Restaurant Header */}
      <header className="bg-black text-white flex-shrink-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {restaurantData?.logo && (
            <LazyImg src={restaurantData.logo} alt={restaurantData.name} className="w-10 h-10 object-cover border border-white/20 rounded flex-shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold truncate">{restaurantData?.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {tableNumber && (
                <p className="text-white/40 text-[10px] tracking-widest uppercase">Table {tableNumber}</p>
              )}
              {restaurantData?.cuisineTags?.length > 0 && (
                <p className="text-white/30 text-[10px]">{restaurantData.cuisineTags.join(', ')}</p>
              )}
            </div>
          </div>

          {/* Open/Closed badge */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border ${
              isOpen
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-red-500 text-white border-red-600'
            }`}>
              {isOpen ? '● Open' : '✕ Closed'}
            </span>
            {todayHours?.isOpen && todayHours?.open && (
              <p className="text-white/30 text-[9px]">{fmt(todayHours.open)} – {fmt(todayHours.close)}</p>
            )}
          </div>
        </div>
      </header>

      {/* Closed Banner */}
      {!isOpen && (
        <div
          className="bg-red-50 border-b border-red-100 px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer"
          onClick={() => setShowClosedPopup(true)}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-[11px] font-bold">
              {todayHours?.isOpen && todayHours?.open
                ? `We're closed right now. Opens at ${fmt(todayHours.open)}`
                : "We're closed today. Tap to see next opening."}
            </p>
          </div>
          <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest underline whitespace-nowrap">See Hours</span>
        </div>
      )}
    </>
  );
}
