import { useState, useEffect, useCallback, useRef } from "react";
import {
    Box,
    Paper,
    Typography,
    TextField,
    IconButton,
    ListItem,
    CircularProgress,
    Grow,
    Button,
    Fab,
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
import ReportIcon from "@mui/icons-material/Assessment"; // Import an appropriate icon
import { useConversations } from '@app/conversations/hooks/useConversations';
import { Alert, Snackbar } from "@mui/material"; // Import these components
import { useNavigate } from 'react-router-dom';

interface ChatComponentProps {
    onConversationCreated?: (conversationId: string) => void;
}

export default function ChatComponent({ onConversationCreated }: ChatComponentProps) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const { loading: conversationLoading } = useAppSelector((state: RootState) => state.conversations);
    const { generateConversationReport, generateReportLoading, generateReportError } = useConversations();

    // State Initialization
    const [conversationId, setConversationId] = useState<string | "new">("new");
    const [conversationType, setConversationType] = useState<"manual" | "webhex" | "auto">("manual");


    // Inside the component
    const [successAlert, setSuccessAlert] = useState(false);
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
    const [isWebhexComplete, setIsWebhexComplete] = useState(false);

    const handleGenerateReport = async () => {
        if (generateReportLoading) return; // Prevent duplicate triggers
        try {
            console.log("Generate report triggered!");
            await generateConversationReport(conversationId);
            setSuccessAlert(true); // Show success alert
        } catch (err) {
            console.error("Error generating report:", generateReportError);
        }
    };


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

                if (conversationType === "webhex" && messages.length >= 2) {
                    setIsWebhexComplete(true)
                }
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

    }, [conversationId, addMessage, agentId, conversationType]);

    // Join Room on Conversation ID Change
    useEffect(() => {

        if (conversationId !== "new" || conversationId == "new") {
            socket.emit("join_room", { conversation_id: conversationId });
            setMessages([]);
        }

        setValidationError(null);
        setInputValue("");
        setWebHexInput("")


        // webhex
        if (conversationType === "webhex") {
            setIsWebhexComplete(true)
        }
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

    useEffect(() => {
        // Split the URL into parts
        const pathParts = location.pathname.split("/");

        // Assuming the structure is `/chat/:conversationId/:conversationType`
        const convId = pathParts[2]; // 12345
        const convType = pathParts[3]; // manual

        console.log("select conversationId", convId)
        setConversationId(convId)
        setConversationType(convType)

    }, [location.pathname]);

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
                content: conversationType === "webhex" && isWebhexComplete === false ? `WebHex request: ${customInputValue}` : customInputValue,
                type: conversationType || "manual",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...(conversationType === "webhex" && { details: { url: webHexInput } }),
            };

            let tempMessage: any = {};
            if (isWebhexComplete) {
                tempMessage = message;
                tempMessage['isWebhexComplete'] = true
            }

            socket.emit("on_stream_message_to_ai", tempMessage);
            addMessage(message);
            setInputValue("");
        } catch (error) {
            console.error("Failed to send message:", error);
        }
    };

    // Render
    return (
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {conversationType != "webhex" && (
                <>
                    <Fab
                        color="primary"
                        aria-label="generate-report"
                        onClick={handleGenerateReport}
                        disabled={generateReportLoading} // Disable button while generateReportLoading
                        sx={{ position: "absolute", top: 16, right: 16, zIndex: 1000 }}
                    >
                        {generateReportLoading ? <CircularProgress sx={{ color: "white" }} size={24} /> : <ReportIcon />}
                    </Fab>
                    <Snackbar
                        open={successAlert}
                        autoHideDuration={3000} // Automatically close after 3 seconds
                        onClose={() => setSuccessAlert(false)}
                        anchorOrigin={{ vertical: "top", horizontal: "right" }} // Adjust position if needed
                    >
                        <Alert onClose={() => setSuccessAlert(false)} severity="success" sx={{ width: "100%" }}>
                            Report has been generated successfully! You can access it in {conversationType} report section
                        </Alert>
                    </Snackbar>
                </>
            )}

            <Box ref={chatContainerRef} sx={{ flexGrow: 1, overflowY: "auto" }}>
                {conversationLoading ? (
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
                            placeholder={conversationType === "webhex" && isWebhexComplete === false ? "Enter Website IP or Domain. e.g. www.google.com" : "Type a message..."}
                            value={conversationType === "webhex" && isWebhexComplete === false ? webHexInput : inputValue}
                            onChange={(e) =>
                                conversationType === "webhex" && isWebhexComplete == false
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
                                conversationLoading ||
                                (conversationType === "webhex" && isWebhexComplete == false
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
