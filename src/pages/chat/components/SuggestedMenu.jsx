import { Plus, Minus } from "lucide-react";

export default function SuggestedMenu({ items, onUpdateOrder, currentOrder = [] }) {
    if (!items?.length) return null;

    return (
        <div className="space-y-3 w-full min-w-0">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                Recommended for you
            </p>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide hide-scrollbar w-full">
                {items.map((item) => {
                    const cartItem = currentOrder.find(i => i._id === item._id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    
                    return (
                    <div
                        key={item._id}
                        className="w-[240px] max-w-[75vw] flex-shrink-0 bg-white border border-border rounded-2xl overflow-hidden snap-start flex flex-col"
                    >
                        <div className="h-40 bg-gray-100 flex items-center justify-center text-4xl">
                            🍽️
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 pr-2 min-w-0">
                                    <h3 className="font-bold text-sm truncate">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 break-words">
                                        {item.description}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="font-bold">₹{item.price}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {item.makingTime} min
                                    </p>
                                </div>
                            </div>

                            {qty > 0 ? (
                                <div className="mt-auto flex items-center justify-between bg-green-600 text-white rounded-xl overflow-hidden h-10 w-full shadow-sm">
                                    <button 
                                        onClick={() => onUpdateOrder(item, -1)}
                                        className="h-full px-4 flex items-center justify-center hover:bg-green-700 transition"
                                    >
                                        <Minus className="w-4 h-4" />
                                    </button>
                                    <span className="font-bold text-xs">Added ({qty})</span>
                                    <button 
                                        onClick={() => onUpdateOrder(item, 1)}
                                        className="h-full px-4 flex items-center justify-center hover:bg-green-700 transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onUpdateOrder(item, 1)}
                                    className="mt-auto w-full h-10 bg-black text-white text-[10px] sm:text-xs font-bold tracking-widest uppercase rounded-xl transition hover:bg-gray-800 shadow-sm"
                                >
                                    Add to Order
                                </button>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
}
