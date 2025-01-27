import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { fetchTasks } from "../services/tasksService";
import { Task } from "../types/task.types";

// Define the FetchError type
interface FetchError {
  message: string;
}

// Define the initial state for tasks
interface TasksState {
  tasks: Task[]; // List of tasks
  loading: boolean; // Loading state for API calls
  error: string | null; // Error message, if any
}

const initialState: TasksState = {
  tasks: [],
  loading: false,
  error: null,
};

// Create an async thunk to fetch tasks
export const fetchTasksThunk = createAsyncThunk<
  Task[], // Fulfilled action payload type
  string, // Argument passed to the thunk
  { rejectValue: FetchError } // Error type on rejection
>(
  'tasks/fetchTasks', // Action type
  async (agentId: string, { rejectWithValue }) => {
    try {
      // Make the API call to fetch tasks
      const tasks = await fetchTasks(agentId);
      return tasks; // Return tasks on success
    } catch (error: unknown) {
      // Type guard to check if the error is an instance of Error
      if (error instanceof Error) {
        return rejectWithValue({ message: error.message || "Failed to fetch tasks" });
      }
      // Fallback message if the error is not an instance of Error
      return rejectWithValue({ message: "Failed to fetch tasks" });
    }
  }
);

// Create the slice for tasks
const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Handle the pending state (loading)
      .addCase(fetchTasksThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      // Handle the fulfilled state (success)
      .addCase(fetchTasksThunk.fulfilled, (state, action: PayloadAction<Task[]>) => {
        state.loading = false;
          state.tasks = action.payload; // Populate the tasks list
        }
      )
      .addCase(fetchTasksThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch tasks"; // Set error message
      });
  },
});

// Export the reducer
export default tasksSlice.reducer;
