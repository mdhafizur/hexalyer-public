import { useState } from "react";
import {
    Box,
    Button,
    TextField,
    IconButton,
    Paper,
    Avatar,
    Typography,
    CircularProgress,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import { motion } from "framer-motion";

interface ChoicesComponentProps {
    onModeChange: (mode: string, inputValue: string) => void;
}

export function ChoicesComponent({ onModeChange }: ChoicesComponentProps): JSX.Element {
    const [activeMode, setActiveMode] = useState<string>("");
    const [webHexInput, setWebHexInput] = useState<string>("");
    const [isValid, setIsValid] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Regular expressions for validation
    const isValidIP = (input: string): boolean => {
        const ipRegex =
            /^(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[0-1]?[0-9][0-9]?)$/;
        return ipRegex.test(input);
    };

    const isValidURL = (input: string): boolean => {
        const urlRegex =
            /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/;
        return urlRegex.test(input);
    };

    const validateReachability = async (input: string): Promise<void> => {
        try {
            setIsLoading(true);
            let formattedInput = input;
            if (!/^https?:\/\//i.test(input)) {
                formattedInput = `http://${input}`;
            }

            const response = await fetch(formattedInput, {
                method: "HEAD",
                mode: "no-cors", // Bypass CORS restrictions
            });

            // Check the status indirectly (response is opaque due to "no-cors")
            setIsValid(response.ok || response.type === "opaque");
        } catch (error) {
            console.error("Reachability check error:", error);
            setIsValid(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModeChange = (mode: string): void => {
        setActiveMode(mode);
        if (mode !== "webhex") {
            setWebHexInput("");
        }
        onModeChange(mode, webHexInput); // Notify parent of mode change
    };

    const handleInputChange = async (value: string): Promise<void> => {
        setWebHexInput(value);
        if (isValidIP(value) || isValidURL(value)) {
            await validateReachability(value);
        } else {
            setIsValid(false);
        }
    };

    const handleSend = (): void => {
        if (!webHexInput.trim()) return;

        console.log("Sending WebHex Input to Parent:", webHexInput);
        onModeChange("webhex", webHexInput); // Pass mode and input value to parent
        setWebHexInput(""); // Clear the input field after notifying parent
    };

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                p: 2,
                gap: 3,
                height: "150",
            }}
        >
            <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
                Hi, how can I help you today?
            </Typography>

            <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                <Avatar sx={{ bgcolor: "secondary.main", width: 60, height: 60 }}>
                    <SmartToyIcon fontSize="large" />
                </Avatar>
            </motion.div>

            <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                    variant={activeMode === "manual" ? "contained" : "outlined"}
                    onClick={() => handleModeChange("manual")}
                >
                    Manual
                </Button>
                <Button
                    variant={activeMode === "auto" ? "contained" : "outlined"}
                    onClick={() => handleModeChange("auto")}
                >
                    Auto
                </Button>
                <Button
                    variant={activeMode === "webhex" ? "contained" : "outlined"}
                    onClick={() => handleModeChange("webhex")}
                >
                    Web Hex
                </Button>
            </Box>

            {activeMode === "webhex" && (
                <Paper
                    elevation={3}
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 1,
                        gap: 1,
                        mt: 2,
                        width: "100%",
                        maxWidth: 400,
                        margin: "0 auto",
                    }}
                >
                    <TextField
                        fullWidth
                        placeholder="Enter Website IP or Domain"
                        value={webHexInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        sx={{
                            paddingLeft: 6,
                            flexGrow: 1,
                        }}
                    />
                    {isLoading ? (
                        <CircularProgress size={24} />
                    ) : (
                        <IconButton
                            color="primary"
                            disabled={!isValid}
                            onClick={handleSend}
                        >
                            <SendIcon />
                        </IconButton>
                    )}
                </Paper>
            )}

            <Typography variant="caption" sx={{ mt: 2, color: "text.secondary" }}>
                Current Mode: {activeMode || "None"}
            </Typography>
        </Box>
    );
}
