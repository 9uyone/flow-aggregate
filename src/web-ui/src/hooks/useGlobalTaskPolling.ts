import { useEffect } from 'react';
import { storageApi } from '../api';
import { useParserStore } from '../store/parserStore';
import type { ParserTaskItem } from '../types/storage';

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
  const runningTaskIds = useParserStore((state) => state.runningTaskIds);
  const taskSlugByCorrelationId = useParserStore((state) => state.taskSlugByCorrelationId);
  const {
    updateParser,
    updateParserConfigsBySlug,
    removeRunningTaskId,
    removeTaskSlugForCorrelationId,
    setTaskStatus,
    removeTaskStatus,
    bumpTaskCompletionVersion,
  } = useParserStore();

  useEffect(() => {
    const activeCorrelationIds = Array.from(runningTaskIds.values());
    if (activeCorrelationIds.length === 0) {
      return;
    }

    const pollTasks = async () => {
      try {
        const taskResults = await Promise.all(
          activeCorrelationIds.map(async (correlationId) => {
            try {
              const response = await storageApi.getTasks(1, 1, { correlationId });
              return {
                correlationId,
                task: response.items[0] ?? null,
              };
            } catch {
              return null;
            }
          })
        );

        taskResults
          .filter((result): result is { correlationId: string; task: ParserTaskItem } => result !== null && result.task !== null)
          .forEach(({ correlationId, task }) => {
            const parserSlug = taskSlugByCorrelationId[correlationId] ?? task.parserSlug;

            setTaskStatus({
              correlationId: task.correlationId,
              parserSlug: task.parserSlug,
              status: task.status,
              errorMessage: task.errorMessage ?? undefined,
              startedAt: task.startedAt,
              finishedAt: task.finishedAt,
              recordsCount: task.recordsCount,
              parserOptions: task.parserOptions,
            });

            if (task.status !== 'Running') {
              removeRunningTaskId(correlationId);
              removeTaskStatus(correlationId);
              removeTaskSlugForCorrelationId(correlationId);
              bumpTaskCompletionVersion();
            }

            if (!parserSlug) {
              return;
            }

            // Update parser store for ParserList
            if (task.status === 'Running') {
              updateParser(parserSlug, { status: 'Running' });
              updateParserConfigsBySlug(parserSlug, { status: 'Running' });
            } else {
              // Task completed (Success or Failed)
              updateParser(parserSlug, {
                status: task.status,
                lastRunAt: task.finishedAt ?? new Date().toISOString(),
              });
              updateParserConfigsBySlug(parserSlug, {
                status: task.status,
                lastRunAt: task.finishedAt ?? new Date().toISOString(),
                lastErrorMessage: task.errorMessage ?? undefined,
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
  }, [
    runningTaskIds,
    taskSlugByCorrelationId,
    updateParser,
    updateParserConfigsBySlug,
    removeRunningTaskId,
    removeTaskSlugForCorrelationId,
    setTaskStatus,
    removeTaskStatus,
    bumpTaskCompletionVersion,
  ]);
};
