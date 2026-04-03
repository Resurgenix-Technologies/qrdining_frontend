import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCcw, RotateCcw, ShoppingCart, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

import ChatWindow from "./components/ChatWindow";
import ButtonsVariant from "./components/ButtonsVariant";
import BadgesVariant from "./components/BadgesVariant";
import SuggestedMenu from "./components/SuggestedMenu";
import ReceivedMessage from "./components/ReceivedMessage";
import InlineAlert from "../../components/ui/InlineAlert";
import { SkeletonBlock, SkeletonText } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/ToastProvider";
import { getFriendlyErrorMessage } from "../../utils/errorHandling";
import { publicApi } from "../../utils/api";

const INITIAL_MESSAGE = "Hi! I can help you pick dishes quickly.";

const STAGES = {
    people: ["Solo", "2", "3-4", "5+"],
    diet: ["Veg", "Egg", "Non-veg"],
    time: ["<15 min", "15-30", "30+"],
    occasion: ["Quick bite", "Friends", "Date", "Work", "Celebration"],
};

function readSession(storageKey) {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function createMessage(isUser, text) {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        isUser,
        text,
    };
}

function ChatSkeleton() {
    return (
        <div className="surface-grid min-h-screen px-2 py-2 sm:px-4 sm:py-4">
            <div className="mx-auto flex min-h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-[#ddd5ca] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)]">
                <div className="flex items-center justify-between border-b border-[#ddd5ca] px-4 py-3 sm:px-5">
                    <SkeletonBlock className="h-10 w-48 rounded-full" />
                    <SkeletonBlock className="h-10 w-28 rounded-full" />
                </div>
                <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4">
                    <div className="border border-[#ddd5ca] bg-[#fbf8f2] p-4">
                        <SkeletonText lines={4} />
                        <SkeletonBlock className="mt-6 h-24 w-[85%] rounded-[28px]" />
                        <SkeletonBlock className="mt-6 ml-auto h-20 w-[68%] rounded-[28px]" />
                        <SkeletonBlock className="mt-6 h-28 w-[92%] rounded-[28px]" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CustomerChatSecure() {
    const { slug, qrToken } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const storageKey = useMemo(
        () => `qr-chat:${slug || "unknown"}:${qrToken || "takeaway"}`,
        [slug, qrToken],
    );
    const savedSession = useMemo(() => readSession(storageKey), [storageKey]);

    const [menuItems, setMenuItems] = useState([]);
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [error, setError] = useState(null);
    const [restaurantData, setRestaurantData] = useState(null);
    const [tableContext, setTableContext] = useState(savedSession?.tableContext || null);
    const [messages, setMessages] = useState(savedSession?.messages || []);
    const [userChoices, setUserChoices] = useState(
        savedSession?.userChoices || {
            people: null,
            diet: null,
            time: null,
            occasion: null,
            cravings: [],
        },
    );
    const [currentOrder, setCurrentOrder] = useState(savedSession?.currentOrder || []);
    const [currentStage, setCurrentStage] = useState(savedSession?.currentStage || null);
    const [isTyping, setIsTyping] = useState(false);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
    const [recommendedItems, setRecommendedItems] = useState(savedSession?.recommendedItems || []);
    const [sessionReady, setSessionReady] = useState(Boolean(savedSession?.sessionReady));

    const hasStartedRef = useRef(Boolean(savedSession?.messages?.length));

    const isRestaurantOpen = restaurantData?.isOpen !== false;
    const totalSelectedItems = currentOrder.reduce((count, item) => count + item.quantity, 0);
    const selectedPreferences = useMemo(
        () =>
            [userChoices.people, userChoices.diet, userChoices.time, userChoices.occasion, ...userChoices.cravings]
                .filter(Boolean),
        [userChoices],
    );
    const showInsightPanel = selectedPreferences.length > 0 || totalSelectedItems > 0;
    const orderPreview = currentOrder.slice(0, 2);
    const menuItemLookup = useMemo(() => {
        const map = new Map();
        menuItems.forEach((item) => {
            if (item?.id) {
                map.set(item.id, item);
            }
        });
        return map;
    }, [menuItems]);

    const appendMessage = (isUser, text) => {
        setMessages((prev) => [...prev, createMessage(isUser, text)]);
    };

    const pauseForTyping = async (delay = 650) => {
        setIsTyping(true);
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        setIsTyping(false);
    };

    const startConversation = async (contextTable = null) => {
        if (hasStartedRef.current) return;

        hasStartedRef.current = true;
        setMessages([createMessage(false, INITIAL_MESSAGE)]);
        setCurrentStage("people");
        setSessionReady(true);
        await new Promise((resolve) => window.setTimeout(resolve, 320));
        appendMessage(
            false,
            contextTable
                ? `Table ${contextTable.number} is ready. How many people are dining?`
                : "How many people are dining?",
        );
    };

    const loadExperience = async () => {
        if (!slug) {
            setError("Restaurant not found.");
            setLoadingMenu(false);
            return;
        }

        setLoadingMenu(true);
        setError(null);

        try {
            const [menuData, contextData] = await Promise.all([
                publicApi.getMenu(slug),
                qrToken ? publicApi.getContext(slug, qrToken) : Promise.resolve(null),
            ]);

            const allItems = [];
            (menuData.menu || []).forEach((category) => {
                if (category.items?.length) {
                    allItems.push(...category.items.filter((item) => item?.isAvailable !== false));
                }
            });

            setMenuItems(allItems);
            setRestaurantData(menuData.restaurant || null);
            setTableContext(contextData?.table || null);
            setSessionReady(true);

            if (!hasStartedRef.current && !(savedSession?.messages?.length > 0)) {
                await startConversation(contextData?.table || null);
            }
        } catch (err) {
            setError(getFriendlyErrorMessage(err, "Failed to load this restaurant."));
        } finally {
            setLoadingMenu(false);
        }
    };

    useEffect(() => {
        loadExperience();
    }, [slug, qrToken]);

    useEffect(() => {
        if (!storageKey || !sessionReady) return;
        window.sessionStorage.setItem(
            storageKey,
            JSON.stringify({
                sessionReady: true,
                messages,
                userChoices,
                currentOrder,
                currentStage,
                recommendedItems,
                tableContext,
            }),
        );
    }, [storageKey, sessionReady, messages, userChoices, currentOrder, currentStage, recommendedItems, tableContext]);

    useEffect(() => {
        if (!menuItemLookup.size) return;

        let removedOrderItems = [];
        setCurrentOrder((prev) => {
            let changed = false;
            const next = prev.reduce((items, entry) => {
                const latestItem = menuItemLookup.get(entry.id);
                if (!latestItem) {
                    removedOrderItems.push(entry.name || "Menu item");
                    changed = true;
                    return items;
                }

                const syncedItem = {
                    ...entry,
                    ...latestItem,
                    quantity: entry.quantity,
                };

                if (
                    syncedItem.name !== entry.name ||
                    syncedItem.price !== entry.price ||
                    syncedItem.description !== entry.description ||
                    syncedItem.imageUrl !== entry.imageUrl
                ) {
                    changed = true;
                }

                items.push(syncedItem);
                return items;
            }, []);

            return changed ? next : prev;
        });

        if (removedOrderItems.length) {
            toast.error(
                removedOrderItems.length === 1 ? "Item removed from cart" : "Items removed from cart",
                removedOrderItems.length === 1
                    ? `${removedOrderItems[0]} is no longer available, so it was removed from your cart.`
                    : `${removedOrderItems.length} items are no longer available, so they were removed from your cart.`,
                { duration: 3200 },
            );
        }

        setRecommendedItems((prev) => {
            let changed = false;
            const next = prev.reduce((items, entry) => {
                const latestItem = menuItemLookup.get(entry.id);
                if (!latestItem) {
                    changed = true;
                    return items;
                }

                if (
                    latestItem.name !== entry.name ||
                    latestItem.price !== entry.price ||
                    latestItem.description !== entry.description ||
                    latestItem.imageUrl !== entry.imageUrl
                ) {
                    changed = true;
                }

                items.push({ ...latestItem });
                return items;
            }, []);

            return changed ? next : prev;
        });
    }, [menuItemLookup, toast]);

    const handleUpdateOrder = (item, delta) => {
        if (!isRestaurantOpen) {
            toast.error("Restaurant closed", "Recommendations are visible, but ordering is paused right now.");
            return;
        }

        let changeType = null;
        setCurrentOrder((prev) => {
            const existingIndex = prev.findIndex((entry) => entry.id === item.id);

            if (existingIndex !== -1) {
                const updated = [...prev];
                const target = { ...updated[existingIndex] };
                const nextQuantity = (target.quantity || 0) + delta;

                if (nextQuantity <= 0) {
                    changeType = "removed";
                    return updated.filter((entry) => entry.id !== item.id);
                }

                changeType = delta > 0 ? "increased" : "decreased";
                target.quantity = nextQuantity;
                updated[existingIndex] = target;
                return updated;
            }

            if (delta > 0) {
                changeType = "added";
                return [...prev, { ...item, quantity: 1 }];
            }

            return prev;
        });

        if (changeType === "added") {
            toast.success("Added to cart", `${item.name} is ready in your cart.`, { duration: 1800 });
        }

        if (changeType === "removed") {
            toast.info("Removed from cart", `${item.name} was removed from your cart.`, { duration: 1800 });
        }
    };

    const moveToNextStage = async (nextChoices, stage) => {
        const prompts = {
            people: {
                nextStage: "diet",
                prompt: "What is your food preference?",
            },
            diet: {
                nextStage: "time",
                prompt: "How much time do you have?",
            },
            time: {
                nextStage: "occasion",
                prompt: "What is the occasion?",
            },
            occasion: {
                nextStage: "cravings",
                prompt: "What are you craving? You can choose multiple.",
            },
        };

        const config = prompts[stage];
        if (!config) return;

        await pauseForTyping();
        setUserChoices(nextChoices);
        setCurrentStage(config.nextStage);
        appendMessage(false, config.prompt);
    };

    const handleQuickReply = async (stage, value) => {
        if (!value) return;

        const nextChoices = { ...userChoices, [stage]: value };
        const userReplyMap = {
            people:
                value === "Solo"
                    ? "I am dining solo."
                    : `There are ${value} of us.`,
            diet: `I prefer ${value} food.`,
            time: `I have about ${value}.`,
            occasion: `This is for ${value}.`,
        };

        appendMessage(true, userReplyMap[stage] || String(value));
        await moveToNextStage(nextChoices, stage);
    };

    const refreshRecommendations = async (announce = false) => {
        setIsLoadingRecommendations(true);
        setRecommendedItems([]);
        setCurrentStage("recommendations");
        if (announce) {
            appendMessage(false, "Refreshing your recommendations.");
        }

        try {
            const response = await publicApi.getRecommendations({
                slug,
                qrToken: tableContext?.token || "",
                preferences: userChoices,
            });
            const suggestions = response.suggestions || [];
            setRecommendedItems(suggestions.length ? suggestions : menuItems.slice(0, 6));
        } catch {
            setRecommendedItems(menuItems.slice(0, 6));
        } finally {
            setIsLoadingRecommendations(false);
        }
    };

    const handleShowRecommendations = async () => {
        if (!userChoices.cravings.length) {
            toast.info("Choose a craving", "Pick at least one craving to unlock recommendations.");
            return;
        }

        appendMessage(true, `I am craving: ${userChoices.cravings.join(", ")}`);
        await pauseForTyping(700);
        appendMessage(false, "Here are a few dishes that match your choices.");
        await refreshRecommendations(false);
    };

    const handleReviewOrder = () => {
        if (!currentOrder.length) {
            toast.info("Cart is empty", "Add at least one item before opening checkout.");
            return;
        }

        if (!isRestaurantOpen) {
            toast.error("Restaurant closed", "Checkout is disabled until the restaurant reopens.");
            return;
        }

        const checkoutPath = tableContext?.token
            ? `/r/${slug}/${tableContext.token}#checkout`
            : `/menu/${slug}#checkout`;

        navigate(checkoutPath, { state: { cart: currentOrder } });
    };

    const handleClearChat = () => {
        window.sessionStorage.removeItem(storageKey);
        hasStartedRef.current = false;
        setMessages([]);
        setUserChoices({
            people: null,
            diet: null,
            time: null,
            occasion: null,
            cravings: [],
        });
        setCurrentOrder([]);
        setCurrentStage(null);
        setRecommendedItems([]);
        startConversation(tableContext);
        toast.success("Chat cleared", "Starting a fresh recommendation flow.", { duration: 2200 });
    };

    const renderActivePanel = () => {
        if (isTyping) {
            return (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full">
                    <ReceivedMessage>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                {[0, 1, 2].map((index) => (
                                    <motion.span
                                        key={index}
                                        className="h-2.5 w-2.5 rounded-full bg-black"
                                        animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
                                        transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.14 }}
                                    />
                                ))}
                            </div>
                            <p className="text-sm text-[#6d655c]">AI is thinking...</p>
                        </div>
                    </ReceivedMessage>
                </motion.div>
            );
        }

        if (currentStage && STAGES[currentStage]) {
            return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <ReceivedMessage>
                        <ButtonsVariant
                            options={STAGES[currentStage]}
                            selected={userChoices[currentStage]}
                            onSelect={(value) => handleQuickReply(currentStage, value)}
                        />
                    </ReceivedMessage>
                </motion.div>
            );
        }

        if (currentStage === "cravings") {
            return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <ReceivedMessage>
                        <BadgesVariant
                            selected={userChoices.cravings}
                            onChange={(cravings) => setUserChoices((prev) => ({ ...prev, cravings }))}
                        />
                        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                            <button type="button" onClick={handleShowRecommendations} className="glass-button w-full justify-center sm:w-auto">
                                <Sparkles className="h-4 w-4" />
                                Show Recommendations
                            </button>
                            <button type="button" onClick={handleClearChat} className="glass-button-secondary w-full justify-center sm:w-auto">
                                <RotateCcw className="h-4 w-4" />
                                Start Over
                            </button>
                        </div>
                    </ReceivedMessage>
                </motion.div>
            );
        }

        if (isLoadingRecommendations) {
            return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <ReceivedMessage>
                        <div className="scroll-strip scrollbar-hide flex gap-2.5 overflow-x-auto pb-1 pr-1 snap-x snap-mandatory sm:gap-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="min-w-[212px] max-w-[212px] flex-shrink-0 snap-start overflow-hidden rounded-[18px] border border-[#ddd5ca] bg-white p-3 sm:min-w-[228px] sm:max-w-[228px]"
                                >
                                    <SkeletonBlock className="h-24 w-full rounded-[18px] sm:h-28" />
                                    <SkeletonBlock className="mt-3 h-4 w-2/3" />
                                    <SkeletonText lines={2} className="mt-2" />
                                    <SkeletonBlock className="mt-3 h-10 w-full rounded-full" />
                                </div>
                            ))}
                        </div>
                    </ReceivedMessage>
                </motion.div>
            );
        }

        if (currentStage === "recommendations" && recommendedItems.length > 0) {
            return (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                    <ReceivedMessage>
                        <div className="space-y-4">
                            <SuggestedMenu
                                items={recommendedItems}
                                currentOrder={currentOrder}
                                onUpdateOrder={handleUpdateOrder}
                                disabled={!isRestaurantOpen}
                            />
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    onClick={handleReviewOrder}
                                    disabled={!currentOrder.length || !isRestaurantOpen}
                                    className="glass-button w-full justify-center"
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Review Cart
                                </button>
                                <button
                                    type="button"
                                    onClick={() => refreshRecommendations(true)}
                                    className="glass-button-secondary w-full justify-center"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Refresh Picks
                                </button>
                            </div>
                        </div>
                    </ReceivedMessage>
                </motion.div>
            );
        }

        return null;
    };

    if (loadingMenu) {
        return <ChatSkeleton />;
    }

    if (error) {
        return (
            <div className="surface-grid flex min-h-screen items-center justify-center px-4 py-8">
                <div className="w-full max-w-2xl">
                    <InlineAlert
                        title="Unable to load chatbot"
                        message={error}
                        onRetry={loadExperience}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="surface-grid min-h-screen px-2 py-2 sm:px-4 sm:py-4">
            <div className="mx-auto flex min-h-[calc(100vh-16px)] w-full max-w-5xl flex-col overflow-hidden rounded-[22px] border border-[#ddd5ca] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] sm:min-h-[calc(100vh-32px)]">
                <div className="flex flex-col gap-3 border-b border-[#ddd5ca] bg-black px-3 py-3 text-white sm:px-5 sm:py-4">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                        <button
                            onClick={() =>
                                navigate(
                                    tableContext?.token ? `/r/${slug}/${tableContext.token}` : `/menu/${slug}`,
                                )
                            }
                            className="glass-button-secondary !px-3.5 !py-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Menu
                        </button>
                        <span className="rounded-full border border-white/15 bg-white px-3 py-1.5 text-black">
                            {restaurantData?.name || "QR Dining"}
                        </span>
                        {tableContext?.number && (
                            <span className="rounded-full border border-white/15 bg-white px-3 py-1.5 text-black">
                                Table {tableContext.number}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <h1 className="text-lg font-semibold text-white sm:text-2xl">
                                Smart dining assistant
                            </h1>
                            <p className="mt-1 text-sm text-white/70">
                                Pick faster, compare quickly, and move to checkout without losing your cart.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={handleClearChat} className="glass-button-secondary !px-3.5 !py-2">
                                <RotateCcw className="h-4 w-4" />
                                Reset
                            </button>
                        </div>
                    </div>
                </div>

                {!isRestaurantOpen && (
                    <div className="border-b border-[#d7cec2] bg-[#f4ece1] px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f1d1d] sm:px-5">
                        Restaurant is currently closed. You can browse recommendations, but checkout is disabled.
                    </div>
                )}

                {showInsightPanel && (
                    <div className="border-b border-[#ddd5ca] bg-[#fbf8f2] px-3 py-3 sm:px-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6d655c]">
                                    Snapshot
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {selectedPreferences.map((choice) => (
                                        <span
                                            key={choice}
                                            className="rounded-full border border-[#ddd5ca] bg-white px-2.5 py-1 text-[10px] font-medium text-[#6d655c]"
                                        >
                                            {choice}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[#ddd5ca] bg-white px-3 py-2.5 lg:min-w-[250px]">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6d655c]">
                                        Chat Cart
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-[#111111]">
                                        {totalSelectedItems} item{totalSelectedItems === 1 ? "" : "s"}
                                    </p>
                                    {orderPreview.length > 0 && (
                                        <p className="mt-1 truncate text-xs text-[#6d655c]">
                                            {orderPreview.map((item) => `${item.name} x${item.quantity}`).join(" • ")}
                                            {currentOrder.length > orderPreview.length ? ` +${currentOrder.length - orderPreview.length} more` : ""}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleReviewOrder}
                                    disabled={!currentOrder.length || !isRestaurantOpen}
                                    className={`glass-button !px-3.5 !py-2 whitespace-nowrap ${currentStage === "recommendations" ? "hidden" : ""}`}
                                >
                                    <ShoppingCart className="h-4 w-4" />
                                    Checkout
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex flex-1 min-h-0 flex-col p-2 sm:p-3">
                    <div className="glass-panel flex min-h-0 flex-col border border-[#ddd5ca]">
                        <ChatWindow messages={messages} currentOrder={currentOrder}>
                            {renderActivePanel()}
                        </ChatWindow>

                    </div>
                </div>
            </div>
        </div>
    );
}
