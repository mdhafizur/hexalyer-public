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
import { useNavigate } from 'react-router-dom';

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
    const [isFetching, setIsFetching] = useState(false); // To track fetching state
    const chatContainerRef = useRef<HTMLDivElement | null>(null); // Ref for the chat container

    const [selectedMode, setSelectedMode] = useState<string>("");
    const [webHexValue, setWebHexValue] = useState<string>("");

    // Callback function to handle the emitted values from the child component
    const handleModeAndInputChange = (mode: string, inputValue: string) => {
        setSelectedMode(mode);
        setWebHexValue(inputValue);
        console.log("Selected Mode:", mode);
        console.log("Web Hex Input Value:", inputValue);
    };


    // Join the conversation room
    const joinRoom = useCallback(() => {
        if (conversationId !== "new") {
            socket.emit("join_room", { conversation_id: conversationId });
            setMessages([]); // Clear messages when switching rooms
        }
    }, [conversationId]);

    useEffect(() => {
        if (conversationId !== "new") {
            joinRoom();
        }

        if (conversationId == "new") {
            setMessages([]);
        }
    }, [joinRoom, conversationId]);

    useEffect(() => {
        const handleMessageHistory = (paginatedMessages: {
            page: string,
            messages: Message[]
        }) => {
            const newMessages = paginatedMessages.messages || [];
            if (Array.isArray(newMessages) && newMessages.length > 0) {
                setMessages((previousMessages) => [
                    ...newMessages.filter(
                        (msg) => !previousMessages.some((prev) => prev._id === msg._id)
                    ),
                    ...previousMessages,
                ]);

                // Restore scroll position after prepending messages
                if (chatContainerRef.current) {
                    chatContainerRef.current.scrollTop += chatContainerRef.current.scrollHeight;
                }
            }
            setIsFetching(false);
        };

        socket.on("message_history", handleMessageHistory);

        return () => {
            socket.off("message_history", handleMessageHistory);
        };
    }, []);


    useEffect(() => {
        socket.on('ai_message_stream', function (aiMessage: Message) {
            console.log("AI message chunk:", aiMessage);

            if (aiMessage.conversation_id === conversationId) {
                setMessages((prevMessages) => {
                    // Check if the message already exists
                    const existingMessageIndex = prevMessages.findIndex(
                        (msg) => msg._id === aiMessage._id
                    );

                    if (existingMessageIndex !== -1) {
                        // Update the content by appending the chunk
                        const updatedMessages = [...prevMessages];
                        updatedMessages[existingMessageIndex] = {
                            ...updatedMessages[existingMessageIndex],
                            content: updatedMessages[existingMessageIndex].content + aiMessage.content,
                        };
                        return updatedMessages;
                    } else {
                        // Add a new message with the initial chunk of content
                        return [
                            ...prevMessages,
                            {
                                ...aiMessage,
                                content: aiMessage.content || "", // Ensure content exists even if it's empty initially
                            },
                        ];
                    }
                });
            }
        });

        // Cleanup the socket listener
        return () => {
            socket.off('ai_message_stream');
        };
    }, [conversationId]);


    useEffect(() => {
        const handleAiMessage = (message: Message) => {
            console.log("handleAiMessage", message)
            if (message.conversation_id === conversationId) {
                setMessages((prevMessages) => {
                    if (prevMessages.some((msg) => msg._id === message._id)) return prevMessages;
                    return [...prevMessages, message];
                });
            }
        };

        socket.on("ai_message", handleAiMessage);

        return () => {
            socket.off("ai_message", handleAiMessage);
        };
    }, [conversationId]);

    // Scroll to the bottom when messages change or component mounts
    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle scroll events for loading more messages
    const handleScroll = () => {
        const container = chatContainerRef.current;
        if (!container || isFetching || loading) return;

        if (container.scrollTop === 0) {
            const oldestMessage = messages[0];
            const oldestCreatedAt = oldestMessage?.created_at || new Date().toISOString();

            setIsFetching(true);

            socket.emit("load_more_messages", {
                conversation_id: conversationId,
                sort_by: "desc",
                created_at: oldestCreatedAt,
            });
        }
    };

    // Handle sending messages
    const handleSendMessage = async () => {
        if (inputValue.trim() === "") return;

        const generatedId = ObjectId().toHexString();

        try {
            if (conversationId === "new") {
                const resultAction = await dispatch(
                    createConversationThunk({ title: inputValue, user_id: "674c442875a3b4802b6fbd32" })
                );

                if (createConversationThunk.fulfilled.match(resultAction)) {
                    const newConversation = resultAction.payload;

                    if (onConversationCreated) {
                        onConversationCreated(newConversation._id);
                    }

                    navigate(`/conversations/${newConversation._id}`);


                    if (selectedMode == "MANUAL") {
                        // socket.emit("send_message", {
                        //     _id: generatedId,
                        //     conversation_id: newConversation._id,
                        //     sender: "user",
                        //     content: inputValue,
                        // });
                        socket.emit("on_stream_message_to_ai", {
                            _id: generatedId,
                            conversation_id: conversationId,
                            sender: "user",
                            content: inputValue,
                        });
                    }


                    setMessages((prevMessages) => [
                        ...prevMessages,
                        {
                            _id: generatedId,
                            conversation_id: newConversation._id,
                            sender: "user",
                            content: inputValue,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        },
                    ]);

                }
            } else {

                if (selectedMode == "MANUAL") {
                    // socket.emit("send_message", {
                    //     _id: generatedId,
                    //     conversation_id: conversationId,
                    //     sender: "user",
                    //     content: inputValue,
                    // });

                    socket.emit("on_stream_message_to_ai", {
                        _id: generatedId,
                        conversation_id: conversationId,
                        sender: "user",
                        content: inputValue,
                    });
                }

                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        _id: generatedId,
                        conversation_id: conversationId,
                        sender: "user",
                        content: inputValue,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    },
                ]);
            }

            setInputValue("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
                height: "100%",
                bgcolor: "background.paper",
            }}
        >
            <AppBar position="static" elevation={1}>
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        {conversationId === "new" ? "New Conversation" : `Conversation: ${conversationId}`}
                    </Typography>
                </Toolbar>
            </AppBar>

            <Box
                ref={chatContainerRef}
                sx={{
                    flexGrow: 1,
                    display: "flex",
                    flexDirection: "column",
                    p: 2,
                    bgcolor: "background.paper",
                    overflowY: "auto",
                }}
                onScroll={handleScroll}
            >
                {loading && (
                    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                        <CircularProgress />
                    </Box>
                )}
                {!loading && messages.length === 0 && (
                    <Typography align="center" color="textSecondary">
                        No messages yet. Start the conversation!
                    </Typography>
                )}
                {[...messages]
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((message: Message) => (
                        <Grow in key={message._id} timeout={500}>
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

                <ChoicesComponent
                    onModeChange={handleModeAndInputChange} // Pass the callback to the child
                />

            </Box>

            <Paper
                elevation={2}
                sx={{
                    p: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    borderTop: "1px solid",
                    borderColor: "divider",
                }}
            >

                {selectedMode == "MANUAL" &&

                    <Box sx={{ display: "flex", alignItems: "center", width: "100%" }}>
                        <TextField
                            variant="outlined"
                            fullWidth // Ensures the TextField takes the full width
                            size="medium"
                            placeholder="Type a message..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                // Check for Enter key press
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    // Prevent the default behavior (which would be to submit the form)
                                    e.preventDefault();
                                    handleSendMessage();  // Send the message
                                } else if (e.key === 'Enter' && e.shiftKey) {
                                    // Allow newline if Shift + Enter is pressed
                                    return;
                                }
                            }}
                            disabled={loading}
                            multiline // Allows for multiple lines of input
                            minRows={1} // Minimum number of rows
                            maxRows={50} // Maximum number of rows (you can adjust this)
                            sx={{ mr: 1 }} // Optional: adds a margin between TextField and IconButton
                        />
                        <IconButton
                            color="primary"
                            onClick={handleSendMessage}
                            disabled={loading || inputValue.trim() === "" || selectedMode !== "MANUAL"}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>


                }

            </Paper>
        </Box>
    );
}
