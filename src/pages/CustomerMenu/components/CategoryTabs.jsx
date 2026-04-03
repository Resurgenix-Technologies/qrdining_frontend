export default function CategoryTabs({ menu, activeCategory, setActiveCategory }) {
  if (!menu || menu.length === 0) return null;

  return (
    <div className="border border-[#d2c5b6] bg-white px-3 py-2.5">
      <div className="scroll-strip hide-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] transition ${activeCategory === 'all' ? 'border-black bg-black text-white' : 'border-[#d2c5b6] bg-white text-[#554a3f] hover:bg-[#f2e9de]'}`}
        >
          All
        </button>
        {menu.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 whitespace-nowrap border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.22em] transition ${activeCategory === cat.id ? 'border-black bg-black text-white' : 'border-[#d2c5b6] bg-white text-[#554a3f] hover:bg-[#f2e9de]'}`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
