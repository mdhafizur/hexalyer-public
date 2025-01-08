import { useState } from "react";
import { Message } from "@app/messages/types/message.types";
import { Paper, Typography, Avatar, Box, Link, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";
import { commandClient } from "@app/axios.client";

const extractJson = (content: string): string | null => {
    try {
        // Check if content is a valid JSON string
        const parsed = JSON.parse(content);
        return JSON.stringify(parsed, null, 2); // Return the pretty-printed JSON string
    } catch {
        // If not a JSON string, fallback to regex
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/);
        return jsonMatch ? jsonMatch[1] : null; // Extract the JSON block
    }
};

// Function to check if JSON has required keys
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
    const reportId = report?.report_id;

    // Create the report URL if report_id exists
    const reportUrl = reportId ? `/reports/${reportId}` : null;

    // Required keys for JSON validation
    const requiredKeys = ["description", "type", "scenario"];


    // Extract JSON from message content
    const jsonContent = extractJson(message.content);

    // Check if the extracted JSON is valid
    const isValidJson = jsonContent ? isJsonWithKeys(jsonContent, requiredKeys) : false;

    // Parse JSON if valid
    const jsonData = isValidJson ? JSON.parse(jsonContent!) : null;

    // Modal state for task details
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);

    // Handle API call
    const handleApiCall = async () => {
        if (jsonData) {
            try {
                console.log("jsonData", jsonData)
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
                {/* Avatar for AI Icon */}
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
                        p: 1.5,
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
                    {reportUrl && (
                        <Typography
                            variant="body2"
                            sx={{
                                mt: 1,
                                display: "block",
                                color: "primary.main",
                            }}
                        >
                            <Link href={reportUrl} target="_blank" rel="noopener noreferrer">
                                View Report
                            </Link>
                        </Typography>
                    )}
                    <Typography
                        variant="caption"
                        sx={{ mt: 0.5, display: "block", textAlign: "right" }}
                    >
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </Typography>
                </Paper>
            </Box>

            {/* Task Details Modal */}
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
                                <strong>Priority:</strong> {task.metadata.priority}{"\n"}
                                <strong>Execution Time:</strong> {task.metadata.execution_time}{"\n"}
                                <strong>Created At:</strong> {task.metadata.created_at}{"\n"}
                                <strong>Completed At:</strong> {task.metadata.completed_at}
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
        </>
    );
}
