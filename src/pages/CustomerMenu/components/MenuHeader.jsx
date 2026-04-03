import { Bot, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fmt } from '../utils/timeFormat';
import LazyImg from './LazyImg';

export default function MenuHeader({ restaurantData, tableNumber, setShowClosedPopup, chatPath }) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = days[new Date().getDay()];
  const todayHours = restaurantData?.operatingHours?.[todayKey];
  const isOpen = restaurantData?.isOpen !== false;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-black bg-black text-white">
        <div className="mx-auto max-w-5xl px-4 py-3 sm:px-6">
          <div className="flex items-start justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {restaurantData?.logo && (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[16px] border border-white/20 bg-white p-2">
                  <LazyImg
                    src={restaurantData.logo}
                    alt={restaurantData.name}
                    className="h-full w-full rounded-[14px] object-contain"
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate font-sans text-xl font-black uppercase tracking-[0.02em] text-white sm:text-2xl">
                    {restaurantData?.name}
                  </h1>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2.5 text-xs text-[#cfc7bb] sm:text-sm">
                  {tableNumber && <span className="font-semibold uppercase tracking-[0.18em] text-white">Table {tableNumber}</span>}
                  {restaurantData?.cuisineTags?.length > 0 && (
                    <span>{restaurantData.cuisineTags.join(', ')}</span>
                  )}
                  <span
                    className={`rounded-full border px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] ${
                      isOpen
                        ? 'border-[#0c6b2d] bg-[#0c6b2d] text-white'
                        : 'border-[#7f1d1d] bg-[#7f1d1d] text-white'
                    }`}
                  >
                    {isOpen ? 'Open' : 'Closed'}
                  </span>
                  {todayHours?.isOpen && todayHours?.open && (
                    <button
                      type="button"
                      onClick={() => setShowClosedPopup(true)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#cfc7bb] transition hover:text-white sm:text-sm"
                    >
                      <Clock3 className="h-3.5 w-3.5 text-[#cfc7bb]" />
                      {fmt(todayHours.open)} - {fmt(todayHours.close)}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {chatPath && (
              <Link
                to={chatPath}
                className="inline-flex shrink-0 items-center gap-2 self-start border border-white/20 bg-white px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-black transition hover:bg-[#f3ede4]"
              >
                <Bot className="h-4 w-4" />
                AI Chat
              </Link>
            )}
          </div>
        </div>
      </header>

      {!isOpen && (
        <div
          className="border-b border-[#d7cec2] bg-[#f4ece1] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7f1d1d]"
          onClick={() => setShowClosedPopup(true)}
        >
          Restaurant Is Currently Closed. Tap To View Opening Hours.
        </div>
      )}
    </>
  );
}
