export default function DietFilters({ menu, categoryItems, dietFilter, setDietFilter }) {
  if (!menu || menu.length === 0 || !categoryItems || categoryItems.length === 0) return null;

  return (
    <div className="scroll-strip hide-scrollbar mt-3 -mx-1 flex items-center gap-2 overflow-x-auto px-1">
      {['all', 'veg', 'non-veg', 'vegan'].map((type) => (
        <button
          key={type}
          onClick={() => setDietFilter(type)}
          className={`flex shrink-0 items-center gap-2 whitespace-nowrap border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] transition ${dietFilter === type ? 'border-black bg-black text-white' : 'border-[#d2c5b6] bg-white text-[#554a3f] hover:bg-[#f2e9de]'}`}
        >
          {type === 'veg' && <span className="h-2 w-2 rounded-full bg-green-500" />}
          {type === 'non-veg' && <span className="h-2 w-2 rounded-full bg-rose-500" />}
          {type === 'vegan' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
          {type}
        </button>
      ))}
    </div>
  );
}
