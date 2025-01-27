import { useReports } from "@app/reports/hooks/useReports"; // Custom hook to fetch reports
import { Report } from "@app/reports/types/report.types";
import AutoManualReportModal from "@components/Reports/AutoManualReportModal";
import { autoManualGeneratePDF } from "@components/Reports/autoManualGeneratePDF";
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
  Modal,
  IconButton,
} from "@mui/material";
import React, { useState } from "react";
import CloseIcon from "@mui/icons-material/Close";

export default function AutoReportListingPage() {
  const { reports, loading, error } = useReports(); // Custom hook to fetch reports
  const reportData = reports?.data || []; // Access reports from 'data' if available
  const autoData = reportData.filter((report: { type: string; }) => report.type === "auto");
  const [page, setPage] = React.useState(0); // Page state for pagination
  const [rowsPerPage, setRowsPerPage] = React.useState(10); // Rows per page state
  const [order, setOrder] = React.useState<"asc" | "desc">("asc"); // Sorting order
  const [orderBy, setOrderBy] = React.useState<string>("updated_at"); // Default sort by "updated_at"
  const [open, setOpen] = useState(false);
  const [selectedReport, setselectedReport] = useState<Report | null>(null);

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

  function handleDownloadClick(reportData: Report) {
    autoManualGeneratePDF("auto", reportData);
  }

  function handleViewClick(data: Report) {
    setselectedReport(data);
    handleOpen();
  }
  // Sort reports based on the selected column and order
  const sortedReports = React.useMemo(() => {
      return [...autoData].sort((a, b) => {
        const aValue = a[orderBy as keyof Report];
        const bValue = b[orderBy as keyof Report];
    
        // Ensure values are not undefined before comparison
        if (aValue === undefined) return order === "asc" ? -1 : 1;
        if (bValue === undefined) return order === "asc" ? 1 : -1;
    
        if (aValue < bValue) {
          return order === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return order === "asc" ? 1 : -1;
        }
        return 0;
      });
    }, [autoData, order, orderBy]);

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
                <TableCell>Conversation</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === "updated_at"}
                    direction={orderBy === "updated_at" ? order : "asc"}
                    onClick={() => handleRequestSort("updated_at")}
                  >
                    Updated At
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
                      <TableCell>{report.conversation_name}</TableCell>
                      <TableCell> 
                        {new Date(report?.updated_at || "").toLocaleString(
                          "de-DE",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell sx={{ display: "flex", gap: 2 }}>
                        <Button
                          variant="contained"
                          color="secondary"
                          aria-label="View Item"
                          onClick={() =>
                            handleViewClick(report)
                          }
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
          count={reports?.data.length || 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "90%", // Adjust for responsiveness
            maxWidth: 1000, // Restrict maximum width
            maxHeight: "80vh", // Limit the height to 80% of the viewport
            overflowY: "auto", // Enable vertical scrolling if content overflows
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 3, // Padding around the content
          }}
        >
          {/* Header Section */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid #ddd", // Separator line
              pb: 2, // Padding below the header
              mb: 3, // Margin below the header
            }}
          >
            <Typography id="modal-title" variant="h4" component="h2">
              HexaShield Report
            </Typography>
            <IconButton
              onClick={handleClose}
              aria-label="Close"
              size="small"
              sx={{
                color: "text.secondary", // Consistent color with theme
                "&:hover": {
                  color: "error.main", // Red hover effect
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Content Section */}
          <Box id="modal-description">
            <AutoManualReportModal
              reportType="manual"
              reportData={selectedReport?.data ?? []}
            />
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
