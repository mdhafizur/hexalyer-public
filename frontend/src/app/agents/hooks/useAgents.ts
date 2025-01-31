import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hook';
import { fetchAgentsThunk } from '../slices/agentsSlice';
import { RootState } from '../../store';
import { useLocation } from 'react-router-dom';

export const useAgents = () => {
  const dispatch = useAppDispatch();
  const { agents, loading, error } = useAppSelector((state: RootState) => state.agents);
  const location = useLocation(); // Track navigation changes

  // Memoized fetch function to avoid unnecessary re-creations
  const fetchAgents = useCallback(() => {
    dispatch(fetchAgentsThunk());
  }, [dispatch]);

  // Automatically fetch agents on hook initialization and on tab visit
  useEffect(() => {
    fetchAgents(); // Always fetch new agents when the component mounts or the tab is revisited
  }, [fetchAgents, location.pathname]); // Re-run when the route changes

  return { agents, loading, error, fetchAgents };
};
