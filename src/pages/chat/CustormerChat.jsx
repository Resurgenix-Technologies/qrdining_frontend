import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { motion } from "framer-motion";

import ChatWindow from "./components/ChatWindow";
import ButtonsVariant from "./components/ButtonsVariant";
import BadgesVariant from "./components/BadgesVariant";
import SuggestedMenu from "./components/SuggestedMenu";
import { getSuggestions } from "./utils/suggestionAlgo";
import { publicApi } from "../../utils/api";

const TypingLoader = () => (
    <div className="flex items-center gap-1 pl-2">
        {[0, 1, 2].map((i) => (
            <motion.div
                key={i}
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ y: [0, -6, 0] }}
                transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.15,
                }}
            />
        ))}
    </div>
);

export default function CustomerChat() {
    const { slug, tableNumber } = useParams();
    const navigate = useNavigate();

    const [menuItems, setMenuItems] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [error, setError] = useState(null);

    const [messages, setMessages] = useState([
        {
            isUser: false,
            text: "Hi! Welcome to QR Dining 👋\nLet's find the perfect dishes for you.",
        },
    ]);

    const [userChoices, setUserChoices] = useState({
        people: null,
        diet: null,
        time: null,
        occasion: null,
        cravings: [],
    });

    const [currentOrder, setCurrentOrder] = useState([]);
    const [input, setInput] = useState("");
    const [isInputEnabled, setIsInputEnabled] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    const [customerInfo, setCustomerInfo] = useState({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        specialInstructions: "",
    });

    const [infoStep, setInfoStep] = useState(null); // 'name' | 'phone' | 'email' | 'instructions' | null

    const chatRef = useRef(null);

    // Reliable auto-scroll function
    const scrollToBottom = () => {
        setTimeout(() => {
            if (chatRef.current) {
                chatRef.current.scrollTo({
                    top: chatRef.current.scrollHeight,
                    behavior: "smooth",
                });
            }
        }, 100);
    };

    // Load Menu
    useEffect(() => {
        if (!slug) return;
        publicApi
            .getMenu(slug)
            .then((data) => {
                const allItems = [];
                (data.menu || []).forEach((cat) => {
                    if (cat.items?.length) allItems.push(...cat.items);
                });
                setMenuItems(allItems);
            })
            .catch(() => setError("Failed to load menu"))
            .finally(() => setLoadingMenu(false));
    }, [slug]);

    // First question
    useEffect(() => {
        if (loadingMenu) return;
        setTimeout(() => {
            addMessage(
                false,
                "How many people are dining?",
                <ButtonsVariant
                    options={["Solo", "2", "3–4", "5+"]}
                    onSelect={(val) => handleQuickReply("people", val)}
                />,
            );
            scrollToBottom();
        }, 700);
    }, [loadingMenu]);

    const addMessage = (isUser, text, component = null) => {
        setMessages((prev) => [...prev, { isUser, text, component }]);
        scrollToBottom();
    };

    const showTyping = async () => {
        setIsTyping(true);
        scrollToBottom();
        await new Promise((resolve) => setTimeout(resolve, 1300));
        setIsTyping(false);
        scrollToBottom();
    };

    const handleQuickReply = async (key, value) => {
        setUserChoices((prev) => ({ ...prev, [key]: value }));

        let userReply = "";
        switch (key) {
            case "people":
                userReply =
                    value === "Solo"
                        ? "I have come here solo"
                        : `I am dining with ${value} people`;
                break;
            case "diet":
                userReply = `I prefer ${value} food`;
                break;
            case "time":
                userReply = `I have ${value} time`;
                break;
            case "occasion":
                userReply = `This is for ${value}`;
                break;
        }

        addMessage(true, userReply);
        await showTyping();

        let nextText = "",
            nextComponent = null;

        if (key === "people") {
            nextText = "What’s your food preference?";
            nextComponent = (
                <ButtonsVariant
                    options={["Veg", "Egg", "Non-veg"]}
                    onSelect={(v) => handleQuickReply("diet", v)}
                />
            );
        } else if (key === "diet") {
            nextText = "How much time do you have?";
            nextComponent = (
                <ButtonsVariant
                    options={["<15 min", "15–30", "30+"]}
                    onSelect={(v) => handleQuickReply("time", v)}
                />
            );
        } else if (key === "time") {
            nextText = "What’s the occasion?";
            nextComponent = (
                <ButtonsVariant
                    options={[
                        "Quick bite",
                        "Friends",
                        "Date",
                        "Work",
                        "Celebration",
                    ]}
                    onSelect={(v) => handleQuickReply("occasion", v)}
                />
            );
        } else if (key === "occasion") {
            nextText = "What are you craving? (You can select multiple)";
            nextComponent = (
                <BadgesVariant
                    selected={userChoices.cravings}
                    onChange={(cravings) =>
                        setUserChoices((p) => ({ ...p, cravings }))
                    }
                />
            );
        }

        addMessage(false, nextText, nextComponent);
        setCurrentStep((prev) => prev + 1);
    };

    const handleAddToOrder = (item) => {
        setCurrentOrder((prev) => {
            const exists = prev.findIndex((i) => i._id === item._id);
            if (exists !== -1) {
                const updated = [...prev];
                updated[exists].quantity = (updated[exists].quantity || 1) + 1;
                return updated;
            }
            return [...prev, { ...item, quantity: 1 }];
        });

        addMessage(true, `Added "${item.name}" to my order`);
    };

    const handleShowRecommendations = async () => {
        if (userChoices.cravings.length === 0) return;

        addMessage(true, `I am craving: ${userChoices.cravings.join(", ")}`);
        await showTyping();

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
                    items={
                        suggestions.length ? suggestions : menuItems.slice(0, 8)
                    }
                    onAddToOrder={handleAddToOrder}
                />,
            );
            setIsInputEnabled(true);
            scrollToBottom();
        }, 600);
    };

    const handleSend = async () => {
        if (!input.trim() || isPlacingOrder) return;

        const userMessage = input.trim();
        addMessage(true, userMessage); // Show user message immediately
        setInput(""); // Clear input right away

        scrollToBottom(); // Scroll immediately after user sends

        if (infoStep) {
            await processCustomerInfo(userMessage);
            return;
        }

        // Normal flow after recommendations
        if (currentOrder.length === 0) {
            await showTyping();
            addMessage(
                false,
                "You haven't added any items yet. Please add some dishes from the suggestions.",
            );
            return;
        }

        // Start collecting customer info
        await showTyping();
        setInfoStep("name");
        addMessage(false, "Great choice! What's your full name?");
    };

    const processCustomerInfo = async (userMessage) => {
        await showTyping();

        if (infoStep === "name") {
            setCustomerInfo((prev) => ({ ...prev, customerName: userMessage }));
            setInfoStep("phone");
            addMessage(
                false,
                "Please enter your phone number (for order updates):",
            );
        } else if (infoStep === "phone") {
            setCustomerInfo((prev) => ({
                ...prev,
                customerPhone: userMessage,
            }));
            setInfoStep("email");
            addMessage(false, "Your email (optional - you can skip):");
        } else if (infoStep === "email") {
            setCustomerInfo((prev) => ({
                ...prev,
                customerEmail: userMessage,
            }));
            setInfoStep("instructions");
            addMessage(false, "Any special instructions or notes?");
        } else if (infoStep === "instructions") {
            setCustomerInfo((prev) => ({
                ...prev,
                specialInstructions: userMessage,
            }));
            await placeFinalOrder();
        }
    };

    const placeFinalOrder = async () => {
        setIsPlacingOrder(true);
        await showTyping();

        addMessage(
            false,
            `Thank you ${customerInfo.customerName}! Placing your order...`,
        );

        const orderData = {
            restaurantId: slug,
            items: currentOrder.map((item) => ({
                menuItemId: item._id,
                name: item.name,
                quantity: item.quantity,
                unitPrice: item.price,
            })),
            customerName: customerInfo.customerName,
            customerPhone: customerInfo.customerPhone,
            customerEmail: customerInfo.customerEmail || "",
            tableNumber: tableNumber ? parseInt(tableNumber) : null,
            specialInstructions: customerInfo.specialInstructions || "",
            orderType: "Dine-In",
        };

        try {
            const response = await publicApi.placeOrder(orderData);
            if (response?.success) {
                addMessage(
                    false,
                    "✅ Order placed successfully!\nYour order is being prepared.",
                );
            } else {
                addMessage(
                    false,
                    "❌ Failed to place order. Please inform staff.",
                );
            }
        } catch (err) {
            console.error(err);
            addMessage(false, "❌ Failed to place order. Please try again.");
        } finally {
            setIsPlacingOrder(false);
            setInfoStep(null);
        }
    };

    if (loadingMenu)
        return (
            <div className="min-h-screen flex items-center justify-center">
                Loading menu...
            </div>
        );
    if (error)
        return (
            <div className="min-h-screen flex items-center justify-center text-red-600 px-6">
                {error}
            </div>
        );

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <div className="border-b border-border bg-white sticky top-0 z-50">
                <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-sm font-bold tracking-widest uppercase hover:text-black"
                    >
                        <ArrowLeft className="w-5 h-5" /> Back To Menu
                    </button>
                    {/* <div className="text-lg font-black tracking-[0.2em] uppercase"> */}
                    {/*     QR Dining */}
                    {/* </div> */}
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={chatRef}
                className="max-w-3xl mx-auto items-center justify-between flex-1 overflow-y-auto px-6 py-6 space-y-6 bg-white"
            >
                <ChatWindow messages={messages} />

                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-gray-100 rounded-3xl px-5 py-3 inline-flex items-center">
                            <TypingLoader />
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="border-t border-border bg-white p-4 sticky bottom-0 z-40">
                <div className="max-w-3xl mx-auto">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                            placeholder={
                                infoStep
                                    ? "Type your answer..."
                                    : isInputEnabled
                                      ? "Type anything to place order..."
                                      : "Answer above..."
                            }
                            disabled={isPlacingOrder}
                            className="flex-1 bg-gray-100 border border-transparent focus:border-black rounded-3xl px-6 py-3.5 text-sm focus:outline-none disabled:opacity-60"
                        />
                        <button
                            onClick={handleSend}
                            disabled={isPlacingOrder || !input.trim()}
                            className="bg-black text-white p-3.5 rounded-3xl hover:bg-gray-800 disabled:opacity-50 transition"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>

                    {/* OK Button */}
                    {currentStep === 4 &&
                        userChoices.cravings.length > 0 &&
                        !isInputEnabled && (
                            <div className="flex justify-center mt-5">
                                <button
                                    onClick={handleShowRecommendations}
                                    className="bg-black text-white px-10 py-3 text-xs font-bold tracking-widest uppercase rounded-2xl hover:bg-gray-800 transition"
                                >
                                    OK — Show My Recommendations
                                </button>
                            </div>
                        )}

                    {currentOrder.length > 0 && (
                        <p className="text-center text-xs text-gray-500 mt-3 tracking-widest">
                            {currentOrder.length} item
                            {currentOrder.length > 1 ? "s" : ""} in your order
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
