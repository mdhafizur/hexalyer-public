import axios from 'axios';
import { Task } from '../types/task.types'; // Adjust the import path as necessary

const BASE_URL = import.meta.env.VITE_WEB_API_URL as string;

export const fetchTasks = async (agentId: string): Promise<Task[]> => {
  const response = await axios.get(`${BASE_URL}/tasks/${agentId}`);
  return response.data;
};
