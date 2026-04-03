import { useEffect, useState } from "react";

import { CHATBOT_CRAVING_TAGS } from "../constants";

export default function BadgesVariant({ selected, onChange }) {
    const [localSelected, setLocalSelected] = useState(selected || []);

    useEffect(() => {
        setLocalSelected(selected || []);
    }, [selected]);

    const toggleCraving = (craving) => {
        let newSelected;
        if (localSelected.includes(craving)) {
            newSelected = localSelected.filter((c) => c !== craving);
        } else {
            newSelected = [...localSelected, craving];
        }
        setLocalSelected(newSelected);
        onChange(newSelected);
    };

    return (
        <div className="flex flex-wrap gap-2 pt-1">
            {CHATBOT_CRAVING_TAGS.map((craving) => {
                const isSelected = localSelected.includes(craving);
                return (
                    <button
                        key={craving}
                        onClick={() => toggleCraving(craving)}
                        className={`rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all sm:px-3.5 ${
                            isSelected
                                ? "border-black bg-black text-white"
                                : "border-[#ddd5ca] bg-white text-[#6d655c] hover:bg-[#f5efe7]"
                        }`}
                    >
                        {craving}
                    </button>
                );
            })}
        </div>
    );
}
