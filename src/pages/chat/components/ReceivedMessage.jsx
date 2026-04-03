export default function ReceivedMessage({ text, children }) {
    return (
        <div className="flex w-full justify-start">
            <div className={`${children ? 'max-w-full w-full min-w-0 overflow-hidden' : 'max-w-[92%] sm:max-w-[86%]'} rounded-[18px] border border-[#ddd5ca] bg-white px-3.5 py-3 text-sm text-[#3f352d] shadow-[0_10px_22px_rgba(0,0,0,0.05)]`}>
                {text && <div className="break-words whitespace-pre-line leading-6 text-[#3f352d]">{text}</div>}
                {children && <div className={`min-w-0 w-full ${text ? "mt-3" : ""}`}>{children}</div>}
            </div>
        </div>
    );
}
