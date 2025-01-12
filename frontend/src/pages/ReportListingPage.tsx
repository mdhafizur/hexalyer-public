import { riskLevels } from "@app/base.types";
import { useReports } from "@app/reports/hooks/useReports"; // Custom hook to fetch reports
import { Report } from "@app/reports/types/report.types";
import { generatePDF } from "@components/Reports/generatePDF";
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
  Button,
} from "@mui/material";
import React, { useState } from "react";
import ProgressModal from "@components/Conversation/ProgressModal";

export default function ReportListingPage() {
  const { reports, loading, error } = useReports(); // Custom hook to fetch reports
  const tempData = reports?.data || []; // Access reports from 'data' if available
  const reportData = tempData.filter((report: { type: string; }) => report.type === "webhex")
  const [page, setPage] = React.useState(0); // Page state for pagination
  const [rowsPerPage, setRowsPerPage] = React.useState(10); // Rows per page state
  const [order, setOrder] = React.useState<"asc" | "desc">("asc"); // Sorting order
  const [orderBy, setOrderBy] = React.useState<string>("created_at"); // Default sort by "created_at"
  const [open, setOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>("");

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Handle page change
  const handleChangePage = (
    event: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  // Handle rows per page change
  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0); // Reset to the first page
  };

  // Handle sorting by column
  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  function handleViewClick(id: string) {
    console.log("report id", id)
    setSelectedReportId(id); 
    handleOpen();
  }

  function handleDownloadClick(report: Report) {
    const riskSummary = report?.details?.alerts.reduce((acc: { [key in keyof typeof riskLevels]?: number }, item) => {
      acc[item.risk] = (acc[item.risk] || 0) + 1;
      return acc;
    }, {});

    const alertSummary = report.details?.alerts.reduce((acc: { [key: string]: number }, item) => {
      acc[item.name] = (acc[item.name] || 0) + 1;
      return acc;
    }, {});

    generatePDF(report.details?.alerts, riskSummary, alertSummary);
  }

  // Sort reports based on the selected column and order
  const sortedReports = React.useMemo(() => {
    return [...reportData].sort((a, b) => {
      const aValue = a[orderBy as keyof Report];
      const bValue = b[orderBy as keyof Report];

      if (aValue < bValue) {
        return order === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return order === "asc" ? 1 : -1;
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
        p: { xs: 2, sm: 4 }, 
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
                <TableCell>URL</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "created_at"}
                    direction={orderBy === "created_at" ? order : "asc"}
                    onClick={() => handleRequestSort("created_at")}
                  >
                    Created At
                  </TableSortLabel>
                </TableCell>
                
                <TableCell>Actions</TableCell>
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
                      <TableCell>
                      <Typography variant="body2">
                        <a
                          href={report.details?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'white' }}
                        >
                          {report.details?.url}
                        </a>
                      </Typography>
                      </TableCell>
                      <TableCell>{report.updated_at}</TableCell>
                      <TableCell sx={{ display: "flex", gap: 2 }}>
                        <Button
                          variant="contained"
                          color="secondary"
                          aria-label="View Item"
                          onClick={() => handleViewClick(report._id)}
                        >
                          View
                        </Button>
                        <Button
                          variant="contained"
                          color="secondary"
                          aria-label="Download Item"
                          onClick={() => handleDownloadClick(report)}
                        >
                          Download
                        </Button>
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
          count={reports?.length || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      
      <ProgressModal open={open} onClose={handleClose} reportId={selectedReportId} />
    </Box>
  );
}
