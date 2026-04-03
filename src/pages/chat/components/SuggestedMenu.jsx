import { Clock3, Flame, Leaf, Minus, Plus, Sparkles } from "lucide-react";
import LazyImg from "../../CustomerMenu/components/LazyImg";

function getTags(item) {
    const nextTags = [];

    if (item.dietType === "veg" || item.dietType === "vegan") {
        nextTags.push(item.dietType === "vegan" ? "Vegan" : "Veg");
    }
    if (item.isBestSeller) nextTags.push("Popular");
    if (item.isChefSpecial) nextTags.push("Chef Pick");
    if (Array.isArray(item.tags)) {
        item.tags.slice(0, 2).forEach((tag) => nextTags.push(tag));
    }
    return nextTags.slice(0, 4);
}

export default function SuggestedMenu({ items, onUpdateOrder, currentOrder = [], disabled = false }) {
    if (!items?.length) return null;

    return (
        <div className="w-full min-w-0 space-y-2.5">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.24em] text-[#554a3f]">
                <Sparkles className="h-4 w-4" />
                Recommended for you
            </div>
            <div className="scroll-strip scrollbar-hide flex gap-3 overflow-x-auto pb-1 pr-1 snap-x snap-mandatory">
                {items.map((item) => {
                    const cartItem = currentOrder.find((i) => i.id === item.id);
                    const qty = cartItem ? cartItem.quantity : 0;
                    const tags = getTags(item);

                    return (
                        <div
                            key={item.id}
                            className="flex min-w-[250px] max-w-[250px] flex-shrink-0 snap-start flex-col border border-[#d2c5b6] bg-white p-3 shadow-[0_10px_20px_rgba(0,0,0,0.05)] sm:min-w-[285px] sm:max-w-[285px]"
                        >
                            <div className="overflow-hidden border border-[#d2c5b6] bg-[#f5f0e8]">
                                {item.imageUrl ? (
                                    <LazyImg
                                        src={item.imageUrl}
                                        alt={item.name}
                                        className="h-[148px] w-full object-cover sm:h-[168px]"
                                    />
                                ) : (
                                    <div className="flex h-[148px] items-center justify-center text-5xl sm:h-[168px]">
                                        {"\uD83C\uDF7D"}
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 flex flex-1 flex-col">
                                <div className="flex items-start justify-between gap-3">
                                    <h3 className="line-clamp-2 min-w-0 text-base font-black uppercase tracking-tight text-[#111111] sm:text-lg">
                                        {item.name}
                                    </h3>
                                    <p className="shrink-0 text-lg font-black tracking-tight text-[#111111] sm:text-xl">
                                        {"\u20B9"}{item.price}
                                    </p>
                                </div>

                                <p className="mt-2 line-clamp-3 text-[12px] font-medium leading-5 text-[#6c6258]">
                                    {item.description}
                                </p>

                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1.5 border border-[#d2c5b6] bg-[#fbf8f2] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#554a3f]">
                                        <Clock3 className="h-3.5 w-3.5 text-[#111111]" />
                                        {item.makingTime ? `${item.makingTime} min` : "Fresh"}
                                    </span>
                                    {tags.map((tag) => (
                                        <span
                                            key={`${item.id}-${tag}`}
                                            className="border border-[#d2c5b6] bg-[#fbf8f2] px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#554a3f]"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-4 flex items-end justify-between gap-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6c6258]">
                                        {qty > 0 ? `${qty} in cart` : "Ready to add"}
                                    </p>

                                    {qty > 0 ? (
                                        <div className="flex h-11 min-w-[116px] items-center justify-between border border-[#d2c5b6] bg-[#fbf8f2] text-[#111111]">
                                            <button
                                                onClick={() => onUpdateOrder(item, -1)}
                                                disabled={disabled}
                                                className="flex h-full w-10 items-center justify-center transition hover:bg-[#eee3d7] disabled:opacity-50"
                                            >
                                                <Minus className="h-4 w-4" />
                                            </button>
                                            <span className="text-[12px] font-black">{qty}</span>
                                            <button
                                                onClick={() => onUpdateOrder(item, 1)}
                                                disabled={disabled}
                                                className="flex h-full w-10 items-center justify-center transition hover:bg-[#eee3d7] disabled:opacity-50"
                                            >
                                                <Plus className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onUpdateOrder(item, 1)}
                                            disabled={disabled}
                                            className="btn-primary flex h-11 min-w-[116px] items-center justify-center gap-2 !py-0 text-[10px] font-black uppercase tracking-[0.18em] disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            {item.dietType === "veg" || item.dietType === "vegan" ? (
                                                <Leaf className="h-3.5 w-3.5" />
                                            ) : (
                                                <Flame className="h-3.5 w-3.5" />
                                            )}
                                            Add
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

