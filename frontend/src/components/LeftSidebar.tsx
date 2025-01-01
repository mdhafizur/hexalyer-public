import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  InputBase,
  Box,
  Typography,
  Tooltip,
  Button,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Search,
  Dashboard,
  Chat,
  Apps,
  Settings,
  Logout,
} from '@mui/icons-material';
import { styled } from '@mui/system';
import { useNavigate } from 'react-router-dom';
import HexaLayerImage from '../assests/images/HexaLayer.png';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DnsIcon from '@mui/icons-material/Dns';

const SearchContainer = styled('div')(() => ({
  display: 'flex',
  alignItems: 'center',
  padding: '5px 10px',
  borderRadius: '15px',
  margin: '20px 10px',
  backgroundColor: '#131D3B',
}));

const LeftSidebar: React.FC<{
  open: boolean;
  setSidebarOpen: (open: boolean) => void;
}> = ({ open, setSidebarOpen }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [selectedItem, setSelectedItem] = useState<string>('Dashboard');

  const handleNavigation = (path: string, label: string) => {
    setSelectedItem(label);
    navigate(path);
    if (isMobile) setSidebarOpen(false); // Close sidebar on mobile after navigation
  };

  return (
    <Drawer
      sx={{
        '& .MuiDrawer-paper': {
          width: isMobile ? '100%' : 260,
          height: isMobile ? '50%' : '100%',
          boxSizing: 'border-box',
          backgroundColor: '#202940',
          color: 'white',
        },
      }}
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor={isMobile ? 'top' : 'left'}
      open={open}
      onClose={() => setSidebarOpen(false)} // Close sidebar on mobile when clicked outside
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: '20px',
          borderBottom: '1px solid #3c3c3c',
        }}
      >
        <img src={HexaLayerImage} alt="HexaLayer Logo" height={30} width={30} />
        <Typography variant="h6" sx={{ color: 'white', flexGrow: 1, fontFamily: 'roboto' }}>
          HexaShield
        </Typography>
        {isMobile && (
          <Button variant="contained" onClick={() => setSidebarOpen(false)}>
            <MenuOpenIcon />
          </Button>
        )}
      </Box>

      <SearchContainer>
        <Search sx={{ color: '#fff' }} />
        <InputBase
          placeholder="Search"
          sx={{ color: 'white', marginLeft: '10px', flexGrow: 1 }}
        />
      </SearchContainer>

      <Divider />

      <List>
        {[
          { label: 'Dashboard', icon: <Dashboard />, path: '/' },
          { label: 'Chats', icon: <Chat />, path: '/conversations' },
          { label: 'Agents', icon: <DnsIcon />, path: '/agents' },
          { label: 'Reports', icon: <Apps />, path: '/reports' },
        ].map((item) => (
          <Tooltip key={item.label} title={item.label}>
            <ListItemButton
              onClick={() => handleNavigation(item.path, item.label)}
              sx={{
                padding: '10px 20px', // Add more padding to left and right
                backgroundColor:
                  selectedItem === item.label ? theme.palette.background.default : 'transparent',
                borderRadius: '12px 0px 0px 12px',
                marginLeft: selectedItem === item.label ? '15px' : '0px',
                '&:hover': { backgroundColor: theme.palette.action.hover },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {item.icon}
                <ListItemText primary={item.label} sx={{ color: '#fff' }} />
              </Box>
            </ListItemButton>
          </Tooltip>
        ))}
      </List>

      <Divider />

      <List sx={{ marginTop: 'auto' }}>
        {[
          { label: 'User Settings', icon: <Settings />, path: '/user-profile' },
          { label: 'Logout', icon: <Logout />, path: '/login' },
        ].map((item) => (
          <Tooltip key={item.label} title={item.label}>
            <ListItemButton
              onClick={() => handleNavigation(item.path, item.label)}
              sx={{
                padding: '10px 20px', // Add more padding to left and right
                '&:hover': { backgroundColor: theme.palette.action.hover },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {item.icon}
                <ListItemText primary={item.label} sx={{ color: '#fff' }} />
              </Box>
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Drawer>
  );
};

export default LeftSidebar;
