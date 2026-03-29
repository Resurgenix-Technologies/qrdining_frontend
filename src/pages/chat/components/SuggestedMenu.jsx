export default function SuggestedMenu({ items, onAddToOrder }) {
    if (!items?.length) return null;

    return (
        <div className="space-y-3">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                Recommended for you
            </p>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {items.map((item) => (
                    <div
                        key={item._id}
                        className="min-w-[220px] bg-white border border-border rounded-2xl overflow-hidden snap-start"
                    >
                        <div className="h-40 bg-gray-100 flex items-center justify-center text-4xl">
                            🍽️
                        </div>
                        <div className="p-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-sm">
                                        {item.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                                        {item.description}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold">₹{item.price}</p>
                                    <p className="text-[10px] text-gray-400">
                                        {item.makingTime} min
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => onAddToOrder(item)}
                                className="mt-4 w-full py-2.5 bg-black text-white text-xs font-bold tracking-widest uppercase rounded-xl hover:bg-gray-800 transition"
                            >
                                Add to Order
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
