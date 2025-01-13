import { getUserIdFromLocalStorage } from 'utils/cookieValidation';
import { Task } from '../types/task.types'; // Adjust the import path as necessary
import { privateClient } from '@app/axios.client';

const BASE_URL = import.meta.env.VITE_WEB_API_URL as string;

export const fetchTasks = async (agentId: string): Promise<Task[]> => {
  const userId = getUserIdFromLocalStorage();
  const response = await privateClient.get(`${BASE_URL}/tasks/query?agent_id=${agentId}&created_by=${userId}&page=1&page_size=100`);
  return response.data.data;
};
