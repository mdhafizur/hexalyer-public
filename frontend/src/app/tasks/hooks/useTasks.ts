import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../hook";
import { fetchTasksThunk } from "../slices/tasksSlice";
import { RootState } from "../../store";

export const useTasks = (agentId: string) => {
  const dispatch = useAppDispatch();
  const { tasks, loading, error } = useAppSelector((state: RootState) => state.tasks);

  // Memoized fetch function to avoid unnecessary re-creations
  const fetchTasks = useCallback(() => {
    if (agentId) {
      dispatch(fetchTasksThunk(agentId));
    }
  }, [dispatch, agentId]);

  // Automatically fetch tasks when agentId changes
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, fetchTasks };
};
