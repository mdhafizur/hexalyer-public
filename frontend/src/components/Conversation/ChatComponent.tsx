import { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    ListItem,
    CircularProgress,
    AppBar,
    Toolbar,
    Grow,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { useAppDispatch, useAppSelector } from "@app/hook";
import { createConversationThunk } from "@app/conversations/slices/conversationsSlice";
import { RootState } from "@app/store";
import { socket } from "@app/socket";
import ObjectId from "bson-objectid";
import { Message } from "@app/messages/types/message.types";
import { AiMessage } from "@components/Conversation/AiMessage";
import { UserMessage } from "@components/Conversation/UserMessage";
import { ChoicesComponent } from "@components/Conversation/ChoicesComponent";
import { useNavigate } from "react-router-dom";

interface ChatComponentProps {
    conversationId: string | "new";
    onConversationCreated?: (conversationId: string) => void;
}

export default function ChatComponent({ conversationId, onConversationCreated }: ChatComponentProps) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { loading } = useAppSelector((state: RootState) => state.conversations);

    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [webHexValue, setWebHexValue] = useState("");
    const [isFetching, setIsFetching] = useState(false);
    const [selectedMode, setSelectedMode] = useState<string>("manual");
    const chatContainerRef = useRef<HTMLDivElement | null>(null);


    const addMessage = (message: Message) => {
        setMessages((prevMessages) => {
            const index = prevMessages.findIndex((msg) => msg._id === message._id);

            if (index !== -1) {
                const updatedMessages = [...prevMessages];
                updatedMessages[index] = { ...updatedMessages[index], ...message };
                return updatedMessages;
            }

            return [...prevMessages, message].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
    };

    const handleModeAndInputChange = (mode: string, inputValue: string) => {
        setSelectedMode(mode);
        setWebHexValue(inputValue); // Update state asynchronously

        console.log("Mode:", mode);
        console.log("Input Value Direct:", inputValue);

        // Use inputValue directly, not webHexValue, as it is updated asynchronously
        if (mode === "webhex") {
            setWebHexValue(inputValue)
            handleSendMessage(inputValue, mode);
        }
    };

    // Join the conversation room
    const joinRoom = useCallback(() => {
        if (conversationId !== "new") {
            socket.emit("join_room", { conversation_id: conversationId });
            setMessages([]);
        }
    }, [conversationId]);

    useEffect(() => {
        if (conversationId !== "new") joinRoom();
    }, [joinRoom, conversationId]);




    useEffect(() => {
        const handleMessageHistory = ({ messages }: { messages: Message[] }) => {
            if (messages.length) {
                setMessages((prev) => {
                    const combinedMessages = [
                        ...prev.filter((prevMsg) => !messages.some((newMsg) => newMsg._id === prevMsg._id)),
                        ...messages,
                    ];
                    return combinedMessages.sort(
                        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                });
            }
            setIsFetching(false);
        };

        socket.on("message_history", handleMessageHistory);
        return () => socket.off("message_history", handleMessageHistory);
    }, []);



    useEffect(() => {
        const handleAiMessage = (message: Message) => {
            if (message.conversation_id === conversationId) addMessage(message);
        };

        socket.off("ai_message").on("ai_message", handleAiMessage);
        return () => socket.off("ai_message", handleAiMessage);
    }, [conversationId]);




    useEffect(() => {
        const handleAiMessageStream = (aiMessage: Message) => {
            if (aiMessage.conversation_id === conversationId) {
                setMessages((prev) => {
                    const index = prev.findIndex((msg) => msg._id === aiMessage._id);
                    if (index !== -1) {
                        const updatedMessages = [...prev];
                        updatedMessages[index] = {
                            ...updatedMessages[index],
                            content: updatedMessages[index].content + aiMessage.content,
                        };
                        return updatedMessages;
                    }
                    return [...prev, aiMessage];
                });
            }
        };

        socket.on("ai_message_stream", handleAiMessageStream);
        return () => socket.off("ai_message_stream", handleAiMessageStream);
    }, [conversationId]);



    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Mode-specific handlers
    const handleManualMode = (generatedId: string) => {

        socket.emit("on_stream_message_to_ai", {
            _id: generatedId,
            conversation_id: conversationId,
            sender: "user",
            content: inputValue,
            type: "manual",
        });

        addMessage({
            _id: generatedId,
            conversation_id: conversationId,
            sender: "user",
            type: "manual",
            content: inputValue,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    };

    const handleWebHexMode = (generatedId: string, webUrl: string) => {

        console.log("handleWebHexMode on_stream_message_to_ai", {
            _id: generatedId,
            conversation_id: conversationId,
            sender: "user",
            content: `WebHex request: ${webUrl}`,
            type: "webhex",
            details: { url: webUrl },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })

        // return;
        socket.emit("on_stream_message_to_ai", {
            _id: generatedId,
            conversation_id: conversationId,
            sender: "user",
            content: `WebHex request: ${webUrl}`,
            type: "webhex",
            details: { url: webUrl },
        });


        addMessage({
            _id: generatedId,
            conversation_id: conversationId,
            sender: "user",
            type: "manual",
            content: `WebHex request: ${webUrl}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
    };

    const handleSendMessage = async (customInputValue = inputValue, mode = selectedMode) => {
        if (customInputValue.trim() === "") return;
        const generatedId = ObjectId().toHexString();

        try {
            if (conversationId === "new") {
                const resultAction = await dispatch(createConversationThunk({ title: inputValue, user_id: "67667e7811799977286f3d6b" }));
                if (createConversationThunk.fulfilled.match(resultAction)) {
                    const newConversation = resultAction.payload;
                    if (onConversationCreated) onConversationCreated(newConversation._id);
                    navigate(`/conversations/${newConversation._id}`);
                }
            }

            if (mode === "manual") handleManualMode(generatedId);
            if (mode === "webhex") handleWebHexMode(generatedId, customInputValue);

            setInputValue("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleScroll = () => {
        const container = chatContainerRef.current;
        if (container && container.scrollTop === 0 && !isFetching && !loading) {
            setIsFetching(true);
            socket.emit("load_more_messages", {
                conversation_id: conversationId,
                created_at: messages[0]?.created_at || new Date().toISOString(),
            });
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">{conversationId === "new" ? "New Conversation" : `Conversation: ${conversationId}`}</Typography>
                </Toolbar>
            </AppBar>
            <Box ref={chatContainerRef} sx={{ flexGrow: 1, overflowY: "auto" }} onScroll={handleScroll}>
                {loading && <CircularProgress />}
                {!loading && messages.length === 0 && (
                    <Typography>No messages yet. Start the conversation!</Typography>
                )}
                {messages.map((message, index) => (
                    <Grow in key={`${message._id}`} timeout={500}>
                        <ListItem
                            sx={{
                                justifyContent: message.sender === "user" ? "flex-end" : "flex-start",
                                mb: 1,
                            }}
                        >
                            {message.sender === "ai" && <AiMessage message={message} />}
                            {message.sender === "user" && <UserMessage message={message} />}
                        </ListItem>
                    </Grow>
                ))}
            </Box>
            <ChoicesComponent onModeChange={handleModeAndInputChange} />
            {selectedMode === "manual" && (
                <Paper sx={{ display: "flex", alignItems: "center", p: 2 }}>
                    <TextField
                        fullWidth
                        placeholder="Type a message..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                    />
                    <IconButton onClick={() => handleSendMessage()} disabled={loading || !inputValue.trim()}>
                        <SendIcon />
                    </IconButton>
                </Paper>
            )}
        </Box>
    );
}
