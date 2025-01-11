// hooks/useTaskData.ts
import { useState, useEffect } from 'react';
import { privateClient } from '@app/axios.client';

interface Task {
  _id: string;
  agent_id: string;
  agent_name: string;
  conversation_id: string;
  status: string;
  created_at: string;
  completed_at: string;
  priority: string;
  execution_time: string;
}

interface TaskDataState {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  noData: boolean; // Add a noData flag
}

// Create a singleton instance to store the cached data
let cachedData: TaskDataState | null = null;
let fetchPromise: Promise<Task[]> | null = null;

export const useTaskData = () => {
  const [state, setState] = useState<TaskDataState>({
    tasks: [],
    loading: true,
    error: null,
    noData: false, // Initialize noData flag
  });

  useEffect(() => {
    const fetchData = async () => {
      setState(prev => ({ ...prev, loading: true }));

      try {
        const response = await privateClient.get("tasks/");
        const tasks = response.data;
        console.log("Get the data", tasks)
        setState({
          tasks,
          loading: false,
          error: null,
          noData: tasks.length === 0,
        });
      } catch (error) {
        setState({
          tasks: [],
          loading: false,
          error: error as Error,
          noData: false,
        });
      }
    };

    fetchData();
  }, []);

  // Function to manually refresh the data if needed
  const refreshData = async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const response = await privateClient.get("tasks/");
      const tasks = response.data;
      console.log("Refesh data", tasks)
      setState({
        tasks,
        loading: false,
        error: null,
        noData: tasks.length === 0,
      });
    } catch (error) {
      setState({
        tasks: [],
        loading: false,
        error: error as Error,
        noData: false,
      });
    }
  };

  return { ...state, refreshData };
};