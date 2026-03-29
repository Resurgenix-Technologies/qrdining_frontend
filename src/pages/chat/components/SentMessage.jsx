export default function SentMessage({ text }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[75%] bg-black text-white px-4 py-3 rounded-3xl rounded-tr-none text-sm">
                {text}
            </div>
        </div>
    );
}
