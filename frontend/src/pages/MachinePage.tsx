import React, { useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  TableSortLabel,
  TablePagination,
  Button,
} from "@mui/material";
import { useParams } from "react-router-dom";
import TasksData from "../assests/dummy-data/taskData.json";

type Order = "asc" | "desc";

const MachinePage: React.FC = () => {
  const params = useParams<{ machineId: string }>();

  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<keyof typeof TasksData[0]>("name");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const handleRequestSort = (property: keyof typeof TasksData[0]) => {
    const isAscending = orderBy === property && order === "asc";
    setOrder(isAscending ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const sortedData = React.useMemo(() => {
    return TasksData.slice()
      .sort((a, b) => {
        if (a[orderBy] < b[orderBy]) return order === "asc" ? -1 : 1;
        if (a[orderBy] > b[orderBy]) return order === "asc" ? 1 : -1;
        return 0;
      })
      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [TasksData, order, orderBy, page, rowsPerPage]);

  return (
    <Box
      component="main"
      sx={{
        flexGrow: 1,
        bgcolor: "background.default",
        p: 3,
      }}
    >
      <Typography variant="h5" gutterBottom align="center">
       TASK HISTORY
      </Typography>

      <TableContainer component={Paper} sx={{ mt: 3, boxShadow: 4, borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                "& .MuiTableCell-root": {
                  fontWeight: "bold",
                  fontSize: "1rem",
                },
              }}
            >
              {[
                { id: "name", label: "Task Name" },
                { id: "status", label: "Status" },
                { id: "started", label: "Started" },
                { id: "ended", label: "Ended" },
                { id: "executedtime", label: "Execution Time" },
                { id: "actions", label: "Actions" },
              ].map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    bgcolor: "white",
                    color: orderBy === column.id ? "purple" : "black",
                  }}
                  
                >
                  {column.id !== "actions" ? (
                    <TableSortLabel
                      active={orderBy === column.id}
                      direction={orderBy === column.id ? order : "asc"}
                      onClick={() => handleRequestSort(column.id as keyof typeof TasksData[0])}
                      sx={{
                        "& .MuiTableSortLabel-icon": {
                          color: orderBy === column.id ? "white" : "purple",
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((task, index) => (
              <TableRow
                key={index}
                sx={{
                  bgcolor: index % 2 === 0 ? "action.hover" : "background.paper",
                  "&:hover": {
                    bgcolor: "primary.action",
                  },
                }}
              >
                <TableCell>{task.name}</TableCell>
                <TableCell
                  sx={{
                    color: task.status === "passed" ? "green" : "red",
                    fontWeight: "bold",
                  }}
                >
                  {task.status}
                </TableCell>
                <TableCell>{task.started}</TableCell>
                <TableCell>{task.ended}</TableCell>
                <TableCell>{task.executedtime}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    size="small"
                    sx={{
                      textTransform: "none",
                      bgcolor: "primary.main",
                      "&:hover": { bgcolor: "primary.dark" },
                    }}
                    onClick={() => alert(`Viewing details for task: ${task.name}`)}
                  >
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={TasksData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[15, 25, 50, 100]}
        sx={{
          mt: 2,
          "& .MuiTablePagination-actions": {
            color: "primary.main",
          },
        }}
      />
    </Box>
  );
};

export default MachinePage;
