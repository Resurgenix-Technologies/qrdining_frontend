export default function BadgesVariant({ selected, onChange }) {
    const cravingsList = [
        "Spicy",
        "Sweet",
        "Light",
        "Heavy",
        "Drinks",
        "Snacks",
        "Diabetic",
        "Niramish",
        "Halal",
        "Vegan",
    ];

    const toggleCraving = (craving) => {
        if (selected.includes(craving)) {
            onChange(selected.filter((c) => c !== craving));
        } else {
            onChange([...selected, craving]);
        }
    };

    return (
        <div className="flex flex-wrap gap-2 pt-2">
            {cravingsList.map((craving) => {
                const isSelected = selected.includes(craving);
                return (
                    <button
                        key={craving}
                        onClick={() => toggleCraving(craving)}
                        className={`px-5 py-2 text-xs font-bold tracking-widest uppercase rounded-full border transition-all ${
                            isSelected
                                ? "bg-black text-white border-black shadow-sm"
                                : "bg-white border-gray-300 hover:border-gray-400 text-gray-700 hover:bg-gray-50"
                        }`}
                    >
                        {craving}
                    </button>
                );
            })}
        </div>
    );
}
