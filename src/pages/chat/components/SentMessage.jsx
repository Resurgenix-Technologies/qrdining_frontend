export default function SentMessage({ text }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[84%] rounded-[18px] bg-black px-3.5 py-3 text-sm text-white shadow-[0_10px_22px_rgba(0,0,0,0.14)]">
                {text}
            </div>
        </div>
    );
}
