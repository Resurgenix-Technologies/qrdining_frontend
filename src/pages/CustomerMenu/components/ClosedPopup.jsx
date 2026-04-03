import { Clock3, Store } from 'lucide-react';
import { fmt } from '../utils/timeFormat';

export default function ClosedPopup({ restaurantData, onClose }) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const todayHours = restaurantData?.operatingHours?.[today];
  const isClosedToday = !todayHours?.isOpen;

  const getNextOpenDay = () => {
    for (let i = 1; i <= 7; i += 1) {
      const nextDay = days[(new Date().getDay() + i) % 7];
      const hours = restaurantData?.operatingHours?.[nextDay];
      if (hours?.isOpen) {
        return {
          day: nextDay.charAt(0).toUpperCase() + nextDay.slice(1),
          time: hours.open,
        };
      }
    }
    return null;
  };

  const nextOpen = getNextOpenDay();

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md border border-[#ddd5ca] bg-[#fbf8f2] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.14)]" onClick={(event) => event.stopPropagation()}>
        <div className="border border-[#ddd5ca] bg-white p-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center border border-[#ddd5ca] bg-[#fbf8f2] text-[#111111]">
            <Store className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-semibold text-[#111111]">Restaurant Closed</h2>
          <p className="mt-2 text-sm text-[#6d655c]">{restaurantData?.name}</p>
        </div>

        <div className="mt-5 border border-[#ddd5ca] bg-white p-5 text-center">
          <Clock3 className="mx-auto h-7 w-7 text-[#111111]" />
          {isClosedToday ? (
            <>
              <p className="mt-4 text-sm text-[#5c564e]">This restaurant is closed today.</p>
              {nextOpen && (
                <div className="mt-4 border border-[#ddd5ca] bg-[#fbf8f2] px-4 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d655c]">Next Opening</p>
                  <p className="mt-2 text-lg font-semibold text-[#111111]">{nextOpen.day} at {fmt(nextOpen.time)}</p>
                </div>
              )}
            </>
          ) : todayHours?.open ? (
            <>
              <p className="mt-4 text-sm leading-6 text-[#5c564e]">Ordering is paused for now. Today&apos;s service window is:</p>
              <div className="mt-4 border border-[#ddd5ca] bg-[#fbf8f2] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6d655c]">Today&apos;s Hours</p>
                <p className="mt-2 text-lg font-semibold text-[#111111]">{fmt(todayHours.open)} - {fmt(todayHours.close)}</p>
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-[#5c564e]">The restaurant is not accepting orders right now.</p>
          )}
        </div>

        <button onClick={onClose} className="glass-button mt-6 w-full justify-center">
          Browse Menu Anyway
        </button>
      </div>
    </div>
  );
}
