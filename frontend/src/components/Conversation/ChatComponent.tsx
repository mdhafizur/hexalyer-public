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
    Button,
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
import { useNavigate } from "react-router-dom";
import { privateClient } from '@app/axios.client';

interface ChatComponentProps {
    conversationId: string | "new";
    conversationType?: "manual" | "webhex" | "auto";
    onConversationCreated?: (conversationId: string) => void;
}

export default function ChatComponent({ conversationId, conversationType, onConversationCreated }: ChatComponentProps) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { loading } = useAppSelector((state: RootState) => state.conversations);

    // State Management
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [webHexInput, setWebHexInput] = useState("");
    const [isUrlChecking, setIsUrlChecking] = useState(false);
    const [isWebhexUrlValid, setIsWebhexUrlValid] = useState(false);
    const [validationError, setValidationError] = useState<string | null>(null);
    const [connectedAgent, setConnectedAgent] = useState<string | null>(null);
    const [agentId, setAgentId] = useState<string | null>(null);
    const chatContainerRef = useRef<HTMLDivElement | null>(null);


    // Utility Functions
    const isValidIPorURL = (input: string): boolean => {
        const ipRegex =
            /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
        const urlRegex = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
        return ipRegex.test(input) || urlRegex.test(input);
    };

    const validateReachability = useCallback(async (input: string) => {
        setIsUrlChecking(true);
        setValidationError(null);
        try {
            const formattedInput = /^https?:\//i.test(input) ? input : `http://${input}`;
            const response = await fetch(formattedInput, { method: "HEAD", mode: "no-cors" });
            setIsWebhexUrlValid(response.type === "opaque" || response.ok);
        } catch {
            setIsWebhexUrlValid(false);
            setValidationError("Invalid or unreachable URL");
        } finally {
            setIsUrlChecking(false);
        }
    }, []);

    const addMessage = useCallback((message: Message) => {
        setMessages((prevMessages) => {
            const exists = prevMessages.some((msg) => msg._id === message._id);
            if (exists) {
                return prevMessages.map((msg) =>
                    msg._id === message._id ? { ...msg, ...message } : msg
                );
            }
            return [...prevMessages, message].sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
        });
    }, []);

    // Socket Handlers
    useEffect(() => {
        const handleAgentConnection = (data: any) => {
            if (data.conversation_id && data.conversation_id === conversationId && data.status == "online") {
                setConnectedAgent(data.client_info.hostname || "Unknown Agent");
                setAgentId(data.agent_id)
            }
            if (agentId == data.agent_id) {
                setConnectedAgent(null)
                setAgentId(null)
            }
        };

        const handleMessageHistory = ({ messages }: { messages: Message[] }) => {
            console.log("messages", messages)
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
            // setIsFetching(false);
        };

        // const handleAiMessage = (message: Message) => {
        //     if (message.conversation_id === conversationId) addMessage(message);
        // };


        const handleAiMessageStream = (aiMessage: Message) => {
            if (aiMessage.conversation_id === conversationId) {
                setMessages((prev) => {
                    const index = prev.findIndex((msg) => msg._id === aiMessage._id);

                    if (index !== -1) {
                        const updatedMessages = [...prev];
                        const currentContent = updatedMessages[index].content + aiMessage.content;

                        updatedMessages[index] = {
                            ...updatedMessages[index],
                            content: currentContent,
                        };
                        return updatedMessages;
                    }

                    return [...prev, aiMessage];
                });
            }
        };

        socket.on("handle_agent_to_conversation_connection", handleAgentConnection);
        socket.on("message_history", handleMessageHistory);
        socket.on("ai_message_stream", handleAiMessageStream);
        // socket.on("ai_message", handleAiMessage);

        return () => {
            socket.off("handle_agent_to_conversation_connection", handleAgentConnection);
            socket.off("message_history", handleMessageHistory);
            socket.off("ai_message_stream", handleAiMessageStream);
            // socket.off("ai_message", handleAiMessage);
        };

    }, [conversationId, addMessage, agentId]);

    // Join Room on Conversation ID Change
    useEffect(() => {
        if (conversationId !== "new" || conversationId == "new") {
            socket.emit("join_room", { conversation_id: conversationId });
            setMessages([]);
        }

        setValidationError(null);
        setInputValue("");
        setWebHexInput("")
    }, [conversationId, conversationType]);

    // Scroll to Bottom on New Messages
    useEffect(() => {
        chatContainerRef.current?.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    // Input Handlers
    const handleWebHexInputChange = async (value: string) => {
        setWebHexInput(value);
        if (isValidIPorURL(value)) {
            await validateReachability(value);
        } else {
            setIsWebhexUrlValid(false);
            setValidationError("Invalid input. Please enter a valid IP or URL.");
        }
    };

    const handleSendMessage = async (customInputValue = inputValue) => {
        if (!customInputValue.trim()) return;

        const generatedId = ObjectId().toHexString();
        try {
            if (conversationId === "new" && conversationType) {
                const resultAction = await dispatch(
                    createConversationThunk({ title: customInputValue, user_id: "67667e7811799977286f3d6b", type: conversationType })
                );
                if (createConversationThunk.fulfilled.match(resultAction)) {
                    const newConversation = resultAction.payload;
                    onConversationCreated?.(newConversation._id);
                    navigate(`/conversations/${newConversation._id}`);
                    conversationId = newConversation._id;
                }
            }

            const message: Message = {
                _id: generatedId,
                conversation_id: conversationId,
                role: "user",
                content: conversationType === "webhex" ? `WebHex request: ${customInputValue}` : customInputValue,
                type: conversationType || "manual",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            socket.emit("on_stream_message_to_ai", message);
            addMessage(message);
            setInputValue("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    const handleDownloadAgent = async (conversationId: string) => {
        try {
            // Construct the download URL
            const downloadUrl = `/download/agent_ui_app/${conversationId}`;

            // Fetch the file using Axios
            const response = await privateClient.get(downloadUrl, {
                responseType: "blob", // Ensures the response is treated as a file (binary data)
            });

            // Create a Blob URL and trigger the download
            const blob = new Blob([response.data]);
            const downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(blob);
            downloadLink.download = `agent_${conversationId}.exe`; // Set the filename dynamically
            downloadLink.style.display = "none";

            // Append the link to the document, trigger the download, and remove the link
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);

            // Revoke the Blob URL to free memory
            URL.revokeObjectURL(downloadLink.href);
        } catch (error) {
            console.error("Failed to download agent:", error);
        }
    };

    // Render
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6">
                        {conversationId === "new" ? `New Conversation - ${conversationType}` : `Conversation: ${conversationId} - ${conversationType}`}
                    </Typography>
                </Toolbar>
            </AppBar>
            <Box ref={chatContainerRef} sx={{ flexGrow: 1, overflowY: "auto" }}>
                {loading ? (
                    <CircularProgress />
                ) : (
                    messages.length === 0 && <Typography>No messages yet.</Typography>
                )}
                {messages.map((msg) => (
                    <Grow in key={msg._id} timeout={500}>
                        <ListItem sx={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                            {msg.role === "assistant" ? <AiMessage message={msg} agentId={agentId} /> : <UserMessage message={msg} />}
                        </ListItem>
                    </Grow>
                ))}
            </Box>









            {conversationType === "auto" && !connectedAgent && (
                <Paper
                    elevation={3}
                    sx={{
                        p: 2,
                        mt: 2,
                        textAlign: "center",
                        width: "100%",
                        maxWidth: 400,
                        margin: "0 auto",
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Download the Agent
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        To get started, download and run the agent on your device.
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={async () => {
                            try {
                                let targetConversationId = conversationId;

                                if (conversationId === "new" && conversationType) {
                                    const resultAction = await dispatch(
                                        createConversationThunk({
                                            title: "Agent Conversation",
                                            user_id: "67667e7811799977286f3d6b", // Replace with dynamic user_id if available
                                            type: "auto", // Assuming "auto" for agent-related conversations
                                        })
                                    );

                                    if (createConversationThunk.fulfilled.match(resultAction)) {
                                        const newConversation = resultAction.payload;
                                        onConversationCreated?.(newConversation._id);
                                        navigate(`/conversations/${newConversation._id}`);
                                        targetConversationId = newConversation._id;
                                    } else {
                                        console.error("Failed to create conversation");
                                        return; // Exit if the conversation creation fails
                                    }
                                }

                                // Trigger the download
                                const downloadUrl = `http://localhost:5000/web/api/v1/download/agent_ui_app/${targetConversationId}`;
                                window.open(downloadUrl, "_blank");
                            } catch (error) {
                                console.error("Error creating conversation or initiating download:", error);
                            }
                        }}
                    >
                        Download Agent
                    </Button>
                </Paper>
            )}

            {connectedAgent && conversationType === "auto" && (
                <Paper
                    elevation={3}
                    sx={{
                        p: 2,
                        mt: 2,
                        textAlign: "center",
                        width: "100%",
                        maxWidth: 400,
                        margin: "0 auto",
                        borderRadius: 2,
                    }}
                >
                    <Typography variant="h6" sx={{ mb: 1 }}>
                        Agent Connected
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        The agent <strong>{connectedAgent}</strong> is connected to this conversation.
                    </Typography>
                </Paper>
            )}




            {((conversationType === "auto" && connectedAgent) || conversationType === "manual" || conversationType === "webhex") && (
                <Paper sx={{ display: "flex", flexDirection: "column", p: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center" }}>
                        <TextField
                            fullWidth
                            placeholder={conversationType === "webhex" ? "Enter Website IP or Domain. e.g. www.google.com" : "Type a message..."}
                            value={conversationType === "webhex" ? webHexInput : inputValue}
                            onChange={(e) =>
                                conversationType === "webhex"
                                    ? handleWebHexInputChange(e.target.value)
                                    : setInputValue(e.target.value)
                            }
                            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                            error={!!validationError}
                            helperText={validationError}
                        />
                        <IconButton
                            color="primary"
                            onClick={() => handleSendMessage(webHexInput || inputValue)}
                            disabled={
                                loading ||
                                (conversationType === "webhex"
                                    ? isUrlChecking || !isWebhexUrlValid
                                    : !(inputValue.trim() || webHexInput.trim()))
                            }
                        >
                            {isUrlChecking ? <CircularProgress size={24} /> : <SendIcon />}
                        </IconButton>
                    </Box>
                </Paper>
            )}



        </Box>
    );
}
