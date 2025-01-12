import { useCallback, useState } from "react";
import { Message } from "@app/messages/types/message.types";
import { Paper, Typography, Avatar, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { commandClient } from "@app/axios.client";
import ReportProgressModal from './ReportProgressModal';

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

export function AiMessage({ message, agentId }: { message: Message; agentId?: string }) {
    const { report, task } = message;
    const reportId = report?._id;
    console.log("reportId", reportId)

    const [progressOpen, setProgressOpen] = useState(false);

    const handleProgressClose = useCallback(() => setProgressOpen(false), []);

    const requiredKeys = ["description", "type", "scenario"];
    const jsonContent = extractJson(message.content);
    const isValidJson = jsonContent ? isJsonWithKeys(jsonContent, requiredKeys) : false;
    const jsonData = isValidJson ? JSON.parse(jsonContent!) : null;
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);

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

    const renderContent = <ReactMarkdown>{message.content}</ReactMarkdown>;

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
                        bgcolor: "grey.200",
                        color: "primary.contrastText",
                    }}
                >
                    {renderContent}
                    {isValidJson && (
                        <Box sx={{ mt: 1 }}>
                            <Typography variant="subtitle2" color="primary">
                                Valid JSON Detected:
                            </Typography>
                            <Typography variant="body2">
                                Description: {jsonData.description}
                            </Typography>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleApiCall}
                                sx={{ mt: 1 }}
                            >
                                Execute Scenario
                            </Button>
                        </Box>
                    )}
                    {task && (
                        <Box sx={{ mt: 1 }}>
                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 1,
                                    display: "block",
                                    color: "primary"
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
                <>
                    <ReportProgressModal
                        open={progressOpen}
                        onClose={handleProgressClose}
                        reportId={reportId}
                    />
                </>
            )}
        </>
    );
}
