import { Task } from '../types/task.types'; // Adjust the import path as necessary
import { privateClient } from '@app/axios.client';

const BASE_URL = import.meta.env.VITE_WEB_API_URL as string;

export const fetchTasks = async (agentId: string): Promise<Task[]> => {
  const response = await privateClient.get(`${BASE_URL}/tasks?agent_id=${agentId}`);
  return response.data;
};
