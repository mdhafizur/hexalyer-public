import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { fetchTasks } from "../services/tasksService";
import { Task } from "../types/task.types";

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

// Define a type for errors
interface FetchError {
  message: string;
}

// Thunk for fetching tasks
export const fetchTasksThunk = createAsyncThunk<
  Task[], // Success return type
  string, // Argument type (agentId)
  { rejectValue: FetchError } // Error return type
>("tasks/fetchTasks", async (agentId: string, { rejectWithValue }: string) => {
  try {
    const tasks = await fetchTasks(agentId);
    return tasks; // Expected to return an array of Task objects
  } catch (error: any) {
    return rejectWithValue({
      message: error.message || "Unknown error occurred",
    });
  }
});

const tasksSlice = createSlice({
  name: "tasks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasksThunk.pending, (state) => {
        state.loading = true;
        state.error = null; // Clear any previous errors
      })
      .addCase(
        fetchTasksThunk.fulfilled,
        (state, action: PayloadAction<Task[]>) => {
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

export default tasksSlice.reducer;
