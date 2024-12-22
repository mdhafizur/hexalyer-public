import { Message } from "@app/messages/types/message.types";
import { Paper, Typography, Avatar, Box, Link } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { formatDistanceToNow } from "date-fns";
import ReactMarkdown from "react-markdown";

// Function to check if a message content is markdown
const isMarkdown = (content: string) => {
    // Simple heuristic for detecting markdown based on the presence of common markdown syntax
    const markdownPattern = /[*_`~#\-\+\[\]]/;
    return markdownPattern.test(content);
};

export function AiMessage({ message }: { message: Message }) {
    const { details } = message;
    const reportId = details?.report_id;

    // Create the report URL if report_id exists
    const reportUrl = reportId ? `/reports/${reportId}` : null;

    const renderContent = isMarkdown(message.content) ? (
        <ReactMarkdown>{message.content}</ReactMarkdown>
    ) : (
        <Typography variant="body2">{message.content}</Typography>
    );

    return (
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
    );
}
