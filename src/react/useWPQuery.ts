import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

export interface UseWPQueryResult<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
  refetch: () => void;
}

interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  isLoading: boolean;
}

export function useWPQuery<T>(fetcher: () => Promise<T>, deps: DependencyList): UseWPQueryResult<T> {
  const [state, setState] = useState<QueryState<T>>({
    data: undefined,
    error: undefined,
    isLoading: true,
  });

  const requestId = useRef(0);

  const run = useCallback(() => {
    const id = ++requestId.current;
    // Bail out (return the same object) when state is already
    // isLoading/error-free — e.g. the very first run() on mount, right
    // after useState's initial value. Returning a fresh object here even
    // when nothing actually changed still triggers a wasted re-render,
    // since React only skips it on an exact Object.is match.
    setState((prev) => (prev.isLoading && prev.error === undefined ? prev : { ...prev, isLoading: true, error: undefined }));

    fetcher()
      .then((result) => {
        if (id === requestId.current) {
          setState({ data: result, error: undefined, isLoading: false });
        }
      })
      .catch((err) => {
        if (id === requestId.current) {
          setState((prev) => ({
            ...prev,
            error: err instanceof Error ? err : new Error(String(err)),
            isLoading: false,
          }));
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { ...state, refetch: run };
}
