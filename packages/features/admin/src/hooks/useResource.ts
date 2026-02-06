/**
 * Hook for fetching/mutating admin resources.
 * This is a lightweight state management hook — replace with tRPC in production.
 */

export interface UseResourceOptions {
  fetchFn: () => Promise<Record<string, unknown>[]>;
  deleteFn?: (id: string) => Promise<void>;
  createFn?: (data: Record<string, string>) => Promise<void>;
  updateFn?: (id: string, data: Record<string, string>) => Promise<void>;
}

export interface UseResourceResult {
  data: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  create: (data: Record<string, string>) => Promise<void>;
  update: (id: string, data: Record<string, string>) => Promise<void>;
}

/**
 * Create a resource hook configuration.
 * This returns a plain object that can be used in any React component.
 */
export function createResourceManager(options: UseResourceOptions) {
  let data: Record<string, unknown>[] = [];
  let loading = false;
  let error: string | null = null;

  const refetch = async () => {
    loading = true;
    error = null;
    try {
      data = await options.fetchFn();
    } catch (e) {
      error = e instanceof Error ? e.message : "Unknown error";
    } finally {
      loading = false;
    }
  };

  const remove = async (id: string) => {
    if (options.deleteFn) await options.deleteFn(id);
    await refetch();
  };

  const create = async (formData: Record<string, string>) => {
    if (options.createFn) await options.createFn(formData);
    await refetch();
  };

  const update = async (id: string, formData: Record<string, string>) => {
    if (options.updateFn) await options.updateFn(id, formData);
    await refetch();
  };

  return { getData: () => data, isLoading: () => loading, getError: () => error, refetch, remove, create, update };
}
