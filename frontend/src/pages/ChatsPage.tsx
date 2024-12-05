import { Box } from '@mui/material';
import { NavLink, Outlet } from 'react-router-dom';

export default function ChatsPage() {
  const chats = [1, 2, 3, 4, 5];

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        bgcolor: "background.default", // Using custom background color from theme
        p: 3,
      }}
    >
      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          {chats.map((chat) => (
            <NavLink
              key={chat}
              to={`/chats/${chat}`}
              className={({ isActive }) => {
                return isActive ? 'text-primary-700' : '';
              }}
            >
              Chat {chat}
            </NavLink>
          ))}
        </div>
        <Outlet />
      </div>
    </Box>
  );
}