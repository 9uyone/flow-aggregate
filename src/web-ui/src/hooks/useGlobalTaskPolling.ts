import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { storageApi } from '../api';
import { useParserStore } from '../store/parserStore';
import type { ParserTaskItem, PagedTasksResponse } from '../types/storage';

/**
 * Global task polling hook that runs at app level.
 *
 * Why: Keeps task statuses in sync across all pages (History, Analytics, ParserList).
 * When a task is running on ParserList, this hook polls its status and updates
 * React Query cache so History and Analytics see fresh data without refetching.
 *
 * How: Polls all running tasks from runningTaskIds set every 5 seconds,
 * then invalidates or updates the getTasks query cache.
 */
export const useGlobalTaskPolling = () => {
  const queryClient = useQueryClient();
  const runningTaskIds = useParserStore((state) => state.runningTaskIds);
  const { updateParser, updateParserConfigsBySlug, removeRunningTaskId } = useParserStore();

  useEffect(() => {
    const activeCorrelationIds = Array.from(runningTaskIds.values());
    if (activeCorrelationIds.length === 0) {
      return;
    }

    const pollTasks = async () => {
      try {
        const statusResults = await Promise.all(
          activeCorrelationIds.map(async (correlationId) => {
            try {
              const status = await storageApi.getTaskStatus(correlationId);
              return { correlationId, status };
            } catch {
              return null;
            }
          })
        );

        statusResults
          .filter((result): result is { correlationId: string; status: NonNullable<typeof result>['status'] } => result !== null)
          .forEach(({ correlationId, status }) => {
            const parserSlug = status.parserSlug;
            if (!parserSlug) {
              return;
            }

            // Update parser store for ParserList
            if (status.status === 'Running') {
              updateParser(parserSlug, { status: 'Running' });
              updateParserConfigsBySlug(parserSlug, { status: 'Running' });
            } else {
              // Task completed (Success or Failed)
              updateParser(parserSlug, {
                status: status.status,
                lastRunAt: status.finishedAt ?? new Date().toISOString(),
              });
              updateParserConfigsBySlug(parserSlug, {
                status: status.status,
                lastRunAt: status.finishedAt ?? new Date().toISOString(),
                lastErrorMessage: status.errorMessage ?? undefined,
              });

              // Remove from running tasks
              removeRunningTaskId(correlationId);
            }

            // Update React Query cache for getTasks queries
            // This ensures History and Analytics see fresh data without refetching
            const cacheKey = ['getTasks'];
            const cachedData = queryClient.getQueryData<PagedTasksResponse>(cacheKey);
            if (cachedData) {
              const updatedItems = cachedData.items.map((item: ParserTaskItem) => {
                if (item.correlationId === status.correlationId) {
                  return {
                    ...item,
                    status: status.status,
                    parserSlug: status.parserSlug,
                    startedAt: status.startedAt,
                    finishedAt: status.finishedAt,
                    errorMessage: status.errorMessage,
                    recordsCount: status.recordsCount,
                  };
                }
                return item;
              });
              queryClient.setQueryData(cacheKey, {
                ...cachedData,
                items: updatedItems,
              });
            }
          });
      } catch (pollError) {
        console.error('[GlobalTaskPolling] Failed to poll task statuses:', pollError);
      }
    };

    void pollTasks();
    const intervalId = window.setInterval(() => {
      void pollTasks();
    }, 2500);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [runningTaskIds, queryClient, updateParser, updateParserConfigsBySlug, removeRunningTaskId]);
};
