import { useReports } from "@app/reports/hooks/useReports"; // Custom hook to fetch reports
import { Report } from '@app/reports/types/report.types';
import {
    Box,
    CircularProgress,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Paper,
    TableSortLabel,
} from "@mui/material";
import React from 'react';

export default function ReportListingPage() {
    const { reports, loading, error } = useReports(); // Custom hook to fetch reports
    const reportData = reports?.data || []; // Access reports from 'data' if available

    const [page, setPage] = React.useState(0); // Page state for pagination
    const [rowsPerPage, setRowsPerPage] = React.useState(10); // Rows per page state
    const [order, setOrder] = React.useState<'asc' | 'desc'>('asc'); // Sorting order
    const [orderBy, setOrderBy] = React.useState<string>('created_at'); // Default sort by "created_at"

    // Handle page change
    const handleChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
        setPage(newPage);
    };

    // Handle rows per page change
    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Reset to the first page
    };

    // Handle sorting by column
    const handleRequestSort = (property: string) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    // Sort reports based on the selected column and order
    const sortedReports = React.useMemo(() => {
        return [...reportData].sort((a, b) => {
            const aValue = a[orderBy as keyof Report];
            const bValue = b[orderBy as keyof Report];

            if (aValue < bValue) {
                return order === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return order === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [reportData, order, orderBy]);

    return (
        <Box
            component="main"
            sx={{
                display: "flex",
                flexDirection: "column",
                height: "100vh",
                bgcolor: "background.default",
            }}
        >
            {/* Reports Table */}
            <Paper elevation={2} sx={{ flexGrow: 1, overflow: "hidden" }}>
                {/* Table Header */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 2,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                    }}
                >
                    <Typography variant="h6">Reports</Typography>
                </Box>

                {/* Table */}
                <TableContainer sx={{ maxHeight: "calc(100vh - 180px)" }}>
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'type'}
                                        direction={orderBy === 'type' ? order : 'asc'}
                                        onClick={() => handleRequestSort('type')}
                                    >
                                        Type
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'user_id'}
                                        direction={orderBy === 'user_id' ? order : 'asc'}
                                        onClick={() => handleRequestSort('user_id')}
                                    >
                                        User ID
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'conversation_id'}
                                        direction={orderBy === 'conversation_id' ? order : 'asc'}
                                        onClick={() => handleRequestSort('conversation_id')}
                                    >
                                        Conversation ID
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'created_at'}
                                        direction={orderBy === 'created_at' ? order : 'asc'}
                                        onClick={() => handleRequestSort('created_at')}
                                    >
                                        Created At
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'updated_at'}
                                        direction={orderBy === 'updated_at' ? order : 'asc'}
                                        onClick={() => handleRequestSort('updated_at')}
                                    >
                                        Updated At
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" color="error">
                                        Failed to load reports
                                    </TableCell>
                                </TableRow>
                            ) : reportData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        No reports available
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedReports
                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                    .map((report: Report) => (
                                        <TableRow key={report._id}>
                                            <TableCell>{report.type}</TableCell>
                                            <TableCell>{report.user_id}</TableCell>
                                            <TableCell>{report.conversation_id}</TableCell>
                                            <TableCell>{new Date(report.created_at).toLocaleString()}</TableCell>
                                            <TableCell>{new Date(report.updated_at).toLocaleString()}</TableCell>
                                            <TableCell>
                                                {report.type === "webhex" && (
                                                    <div>
                                                        <Typography variant="body2">Scan ID: {report.details?.scan_id}</Typography>
                                                        <Typography variant="body2">URL: <a href={report.details?.url} target="_blank" rel="noopener noreferrer">{report.details?.url}</a></Typography>
                                                        {/* Render report object if available */}
                                                        <pre>{JSON.stringify(report.details?.report, null, 2)}</pre>
                                                    </div>
                                                )}
                                                {/* Add similar blocks for other types like "manual" or "auto" */}
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {/* Pagination */}
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 100]}
                    component="div"
                    count={reports?.total_items || 0}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </Paper>
        </Box>
    );
}
