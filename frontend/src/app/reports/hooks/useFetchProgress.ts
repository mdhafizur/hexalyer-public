import useSWR from 'swr';
import { privateClient } from '@app/axios.client';
import { WebHexReportProgress } from '../types/WebHexReportProgress';

const fetcher = (url: string) => privateClient.get(url).then(res => res.data);

const useFetchProgress = (reportId: string) => {
  const { data: progressData, error } = useSWR<any>(
    `http://localhost:5000/web/api/v1/webhex/scans/${reportId}/progress`,
    fetcher,
    {
      keepPreviousData: true,
      refreshInterval: 1000, // Refresh every 10 seconds
    }
  );

  return { progressData, loading: !error && !progressData, error };
};

export default useFetchProgress;