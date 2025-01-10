import { combineReducers } from '@reduxjs/toolkit';
import agentsReducer from './agents/slices/agentsSlice';
import conversationsReducer from '@app/conversations/slices/conversationsSlice';
import messagesReducer from '@app/messages/slices/messagesSlice';
import reportsReducer from '@app/reports/slices/reportsSlice';
import tasksReducer from './tasks/slices/tasksSlice';
import userReducer from '@app/users/slices/usersSlice'; // Add the user slice

// Combine all feature reducers
const rootReducer = combineReducers({
    agents: agentsReducer,
    conversations: conversationsReducer,
    messages: messagesReducer,
    reports: reportsReducer,
    tasks: tasksReducer,
    user: userReducer, // Add user reducer
    // Add more feature reducers here
});

export default rootReducer;
