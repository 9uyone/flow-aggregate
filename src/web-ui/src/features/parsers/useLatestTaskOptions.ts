import { useCallback, useEffect, useRef, useState } from 'react';
import { storageApi } from '../../api';

interface ParserSlugItem {
  slug: string;
}

export const useLatestTaskOptions = (
  parsers: ParserSlugItem[],
  taskCompletionVersion: number
) => {
  const [latestTaskOptionsBySlug, setLatestTaskOptionsBySlug] = useState<Record<string, Record<string, string>>>({});
  const inFlightKeyRef = useRef<string | null>(null);
  const lastCompletedKeyRef = useRef<string | null>(null);

  const fetchLatestTaskOptions = useCallback(async () => {
    const parserSlugs = Array.from(new Set(parsers.map((parser) => parser.slug))).sort();
    const requestKey = `${taskCompletionVersion}:${parserSlugs.join('|')}`;

    if (inFlightKeyRef.current === requestKey || lastCompletedKeyRef.current === requestKey) {
      return;
    }

    inFlightKeyRef.current = requestKey;

    try {

      if (parserSlugs.length === 0) {
        setLatestTaskOptionsBySlug({});
        lastCompletedKeyRef.current = requestKey;
        return;
      }

      const responses = await Promise.allSettled(
        parserSlugs.map((slug) =>
          storageApi.getTasks(1, 1, {
            oldFirst: false,
            parserSlug: slug,
          })
        )
      );

      const nextMap: Record<string, Record<string, string>> = {};

      responses.forEach((result) => {
        if (result.status !== 'fulfilled') {
          return;
        }

        const task = result.value.items[0];

        if (!task || !task.parserOptions || nextMap[task.parserSlug]) {
          return;
        }

        const options = Object.fromEntries(
          Object.entries(task.parserOptions)
            .filter(([, value]) => value !== null && value !== undefined)
            .map(([key, value]) => [key, String(value)])
        );

        if (Object.keys(options).length > 0) {
          nextMap[task.parserSlug] = options;
        }
      });

      setLatestTaskOptionsBySlug(nextMap);
      lastCompletedKeyRef.current = requestKey;
    } catch {
      setLatestTaskOptionsBySlug({});
      lastCompletedKeyRef.current = requestKey;
    } finally {
      if (inFlightKeyRef.current === requestKey) {
        inFlightKeyRef.current = null;
      }
    }
  }, [parsers, taskCompletionVersion]);

  useEffect(() => {
    void fetchLatestTaskOptions();
  }, [fetchLatestTaskOptions, taskCompletionVersion]);

  return {
    latestTaskOptionsBySlug,
    fetchLatestTaskOptions,
  };
};
