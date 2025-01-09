import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@app/hook';
import { RootState } from '@app/store';
import { queryReportsThunk } from '@app/reports/slices/reportsSlice';

export const useReports = () => {
    const dispatch = useAppDispatch();

    // Extract state data
    const { reports, loading, error } = useAppSelector((state: RootState) => state.reports);

    // Query reports with filters, sort, and pagination
    const queryReports = useCallback(
        (filters: {
            user_id?: string;
            created_by?: string;
            message_id?: string;
            conversation_id?: string;
            page?: number;
            page_size?: number;
            sort_by?: string;
            sort_order?: string;
        }) => {
            return dispatch(queryReportsThunk(filters));
        },
        [dispatch]
    );

    // Load reports if the reports array is empty or no reports are loaded
    useEffect(() => {
        if (reports.length === 0) {
            queryReports({
                page: 1,
                page_size: 100,
                sort_by: 'updated_at',   // Sort by 'updated_at'
                sort_order: 'desc',       // Sort in descending order (latest first)
            });
        }
    }, [reports.length, queryReports]);  // Only run when the length of reports changes

    return {
        reports,
        loading,
        error,
        queryReports,
    };
};
