export default function ReceivedMessage({ text, children }) {
    return (
        <div className="flex justify-start">
            <div className="max-w-[80%] bg-gray-100 px-4 py-3 rounded-3xl rounded-tl-none text-sm">
                <div>{text}</div>
                {children}
            </div>
        </div>
    );
}
