export default function ButtonsVariant({ options, onSelect, selected }) {
    return (
        <div className="flex flex-wrap gap-2">
            {options.map((opt) => (
                <button
                    key={opt}
                    onClick={() => onSelect(opt)}
                    className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition duration-200 sm:px-3.5 ${
                        selected === opt
                            ? "border-black bg-black text-white"
                            : "border-[#ddd5ca] bg-white text-[#6d655c] hover:bg-[#f5efe7]"
                    }`}
                >
                    {opt}
                </button>
            ))}
        </div>
    );
}
