import axios from 'axios';
import { Task } from '../types/task.types'; // Adjust the import path as necessary

const BASE_URL = import.meta.env.VITE_WEB_API_URL as string;

export const fetchTasks = async (agentId: string): Promise<Task[]> => {
  console.log('Fetching tasks for agent 1:', agentId);
  console.log('URL:', `${BASE_URL}/tasks/${agentId}`);
  const response = await axios.get(`${BASE_URL}/tasks/${agentId}`);
  console.log('Fetched tasks:', response.data);
  return response.data;
};