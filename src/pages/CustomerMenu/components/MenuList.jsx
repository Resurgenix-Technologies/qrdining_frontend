import { Plus, Minus } from 'lucide-react';
import LazyImg from './LazyImg';

export default function MenuList({ currentItems, cart, addToCart, updateQty, restaurantData, isSubscribed }) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-3">
        {currentItems.length === 0 ? (
          <p className="text-center text-muted text-xs py-12">No items in this category.</p>
        ) : (
          <div className="space-y-2">
            {currentItems.map(item => {
              const inCart = cart.find(i => i.id === item._id);
              return (
                <div key={item._id} className="flex items-center gap-3 p-3 border border-border">
                  {item.imageUrl && (
                    <LazyImg src={item.imageUrl} alt={item.name} className="w-14 h-14 object-cover flex-shrink-0 rounded" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-sm truncate">{item.name}</h3>
                      {/* Diet type indicator — Indian food standard style */}
                      {item.dietType === 'veg' && (
                        <span title="Vegetarian" className="inline-flex items-center justify-center w-4 h-4 border border-green-600 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-green-600" />
                        </span>
                      )}
                      {item.dietType === 'non-veg' && (
                        <span title="Non-Vegetarian" className="inline-flex items-center justify-center w-4 h-4 border border-red-600 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-red-600" />
                        </span>
                      )}
                      {item.dietType === 'vegan' && (
                        <span title="Vegan" className="inline-flex items-center justify-center w-4 h-4 border border-emerald-600 flex-shrink-0">
                          <span className="w-2 h-2 rounded-full bg-emerald-600" />
                        </span>
                      )}
                      {item.isBestSeller && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 font-bold uppercase rounded">🔥 Best Seller</span>}
                      {item.isChefSpecial && <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 font-bold uppercase rounded">👨‍🍳 Chef Special</span>}
                    </div>
                    {item.description && <p className="text-xs text-muted mt-0.5 line-clamp-2">{item.description}</p>}
                    <p className="text-sm font-bold mt-0.5">{restaurantData?.currency || '₹'}{item.price}</p>
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2 bg-black text-white px-2 py-1 flex-shrink-0">
                      <button 
                        onClick={() => updateQty(item._id, -1)} 
                        disabled={!isSubscribed}
                        className="p-0.5 active:scale-90 disabled:opacity-50"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-xs w-4 text-center">{inCart.qty}</span>
                      <button 
                        onClick={() => updateQty(item._id, 1)} 
                        disabled={!isSubscribed}
                        className="p-0.5 active:scale-90 disabled:opacity-50"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => addToCart(item)} 
                      disabled={!isSubscribed}
                      className="bg-black text-white text-[9px] font-bold tracking-wider uppercase px-3 py-2 flex-shrink-0 active:scale-95 transition-transform disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isSubscribed ? 'ADD' : 'Unavailable'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
