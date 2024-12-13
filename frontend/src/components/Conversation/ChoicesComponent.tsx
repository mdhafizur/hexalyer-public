import { useState } from "react";
import {
    Box,
    Button,
    TextField,
    IconButton,
    Paper,
    Avatar,
    Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { motion } from "framer-motion";

interface ChoicesComponentProps {
    onModeChange: (mode: string, inputValue: string) => void; // Callback prop
}

export function ChoicesComponent({ onModeChange }: ChoicesComponentProps): JSX.Element {
    const [activeMode, setActiveMode] = useState<string>("");
    const [webHexInput, setWebHexInput] = useState<string>("");

    const handleModeChange = (mode: string): void => {
        setActiveMode(mode);
        if (mode !== "WEB_HEX") {
            setWebHexInput("");
        }

        // Emit the mode and webHexInput to parent
        onModeChange(mode, webHexInput);
    };

    const handleSend = (): void => {
        console.log("Web Hex Input Submitted:", webHexInput);
        setWebHexInput("");
        onModeChange(activeMode, webHexInput); // Emit when input is submitted
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center", // Centers content vertically
                p: 2,
                gap: 3,
                height: "100vh", // Full viewport height for centering
            }}
        >
            {/* Greeting Message */}
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
                Hi, how can I help you today?
            </Typography>

            {/* AI Avatar */}
            <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <Avatar sx={{ bgcolor: "secondary.main", width: 60, height: 60 }}>
                    <SmartToyIcon fontSize="large" />
                </Avatar>
            </motion.div>

            {/* Buttons */}
            <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                    variant={activeMode === "MANUAL" ? "contained" : "outlined"}
                    onClick={() => handleModeChange("MANUAL")}
                >
                    Manual
                </Button>
                <Button
                    variant={activeMode === "AUTO" ? "contained" : "outlined"}
                    onClick={() => handleModeChange("AUTO")}
                >
                    Auto
                </Button>
                <Button
                    variant={activeMode === "WEB_HEX" ? "contained" : "outlined"}
                    onClick={() => handleModeChange("WEB_HEX")}
                >
                    Web Hex
                </Button>
            </Box>

            {/* Mode Content */}
            {activeMode === "AUTO" && (
                <Box sx={{ textAlign: "center", mt: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        To download the linux agent, please follow the commands below:
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        1. curl -X GET http://ec2-3-72-61-250.eu-central-1.compute.amazonaws.com:5000/web/api/v1/download-agent/linux/download-agent/linux -o agent
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        2. chmod +x agent
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                        3. ./agent http://ec2-3-72-61-250.eu-central-1.compute.amazonaws.com:5001 http://ec2-3-72-61-250.eu-central-1.compute.amazonaws.com:5003
                    </Typography>
                </Box>
            )}

            {activeMode === "MANUAL" && (
                <Box sx={{ textAlign: "center", mt: 3 }}>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                        Ask your questions, and I'll help you out!
                    </Typography>

                </Box>
            )}

            {/* Web Hex Input */}
            {activeMode === "WEB_HEX" && (
                <Paper
                    elevation={3}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center", // Centers horizontally
                        p: 1,
                        gap: 1,
                        mt: 2,
                        width: "100%",
                        maxWidth: 400,
                        margin: "0 auto", // Centers the Paper container itself
                    }}
                >
                    <TextField
                        fullWidth
                        placeholder="Enter Website IP or Domain"
                        value={webHexInput}
                        onChange={(e) => setWebHexInput(e.target.value)}
                        sx={{
                            paddingLeft: 6,
                            flexGrow: 1, // Ensure the input field grows to fill the available space
                        }}
                    />
                    <IconButton
                        color="primary"
                        disabled={!webHexInput.trim()}
                        onClick={handleSend}
                    >
                        <SendIcon />
                    </IconButton>
                </Paper>
            )}

            {/* Information */}
            <Typography variant="caption" sx={{ mt: 2, color: "text.secondary" }}>
                Current Mode: {activeMode || "None"}
            </Typography>
        </Box>
    );
}
