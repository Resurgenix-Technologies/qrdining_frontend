import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ChatWindow from "./components/ChatWindow";
import ButtonsVariant from "./components/ButtonsVariant";
import BadgesVariant from "./components/BadgesVariant";
import SuggestedMenu from "./components/SuggestedMenu";
import { getSuggestions } from "./utils/suggestionAlgo";

export default function CustomerChat({ menuItems = [] }) {
    const navigate = useNavigate();

    const [messages, setMessages] = useState([
        {
            isUser: false,
            text: "Hi! Welcome to QR Dining 👋\nLet's find the perfect dishes for you.",
        },
        {
            isUser: false,
            text: "How many people are dining?",
            component: (
                <ButtonsVariant
                    options={["Solo", "2", "3–4", "5+"]}
                    selected={null}
                    onSelect={(val) => handleQuickReply("people", val)}
                />
            ),
        },
    ]);

    const [userChoices, setUserChoices] = useState({
        people: null,
        diet: null,
        time: null,
        occasion: null,
        cravings: [],
    });

    const [input, setInput] = useState("");
    const [step, setStep] = useState(0); // 0=people, 1=diet, 2=time, 3=occasion, 4=cravings, 5=done

    const addMessage = (isUser, text, component = null) => {
        setMessages((prev) => [...prev, { isUser, text, component }]);
    };

    const handleQuickReply = (key, value) => {
        setUserChoices((prev) => ({ ...prev, [key]: value }));

        let nextQuestion = "";

        if (key === "people") {
            nextQuestion = "What’s your food preference?";
            setStep(1);
            addMessage(
                false,
                nextQuestion,
                <ButtonsVariant
                    options={["Veg", "Egg", "Non-veg"]}
                    selected={null}
                    onSelect={(val) => handleQuickReply("diet", val)}
                />,
            );
        } else if (key === "diet") {
            nextQuestion = "How much time do you have?";
            setStep(2);
            addMessage(
                false,
                nextQuestion,
                <ButtonsVariant
                    options={["<15 min", "15–30", "30+"]}
                    selected={null}
                    onSelect={(val) => handleQuickReply("time", val)}
                />,
            );
        } else if (key === "time") {
            nextQuestion = "What’s the occasion?";
            setStep(3);
            addMessage(
                false,
                nextQuestion,
                <ButtonsVariant
                    options={[
                        "Quick bite",
                        "Friends",
                        "Date",
                        "Work",
                        "Celebration",
                    ]}
                    selected={null}
                    onSelect={(val) => handleQuickReply("occasion", val)}
                />,
            );
        } else if (key === "occasion") {
            nextQuestion = "What are you craving? (select multiple)";
            setStep(4);
            addMessage(
                false,
                nextQuestion,
                <BadgesVariant
                    selected={userChoices.cravings}
                    onChange={(cravings) =>
                        setUserChoices((p) => ({ ...p, cravings }))
                    }
                />,
            );
        }
    };

    const finishCravings = () => {
        if (userChoices.cravings.length === 0) return;

        addMessage(
            true,
            "These are my cravings: " + userChoices.cravings.join(", "),
        );

        const suggestions = getSuggestions(userChoices, menuItems);

        addMessage(
            false,
            "Here are some dishes I think you'll love based on your preferences:",
        );

        setTimeout(() => {
            addMessage(
                false,
                "",
                <SuggestedMenu
                    items={suggestions}
                    onAddToOrder={(item) => {
                        addMessage(true, `Added "${item.name}" to my order`);
                    }}
                />,
            );
        }, 600);

        setStep(5);
    };

    const handleSend = () => {
        if (!input.trim()) return;

        addMessage(true, input.trim());
        setInput("");

        // Optional: let user type custom message if needed
    };

    // Auto-advance when cravings are selected (or add a "Done" button)
    useEffect(() => {
        if (step === 4 && userChoices.cravings.length > 0) {
            const timer = setTimeout(finishCravings, 800);
            return () => clearTimeout(timer);
        }
    }, [userChoices.cravings, step]);

    return (
        <div className="min-h-screen bg-white flex flex-col p-8">
            {/* Header - similar to your Navbar style */}
            <div className="border-b border-border bg-white sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back
                    </button>
                    {/* <div className="text-lg font-black tracking-[0.2em] uppercase"> */}
                    {/*     QR Dining */}
                    {/* </div> */}
                    <div className="text-xs text-gray-400">AI Assistant</div>
                </div>
            </div>

            <ChatWindow messages={messages} />

            {/* Input Area */}
            <div className="border-t border-border bg-white p-4">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-100 border border-transparent focus:border-black rounded-3xl px-6 py-3 text-sm focus:outline-none"
                    />
                    <button
                        onClick={handleSend}
                        className="bg-black text-white p-3 rounded-3xl hover:bg-gray-800 transition"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-3 tracking-widest">
                    Powered by Resurgenix Technologies
                </p>
            </div>
        </div>
    );
}
