import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Provider } from "react-redux";
import { store } from "./app/store"; // Adjust the import path
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import App from "./App"; // Import your App component
import DashboardPage from "./pages/DashboardPage";
import NotFoundPage from "./pages/NotFoundPage";
import ChatsPage from "./pages/ChatsPage";
import ChatPage from "./pages/ChatPage";
import AgentListing from "./pages/AgentListing";
import MachinePage from "./pages/MachinePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RecoverPasswordPage from "./pages/RecoverPasswordPage";
import ExtraPage from "./pages/ExtraPage";
import UserProfilePage from "./pages/UserProfilePage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // Use App as the wrapper component for your routes
    children: [
      {
        path: "/",
        element: <DashboardPage />,
      },
      {
        path: "/chats",
        element: <ChatsPage />,
        children: [
          {
            path: "/chats/:chatId",
            element: <ChatPage />,
          },
        ],
      },
      {
        path: "/agents",
        element: <AgentListing />,
        children: [
          {
            path: "/agents/:agentId",
            element: <MachinePage />,
          },
        ],
      },
      {
        path: "/extra",
        element: <ExtraPage />,
      },
      {
        path: "/user-profile",
        element: <UserProfilePage />,
      },
    ],
    errorElement: <NotFoundPage />,
  },
  {
    path: "/login",
    element: <LoginPage />, // Use App as the wrapper component for your routes
    errorElement: <NotFoundPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />, // Use App as the wrapper component for your routes
    errorElement: <NotFoundPage />,
  },
  {
    path: "/recover-password",
    element: <RecoverPasswordPage />, // Use App as the wrapper component for your routes
    errorElement: <NotFoundPage />,
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>
);
