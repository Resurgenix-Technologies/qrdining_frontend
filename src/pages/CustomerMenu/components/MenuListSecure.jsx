import { Flame, Minus, Plus, Sparkles, TimerReset, Wand2 } from 'lucide-react';
import LazyImg from './LazyImg';

function tagList(item) {
  const tags = [];
  if (item.dietType === 'veg') tags.push('Veg');
  if (item.dietType === 'vegan') tags.push('Vegan');
  if (item.isBestSeller) tags.push('Best Seller');
  if (item.isChefSpecial) tags.push('Chef Special');
  if (Array.isArray(item.tags)) item.tags.slice(0, 2).forEach((tag) => tags.push(tag));
  return tags.slice(0, 4);
}

export default function MenuListSecure({ currentItems, cart, addToCart, updateQty, restaurantData, isSubscribed, isRestaurantOpen }) {
  const currencySymbol = !restaurantData?.currency || restaurantData.currency === 'INR' ? '₹' : restaurantData.currency;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6 sm:py-5">
        {currentItems.length === 0 ? (
          <div className="border border-[#d2c5b6] bg-white px-6 py-12 text-center">
            <Wand2 className="mx-auto h-8 w-8 text-[#111111]" />
            <p className="mt-4 text-sm text-[#4f4438]">No items are available in this section right now.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentItems.map((item) => {
              const inCart = cart.find((entry) => entry.id === item.id);
              const tags = tagList(item);

              return (
                <div key={item.id} className="border border-[#d2c5b6] bg-white p-3 sm:p-4">
                  <div className="grid grid-cols-[72px_minmax(0,1fr)_112px] gap-3 sm:grid-cols-[94px_minmax(0,1fr)_140px] sm:gap-4">
                    <div className="overflow-hidden border border-[#d2c5b6] bg-[#f5f0e8]">
                      {item.imageUrl ? (
                        <LazyImg src={item.imageUrl} alt={item.name} className="h-[72px] w-full object-cover sm:h-[94px]" />
                      ) : (
                        <div className="flex h-[72px] w-full items-center justify-center text-3xl sm:h-[94px]">🍽</div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-base font-black uppercase tracking-tight text-[#111111] sm:text-lg">
                          {item.name}
                        </h3>
                        <span className="shrink-0 inline-flex items-center gap-1 border border-[#d2c5b6] bg-[#fbf8f2] px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-[#554a3f] sm:px-2.5 sm:text-[9px]">
                          <TimerReset className="h-3 w-3 text-[#111111]" />
                          {item.makingTime ? `${item.makingTime} min` : 'Fresh'}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-[12px] font-medium leading-5 text-[#4f4438]">{item.description}</p>
                      )}

                      {tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span key={`${item.id}-${tag}`} className="border border-[#d2c5b6] bg-[#fbf8f2] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#554a3f]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {!isRestaurantOpen && (
                        <div className="mt-2 inline-flex items-center gap-2 border border-[#d7cec2] bg-[#f4ece1] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#7f1d1d] sm:hidden">
                          <Flame className="h-3.5 w-3.5" />
                          Ordering paused
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <div className="flex w-full flex-col items-end gap-2">
                        <p className="text-right text-lg font-black tracking-tight text-[#111111] sm:text-2xl">
                          {currencySymbol}{item.price}
                        </p>
                      {!isRestaurantOpen && (
                        <div className="inline-flex items-center gap-2 border border-[#d7cec2] bg-[#f4ece1] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#7f1d1d]">
                          <Flame className="h-3.5 w-3.5" />
                          Ordering paused
                        </div>
                      )}
                      </div>
                      <div className="mt-auto w-full max-w-[112px] sm:max-w-[132px]">
                        {inCart ? (
                          <div className="flex h-10 items-center justify-between border border-[#d2c5b6] bg-[#fbf8f2] text-[#111111] sm:h-11">
                            <button
                              onClick={() => updateQty(item.id, -1)}
                              disabled={!isSubscribed}
                              className="flex h-full w-9 items-center justify-center border-r border-[#d2c5b6] bg-white transition hover:bg-[#f2e9de] disabled:opacity-50 sm:w-10"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[28px] text-center text-[12px] font-black sm:min-w-[40px]">{inCart.qty}</span>
                            <button
                              onClick={() => updateQty(item.id, 1)}
                              disabled={!isSubscribed || !isRestaurantOpen}
                              className="flex h-full w-9 items-center justify-center border-l border-[#d2c5b6] bg-white transition hover:bg-[#f2e9de] disabled:opacity-50 sm:w-10"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            disabled={!isSubscribed || !isRestaurantOpen}
                            className="btn-primary flex h-10 w-full items-center justify-center gap-2 !py-0 text-[9px] font-black uppercase tracking-[0.18em] disabled:opacity-40 sm:h-11 sm:text-[10px]"
                          >
                            <Sparkles className="h-4 w-4" />
                            {!isSubscribed ? 'Unavailable' : !isRestaurantOpen ? 'Closed' : 'Add'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
