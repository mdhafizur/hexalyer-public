import { useCallback, useState } from "react";
import { Message } from "@app/messages/types/message.types";
import { Paper, Typography, Avatar, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Collapse, IconButton, Tooltip } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { materialDark, materialLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { commandClient } from "@app/axios.client";
import ReportProgressModal from "./ReportProgressModal";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

const extractJson = (content: string): string | null => {
    try {
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2);
    } catch {
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        return jsonMatch ? jsonMatch[1] : null;
    }
};

const isJsonWithKeys = (content: string, requiredKeys: string[]): boolean => {
    try {
        const parsed = JSON.parse(content);
        return requiredKeys.every((key) => key in parsed);
    } catch {
        return false;
    }
};

export function AiMessage({ message, agentId }: { message: Message; agentId: string | null }) {
    const { report, task } = message;
    const reportId = report?._id;

    const [progressOpen, setProgressOpen] = useState(false);
    const handleProgressClose = useCallback(() => setProgressOpen(false), []);

    const requiredKeys = ["description", "type", "scenario"];
    const jsonContent = extractJson(message.content);
    const isValidJson = jsonContent ? isJsonWithKeys(jsonContent, requiredKeys) : false;
    const jsonData = isValidJson ? JSON.parse(jsonContent!) : null;
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);
    const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);
    const [copied, setCopied] = useState<{ [key: string]: boolean }>({});

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied({ ...copied, [id]: true });
        setTimeout(() => setCopied({ ...copied, [id]: false }), 2000);
    };


    const handleApiCall = async () => {
        if (jsonData) {
            try {
                const response = await commandClient.post(`/agents/${agentId}/commands`, jsonData.scenario);
                const result = await response.data;
                console.log("API Response:", result);
            } catch (error) {
                console.error("API Call Error:", error);
            }
        }
    };

    const renderContent = useCallback(() => (
        <ReactMarkdown
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeId = String(children).slice(0, 10); // Unique ID for tracking copy status

                    return !inline && match ? (
                        <Box sx={{ position: "relative" }}>
                            <Tooltip title={copied[codeId] ? "Copied!" : "Copy"} arrow>
                                <IconButton
                                    onClick={() => handleCopy(String(children).replace(/\n$/, ""), codeId)}
                                    sx={{
                                        position: "absolute",
                                        top: 8,
                                        right: 8,
                                        zIndex: 1,
                                        backgroundColor: "rgba(255,255,255,0.2)",
                                        "&:hover": { backgroundColor: "rgba(255,255,255,0.3)" }
                                    }}
                                >
                                    {copied[codeId] ? <CheckIcon color="success" /> : <ContentCopyIcon />}
                                </IconButton>
                            </Tooltip>
                            <SyntaxHighlighter
                                style={materialDark}
                                language={match[1]}
                                PreTag="div"
                                {...props}
                            >
                                {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                        </Box>
                    ) : (
                        <code className={className} {...props}>
                            {children}
                        </code>
                    );
                },
                ul({ children }) {
                    return <ul style={{ paddingLeft: "1.5rem", marginTop: 0 }}>{children}</ul>;
                },
                ol({ children }) {
                    return <ol style={{ paddingLeft: "1.5rem", marginTop: 0 }}>{children}</ol>;
                },
                li({ children }) {
                    return <li style={{ marginBottom: "0.3rem" }}>{children}</li>;
                },
                p({ children }) {
                    return <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", mb: 1 }}>{children}</Typography>;
                }
            }}
        >
            {message.content}
        </ReactMarkdown>
    ), [message.content, copied]);


    return (
        <>
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-start",
                    mb: 1,
                }}
            >
                <Avatar
                    sx={{
                        mr: 2,
                        bgcolor: "secondary.main",
                    }}
                >
                    <SmartToyIcon />
                </Avatar>

                <Paper
                    elevation={3}
                    sx={{
                        p: 3,
                        maxWidth: "70%",
                        width: "fit-content", // ✅ Prevents expanding beyond necessary width
                        bgcolor: "grey.200",
                        color: "primary.contrastText",
                        wordBreak: "break-word", // ✅ Breaks long words
                        overflowWrap: "break-word",
                    }}
                >
                    {renderContent()}
                    {isValidJson && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                                Valid JSON Detected:
                            </Typography>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 1 }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleApiCall}
                                    sx={{ mr: 2 }}
                                >
                                    Execute Scenario
                                </Button>
                                <IconButton
                                    onClick={() => setJsonPreviewOpen(!jsonPreviewOpen)}
                                    aria-label={jsonPreviewOpen ? "Collapse JSON preview" : "Expand JSON preview"}
                                >
                                    {jsonPreviewOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                </IconButton>
                            </Box>
                            <Collapse in={jsonPreviewOpen}>
                                <Box
                                    sx={{
                                        mt: 1,
                                        p: 1,
                                        border: "1px solid",
                                        borderColor: "grey.400",
                                        borderRadius: 1,
                                        bgcolor: "grey.100",
                                    }}
                                >
                                    <SyntaxHighlighter language="json" style={materialLight}>
                                        {jsonContent}
                                    </SyntaxHighlighter>
                                </Box>
                            </Collapse>
                        </Box>
                    )}

                    {task && (
                        <Box sx={{ mt: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 1,
                                    display: "block",
                                    color: "primary",
                                }}
                            >
                                Status: {task.status}
                            </Typography>
                            <Button
                                variant="outlined"
                                color="secondary"
                                onClick={() => setTaskModalOpen(true)}
                            >
                                View Task Details
                            </Button>
                        </Box>
                    )}
                    {message.type === "webhex" && reportId && (
                        <Button
                            variant="contained"
                            color="secondary"
                            aria-label="View Item"
                            onClick={() => setProgressOpen(true)}
                            sx={{ mt: 1 }}
                        >
                            View Report
                        </Button>
                    )}
                    <Typography
                        variant="caption"
                        sx={{ mt: 0.5, display: "block", textAlign: "right" }}
                    >
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </Typography>
                </Paper>
            </Box>

            <Dialog open={isTaskModalOpen} onClose={() => setTaskModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Task Details</DialogTitle>
                <DialogContent>
                    {task ? (
                        <>
                            <Typography variant="h6" gutterBottom>
                                General Information
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: "pre-line", mb: 2 }}>
                                <strong>Task ID:</strong> {task._id}{"\n"}
                                <strong>Agent ID:</strong> {task.agent_id}{"\n"}
                                <strong>Conversation ID:</strong> {task.conversation_id}{"\n"}
                                <strong>Status:</strong> {task.status}{"\n"}
                                <strong>Priority:</strong> {task.priority}{"\n"}
                                <strong>Execution Time:</strong> {task.execution_time}{"\n"}
                                <strong>Created At:</strong> {task.created_at}{"\n"}
                                <strong>Completed At:</strong> {task.completed_at}
                            </Typography>

                            <Typography variant="h6" gutterBottom>
                                Outputs
                            </Typography>
                            {task.outputs.map((output, index) => (
                                <Box key={index} sx={{ mb: 2 }}>
                                    <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                                        <strong>Type:</strong> {output.type}{"\n"}
                                        <strong>Command:</strong> {output.command}{"\n"}
                                        <strong>Output:</strong> {output.output || "No output"}{"\n"}
                                        <strong>Status:</strong> {output.status}
                                    </Typography>
                                </Box>
                            ))}
                        </>
                    ) : (
                        <Typography variant="body2" color="error">
                            No task details available.
                        </Typography>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTaskModalOpen(false)} color="primary">
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
            {message.type === "webhex" && reportId && (
                <ReportProgressModal open={progressOpen} onClose={handleProgressClose} reportId={reportId} />
            )}
        </>
    );
}
