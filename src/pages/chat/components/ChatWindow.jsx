import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SentMessage from "./SentMessage";
import ReceivedMessage from "./ReceivedMessage";

export default function ChatWindow({ messages, currentOrder }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 bg-white w-full overflow-x-hidden min-w-0"
        >
            <AnimatePresence>
                {messages.map((msg, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        {msg.isUser ? (
                            <SentMessage text={msg.text} />
                        ) : (
                            <ReceivedMessage text={msg.text}>
                                {typeof msg.component === 'function' ? msg.component(currentOrder) : msg.component}
                            </ReceivedMessage>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}
