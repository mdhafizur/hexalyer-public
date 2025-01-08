import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useConversations } from "@app/conversations/hooks/useConversations";
import {
  Box,
  CircularProgress,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useMediaQuery,
  Theme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ChatComponent from "@components/Conversation/ChatComponent";

export default function ConversationListingPage() {
  const { conversations, loading, error } = useConversations();
  const navigate = useNavigate();
  const location = useLocation();

  const isSmallScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down("md"));
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false); // State for the modal
  const [conversationType, setConversationType] = useState<"auto" | "manual" | "webhex" | null>(null);

  const conversationTypes = [
    { label: "Manual Chat", value: "manual", description: "A chat to provide customer support or handle queries." },
    { label: "Webhex Chat", value: "webhex", description: "A conversation involving multiple participants in a group." },
    { label: "Auto Chat", value: "auto", description: "A one-on-one chat between two individuals." },
  ];

  // Extract the conversation ID or "new" from the URL
  useEffect(() => {
    const pathParts = location.pathname.split("/");
    const conversationId = pathParts[pathParts.length - 1];
    setSelectedConversation(conversationId === "new" ? "new" : conversationId || null);
  }, [location.pathname]);

  const handleCreateConversation = () => {
    setModalOpen(true); // Open the modal
  };

  const handleSelectConversationType = (conversationType: string) => {
    setSelectedConversation("new");
    navigate(`/conversations/new?type=${conversationType}`); // Update URL with conversation type
    setConversationType(conversationType)
    setModalOpen(false); // Close the modal
  };

  const handleSelectConversation = (conversationId: string, conversationType: string) => {
    console.log("conversationId", conversationId)
    console.log("conversationType", conversationType)
    setSelectedConversation(conversationId);
    setConversationType(conversationType);
    navigate(`/conversations/${conversationId}`);
  };

  return (
    <Box
      component="main"
      sx={{
        display: "flex",
        flexDirection: isSmallScreen ? "column" : "row",
        height: "100vh",
        bgcolor: "background.default",
      }}
    >
      {/* Conversations Sidebar */}
      <Paper
        elevation={2}
        sx={{
          flexShrink: 0,
          width: isSmallScreen ? "100%" : 300,
          maxHeight: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        {/* Sidebar Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            p: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <Typography variant="h6" sx={{ m: 2 }}>
            Conversations
          </Typography>
          <Tooltip title="Create Conversation">
            <IconButton color="primary" onClick={handleCreateConversation}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Conversation List */}
        <Box
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            p: 2,
            "&::-webkit-scrollbar": {
              width: "8px",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "rgba(0, 0, 0, 0.2)",
              borderRadius: "4px",
            },
          }}
        >
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <Typography color="error" sx={{ m: 2 }}>
              Failed to load conversations
            </Typography>
          )}
          {!loading && !error && conversations.length === 0 && (
            <Typography sx={{ mt: 2 }}>No conversations available</Typography>
          )}
          {!loading && !error && conversations.length > 0 && (
            <List>
              {[...conversations]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((conversation) => (
                  <ListItemButton
                    key={conversation._id}
                    onClick={() => handleSelectConversation(conversation._id, conversation.type)}
                    selected={selectedConversation === conversation._id}
                    sx={(theme) => ({
                      "&.Mui-selected": {
                        backgroundColor: theme.palette.action.selected,
                        color: theme.palette.primary.main,
                        fontWeight: "bold",
                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                      },
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    })}
                  >
                    <ListItemText
                      primary={conversation.title || `Chat ${conversation._id}`}
                      primaryTypographyProps={{
                        variant: "body1",
                        noWrap: true,
                      }}
                    />
                  </ListItemButton>
                ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* Chat Component */}
      <Box
        component="section"
        sx={{
          flexGrow: 1,
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
          p: isSmallScreen ? 1 : 3,
          overflowY: "auto",
        }}
      >
        {selectedConversation && conversationType ? (
          <ChatComponent conversationId={selectedConversation} conversationType={conversationType} />
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexGrow: 1,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Select a conversation or create a new one to start chatting.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Modal for Selecting Conversation Type */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)}>
        <DialogTitle>Select Conversation Type</DialogTitle>
        <DialogContent>
          {conversationTypes.map((type) => (
            <Tooltip key={type.value} title={type.description} arrow>
              <Button
                variant="outlined"
                fullWidth
                sx={{ mb: 1 }}
                onClick={() => handleSelectConversationType(type.value)}
              >
                {type.label}
              </Button>
            </Tooltip>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} color="primary">
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
