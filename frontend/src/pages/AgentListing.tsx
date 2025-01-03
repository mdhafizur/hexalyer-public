import { Box, Stack, Typography, Button } from "@mui/material";
import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import { useAgents } from "@app/agents/hooks"; // Hook to fetch agents

const AgentListing: React.FC = () => {
  const { agents, loading, error } = useAgents();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Handle button click to select an agent
  const handleButtonClick = (agentId: string) => {
    console.log(`Agent selected: ${agentId}`);
    setSelectedAgentId(agentId);
    // You can add dispatch logic or additional functionality here
  };

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        height: "100vh",
        display: "flex",
        bgcolor: "background.default",
      }}
    >
      {/* Sidebar */}
      <Box
        sx={{
          bgcolor: "#131D3B",
          width: "300px",
          height: "100vh",
          padding: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Typography variant="h6" sx={{ color: "white", marginBottom: 5 }}>
          Available Agents
        </Typography>

        {/* Loading State */}
        {loading && <Typography sx={{ color: "white" }}>Loading...</Typography>}

        {/* Error State */}
        {error && <Typography sx={{ color: "red" }}>Error: {error}</Typography>}

        {/* Agent List */}
        {!loading && !error && agents.length === 0 && (
          <Typography sx={{ color: "white" }}>No agents available</Typography>
        )}

        <Stack spacing={2}>
          {agents.map((agent) => (
            <NavLink
              key={agent._id}
              to={`/agents/${agent._id}`}
              style={{ textDecoration: "none" }}
              activeStyle={{ color: "white" }} // Add this line
            >
              {({ isActive }: { isActive: boolean }) => (
                <Button
                  sx={{
                    width: "250px",
                    height: "30px",
                    borderRadius: "8px",
                    justifyContent: "center",
                    backgroundColor: isActive ? "white" : "#1e293b",
                    color: isActive ? "black" : "white",
                    "&:hover": {
                      backgroundColor: "#3b82f6",
                    },
                  }}
                  onClick={() => handleButtonClick(agent._id)}
                >
                  Agent: {agent.client_info.hostname}
                </Button>
              )}
            </NavLink>
          ))}
        </Stack>
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          padding: { xs: 2, sm: 3 },
          overflowY: "auto",
        }}
      >
        <Outlet context={{ selectedAgentId }} />
      </Box>
    </Box>
  );
};

export default AgentListing;