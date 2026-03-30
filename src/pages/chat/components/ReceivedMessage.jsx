export default function ReceivedMessage({ text, children }) {
    return (
        <div className="flex justify-start w-full">
            <div className={`${children ? 'max-w-[100%] sm:max-w-[85%] w-full min-w-0 overflow-hidden' : 'max-w-[85%]'} bg-gray-100 px-4 py-3 rounded-3xl rounded-tl-none text-sm`}>
                {text && <div className="break-words">{text}</div>}
                {children && <div className={`min-w-0 w-full ${text ? "mt-3" : ""}`}>{children}</div>}
            </div>
        </div>
    );
}
