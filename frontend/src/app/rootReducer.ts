import { combineReducers } from '@reduxjs/toolkit';
import agentsReducer from './agents/slices/agentsSlice'

// Combine all feature reducers
const rootReducer = combineReducers({
    agents: agentsReducer,
    // Add more feature reducers here
});

export default rootReducer;
