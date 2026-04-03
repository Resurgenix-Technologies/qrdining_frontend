import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SentMessage from "./SentMessage";
import ReceivedMessage from "./ReceivedMessage";

export default function ChatWindow({ messages, currentOrder, children }) {
    const scrollRef = useRef(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: "smooth",
        });
    }, [messages, children]);

    return (
        <div
            ref={scrollRef}
            className="flex-1 min-w-0 w-full overflow-x-hidden overflow-y-auto space-y-4 px-3 py-4 sm:px-4 sm:py-5"
        >
            <AnimatePresence>
                {messages.map((msg, i) => (
                    <motion.div
                        key={msg.id || i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="w-full"
                    >
                        {msg.isUser ? (
                            <SentMessage text={msg.text} />
                        ) : (
                            <ReceivedMessage text={msg.text}>
                                {typeof msg.component === "function" ? msg.component(currentOrder) : msg.component}
                            </ReceivedMessage>
                        )}
                    </motion.div>
                ))}
            </AnimatePresence>
            {children}
        </div>
    );
}
