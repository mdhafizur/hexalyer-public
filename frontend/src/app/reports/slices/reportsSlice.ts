import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Report } from '@app/reports/types/report.types';
import {
    queryReports,
} from '@app/reports/services/reportService';



interface ReportState {
    reports: {
        data: Report[]
    }; // List of reports
    loading: boolean; // Loading state for API calls
    error: string | null; // Error message, if any
    selectedReportId: string | null; // ID of the currently selected conversation
}

const initialState: ReportState = {
    reports: {
        data: []
    },
    loading: false,
    error: null,
    selectedReportId: null,
};

// Define a type for errors
interface FetchError {
    message: string;
}

// Thunk for querying reports
export const queryReportsThunk = createAsyncThunk<
    { data: Report[] }, // Success return type
    { user_id?: string; coversation_id?: string; message_id?: string; type?: string; created_by?: string; updated_by?: string; page?: number; page_size?: number }, // Arguments
    { rejectValue: FetchError } // Error return type
>(
    'reports/queryReports',
    async (queryParams, { rejectWithValue }) => {
        try {
            const reports = await queryReports(queryParams);
            return reports;
        } catch (error) {
            if (error instanceof Error) {
                // Explicitly check if the error is an instance of Error
                return rejectWithValue({ message: error.message });
            }
            // Handle unexpected error shape
            return rejectWithValue({ message: 'Unknown error occurred' });
        }
    }
);

const reportsSlice = createSlice({
    name: 'reports',
    initialState,
    reducers: {
        selectReport(state, action: PayloadAction<string | null>) {
            state.selectedReportId = action.payload;
        },
        resetMessagesState() {
            return initialState;
        },
    },
    extraReducers: (builder) => {
        builder
            // Query reports
            .addCase(queryReportsThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(queryReportsThunk.fulfilled, (state, action: PayloadAction<{ data: Report[] }>) => {
                state.loading = false;
                state.reports.data = action.payload.data;
            })
            .addCase(queryReportsThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload?.message || 'Failed to query reports';
            });
    },
});

export const {
    selectReport,
    resetMessagesState,
} = reportsSlice.actions;

export default reportsSlice.reducer;
