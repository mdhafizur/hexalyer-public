import { Agent } from '../types/agent.types';
import { privateClient } from '@app/axios.client';


export const fetchAgents = async (): Promise<Agent[]> => {
  const response = await privateClient.get("/agents");
  return response.data;
};
