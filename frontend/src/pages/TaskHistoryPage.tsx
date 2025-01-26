import React, { useState } from "react";
import { useParams } from "react-router-dom";
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
  CircularProgress,
  Alert,
} from "@mui/material";
import { useTasks } from "@app/tasks/hooks";
import TaskDetailsModal from "../components/Task/TaskDetailsModal";

type Order = "asc" | "desc";

const TaskHistoryPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { tasks, loading, error } = useTasks(agentId!);
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<keyof (typeof tasks)[0]>("status");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [open, setOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<(typeof tasks)[0] | null>(
    null
  );

  const handleRequestSort = (property: keyof (typeof tasks)[0]) => {
    const isAscending = orderBy === property && order === "asc";
    setOrder(isAscending ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (
    _: React.MouseEvent<HTMLButtonElement> | null,
    newPage: number
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenModal = (task: (typeof tasks)[0]) => {
    setSelectedTask(task);
    setOpen(true);
  };

  const handleCloseModal = () => {
    setOpen(false);
    setSelectedTask(null);
  };

  const parseExecutionTime = (time: string) => {
    if (time.endsWith("s")) {
      return parseFloat(time.slice(0, -1));
    } else if (time.endsWith("m")) {
      return parseFloat(time.slice(0, -1)) * 60;
    } else if (time.endsWith("h")) {
      return parseFloat(time.slice(0, -1)) * 3600;
    } else {
      const parts = time.split(":").map(Number);
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (orderBy === "status") {
      if (order === "asc") {
        return a.status.localeCompare(b.status);
      } else {
        return b.status.localeCompare(a.status);
      }
    } else if (orderBy === "created_at" || orderBy === "completed_at") {
      if (order === "asc") {
        return new Date(a[orderBy]).getTime() - new Date(b[orderBy]).getTime();
      } else {
        return new Date(b[orderBy]).getTime() - new Date(a[orderBy]).getTime();
      }
    } else if (orderBy === "execution_time") {
      if (order === "asc") {
        return (
          parseExecutionTime(a.execution_time) -
          parseExecutionTime(b.execution_time)
        );
      } else {
        return (
          parseExecutionTime(b.execution_time) -
          parseExecutionTime(a.execution_time)
        );
      }
    } else if (orderBy === "name") {
      if (order === "asc") {
        return a.conversation.title.localeCompare(b.conversation.title);
      } else {
        return b.conversation.title.localeCompare(a.conversation.title);
      }
    } else {
      return 0;
    }
  });

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

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Box display="flex" justifyContent="center" alignItems="center" mt={3}>
          <Alert severity="error">{error}</Alert>
        </Box>
      ) : (
        <>
          <TableContainer
            component={Paper}
            sx={{ mt: 3, boxShadow: 4, borderRadius: 3 }}
          >
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
                    { id: "created_at", label: "Started" },
                    { id: "completed_at", label: "Ended" },
                    { id: "execution_time", label: "Execution Time" },
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
                          onClick={() =>
                            handleRequestSort(
                              column.id as keyof (typeof tasks)[0]
                            )
                          }
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
                {sortedTasks.map((task, index) => (
                  <TableRow
                    key={index}
                    sx={{
                      bgcolor:
                        index % 2 === 0 ? "action.hover" : "background.paper",
                      "&:hover": {
                        bgcolor: "primary.action",
                      },
                    }}
                  >
                    <TableCell>{task?.conversation?.title}</TableCell>
                    <TableCell
                      sx={{
                        color: task?.status === "failure" ? "red" : "green",
                        fontWeight: "bold",
                      }}
                    >
                      {task?.status}
                    </TableCell>
                    <TableCell>
                      {new Date(task?.created_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(task?.completed_at).toLocaleString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{task?.execution_time}</TableCell>
                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          textTransform: "none",
                          bgcolor: "primary.main",
                          "&:hover": { bgcolor: "primary.dark" },
                        }}
                        onClick={() => handleOpenModal(task)}
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
            count={tasks.length}
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
        </>
      )}

      {/* Modal */}
      <TaskDetailsModal
        open={open}
        onClose={handleCloseModal}
        task={selectedTask}
      />
    </Box>
  );
};

export default TaskHistoryPage;
