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
    Stack,
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
import { useNavigate, useParams } from 'react-router-dom';
import DownloadAgentModal from './DownloadAgentModal';
import { getUserIdFromLocalStorage } from 'utils/cookieValidation';
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";

interface ChatComponentProps {
    onConversationCreated?: (conversationId: string) => void;
}

export default function ChatComponent({ onConversationCreated }: ChatComponentProps) {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { conversationId, conversationType } = useParams();

    const { loading: conversationLoading } = useAppSelector((state: RootState) => state.conversations);
    const { agents } = useAppSelector((state: RootState) => state.agents);
    const { generateConversationReport, generateReportLoading, generateReportError } = useConversations();



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

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [isListening, setIsListening] = useState(false); // Manage microphone listening state
    const recognitionRef = useRef<SpeechRecognition | null>(null); // Reference for speech recognition

    // Initialize Speech Recognition
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.lang = "en-US";
            recognition.continuous = false;
            recognition.interimResults = true;

            recognition.onresult = (event: SpeechRecognitionEvent) => {
                const transcript = Array.from(event.results)
                    .map((result) => result[0].transcript)
                    .join("");
                setInputValue(transcript); // Update input value with speech transcript
            };

            recognition.onend = () => {
                setIsListening(false); // Stop listening when recognition ends
            };

            recognitionRef.current = recognition;
        }
    }, []);


    // Start or Stop Speech Recognition
    const toggleListening = () => {
        if (!recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
        } else {
            recognitionRef.current.start();
        }
        setIsListening(!isListening);
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

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
            console.log("handleAgentConnection", data)
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
            // console.log("aiMessage", aiMessage)
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
            setIsWebhexComplete(false)
        }

        setValidationError(null);
        setInputValue("");
        setWebHexInput("")


        // webhex
        if (conversationType === "webhex" && messages.length >= 2) {
            setIsWebhexComplete(true)
        }

        console.log("conversationType", conversationType)
        console.log("isWebhexComplete", isWebhexComplete)


        // Check if conversationAgent exists in agents by matching agent.client_info.hostname
        console.log("agents", agents)
        const matchingAgent = agents.find(agent => agent.conversation_id === conversationId);
        console.log("matchingAgent", matchingAgent)
        if (matchingAgent && matchingAgent?.status == "online") {
            console.log("ConversationAgent exists in agents.");
            setAgentId(matchingAgent._id)
            setConnectedAgent(matchingAgent.client_info.hostname)
        } else {
            console.log("ConversationAgent does not exist in agents.");
            setAgentId(null)
            setConnectedAgent(null)
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



    const createConversation = async (conversationTitle: string) => {
        if (conversationId && conversationType) {
            const userId = getUserIdFromLocalStorage();
            const resultAction = await dispatch(
                createConversationThunk({ id: ObjectId().toHexString(), title: conversationTitle, created_by: userId, type: conversationType })
            );
            if (createConversationThunk.fulfilled.match(resultAction)) {
                const newConversation = resultAction.payload;
                onConversationCreated?.(newConversation._id);
                navigate(`/conversations/${newConversation._id}/${newConversation.type}`);
            }
        }
    }

    const generateConversationTitle = (
        type: string | undefined,
        agentName: string | null,
        userInput: string | null = null
    ): string => {
        if (userInput?.trim()) return userInput; // Use user input if provided

        const timestamp = new Date().toISOString().slice(0, 19).replace("T", " ");
        const baseTitle = `${type || "conversation"}-${timestamp}`;

        if (type === "auto" && agentName) {
            return `${baseTitle} (Agent: ${agentName})`;
        }

        return baseTitle;
    };
    useEffect(() => {
        // Split the URL into parts
        console.log("select convType", conversationType)
        console.log("select convId", conversationId)
        if (conversationId == "new") {
            const title = generateConversationTitle(conversationType, connectedAgent);
            createConversation(title)
        }
    }, [conversationType, conversationId]);

    const handleSendMessage = async (customInputValue = inputValue) => {
        if (!customInputValue.trim()) return;
        const convId: string = conversationId || "";
        if (!convId) {
            return
        }

        try {
            const message: Message = {
                _id: ObjectId().toHexString(),
                conversation_id: convId,
                role: "user",
                content: conversationType === "webhex" && isWebhexComplete === false ? `WebHex request: ${webHexInput}` : customInputValue,
                type: conversationType || "manual",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                ...(conversationType === "webhex" && { details: { url: webHexInput } }),
            };

            let tempMessage: any = message;
            if (isWebhexComplete) {
                tempMessage['isWebhexComplete'] = true
            }

            // console.log("isWebhexComplete", isWebhexComplete)
            // console.log("tempMessage", tempMessage)
            // return
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
                <>
                    <Paper
                        elevation={3}
                        sx={{
                            p: 2,
                            mt: 2,
                            textAlign: "center",
                            width: "100%",
                            maxWidth: 600,
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
                        <Stack direction="column" spacing={2} alignItems="center">
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={async () => {
                                    try {
                                        let targetConversationId = conversationId;
                                        const userId = getUserIdFromLocalStorage();

                                        if (conversationId === "new" && conversationType) {
                                            const resultAction = await dispatch(
                                                createConversationThunk({
                                                    id: ObjectId().toHexString(),
                                                    title: "Agent Conversation",
                                                    created_by: userId,
                                                    type: "auto", // Assuming "auto" for agent-related conversations
                                                })
                                            );

                                            if (createConversationThunk.fulfilled.match(resultAction)) {
                                                const newConversation = resultAction.payload;
                                                onConversationCreated?.(newConversation._id);
                                                navigate(`/conversations/${newConversation._id}/${newConversation.type}`);
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
                                Download Agent App
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleOpenModal}
                            >
                                Download Agent Binary
                            </Button>
                        </Stack>

                    </Paper>
                    <DownloadAgentModal open={isModalOpen} handleClose={handleCloseModal} conversationId={conversationId}></DownloadAgentModal>
                </>
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
                        <IconButton color="primary" onClick={toggleListening}>
                            {isListening ? <MicOffIcon /> : <MicIcon />}
                        </IconButton>
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
