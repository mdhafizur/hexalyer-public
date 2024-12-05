import { Box, Stack, Typography, Button } from "@mui/material"; // Corrected Grid import
import availableMachinesData from "../assests/dummy-data/machineData.json";
import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";

const MachinesPage: React.FC = () => {
  // State to track the selected machine
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null);

  // Handle button click to select the machine
  const handleButtonClick = (machineId: string) => {
    setSelectedMachineId(machineId);
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
          padding: 7,
          display: "flex",
          flexDirection: "column",
          alignItems: "center" 
        }}
      >
        <Typography variant="h6" sx={{ color: "white", marginBottom: 10}}>
          Available Machines
        </Typography>
        <Stack spacing={2}>
          {availableMachinesData.map((machine) => (
            <NavLink
              key={machine.id}
              to={`/machines/${machine.id}`}
              style={{ textDecoration: "none" }}
            >
              <Button
                sx={{
                  width: "100%",
                  borderRadius: "5px",
                  justifyContent: "center",
                  backgroundColor:
                    selectedMachineId === machine.id ? "white" : "#131D3B", // Green for selected, default color for others
                  color: selectedMachineId === machine.id ? "black" : "white",
                  "&:hover": {
                    backgroundColor: selectedMachineId === machine.id ? "backgroung.hover" : "white",
                    color: selectedMachineId === machine.id ? "white" : "#131D3B",
                  },
                }}
                onClick={() => handleButtonClick(machine.id)} // Set the clicked machine as selected
              >
                Machine {machine.name}
              </Button>
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
        <Outlet />
      </Box>
    </Box>
  );
};

export default MachinesPage;
