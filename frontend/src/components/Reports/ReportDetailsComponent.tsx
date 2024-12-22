import { Box, Typography, CircularProgress } from "@mui/material";
import { useEffect, useState } from "react";

type ReportDetailsComponentProps = {
    reportId: string | null; // ID of the selected report
};

const ReportDetailsComponent: React.FC<ReportDetailsComponentProps> = ({ reportId }) => {
    const [loading, setLoading] = useState(true);
    const [report, setReport] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!reportId) return;

        setLoading(true);
        setError(null);

        // Simulate an API call to fetch report details
        setTimeout(() => {
            if (reportId === "new") {
                setReport(null);
                setLoading(false);
            } else {
                setReport({
                    _id: reportId,
                    type: "Sample Type",
                    user_id: "676327ef659f05603dd71caf",
                    conversation_id: "67667d95fabae8d63065e788",
                    message_id: "676714d997ed07aa9af95abb",
                    details: {
                        scan_id: "0",
                        url: "https://jinx-team.vercel.app/",
                        report: {},
                    },
                    created_at: "2024-12-21T19:19:57.788091+00:00",
                    updated_at: "2024-12-21T19:19:57.788114+00:00",
                });
                setLoading(false);
            }
        }, 1000);
    }, [reportId]);

    if (loading) {
        return (
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flexGrow: 1,
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="error" sx={{ mt: 2 }}>
                {error}
            </Typography>
        );
    }


    if (!report) {
        return (
            <Typography variant="body1" sx={{ mt: 2 }}>
                No details available for this report.
            </Typography>
        );
    }

    return (
        <Box
            sx={{
                p: 2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
            }}
        >
            <Typography variant="h6">Report Details</Typography>
            <Typography>
                <strong>Report ID:</strong> {report._id}
            </Typography>
            <Typography>
                <strong>Type:</strong> {report.type}
            </Typography>
            <Typography>
                <strong>User ID:</strong> {report.user_id}
            </Typography>
            <Typography>
                <strong>Conversation ID:</strong> {report.conversation_id}
            </Typography>
            <Typography>
                <strong>Message ID:</strong> {report.message_id}
            </Typography>
            <Typography>
                <strong>Details:</strong> {report.details?.url || "No details available"}
            </Typography>
            <Typography>
                <strong>Created At:</strong> {new Date(report.created_at).toLocaleString()}
            </Typography>
            <Typography>
                <strong>Updated At:</strong> {new Date(report.updated_at).toLocaleString()}
            </Typography>
        </Box>
    );
};

export default ReportDetailsComponent;
