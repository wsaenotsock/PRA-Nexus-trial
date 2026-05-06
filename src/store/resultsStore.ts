'use client';

import { create } from 'zustand';
import type { QuantificationResult, PRAModel, ImportanceMeasure } from '@/lib/types';

interface ResultsState {
  results: Record<string, QuantificationResult>; // targetId -> Result
  activeResultId: string | null;
  isComputing: boolean;
  error: string | null;

  setResult: (targetId: string, result: QuantificationResult) => void;
  setActiveResult: (targetId: string | null) => void;
  setComputing: (computing: boolean) => void;
  setError: (error: string | null) => void;
  clear: () => void;
}

export const useResultsStore = create<ResultsState>((set) => ({
  results: {},
  activeResultId: null,
  isComputing: false,
  error: null,

  setResult: (targetId, result) => set((state) => ({ 
    results: { ...state.results, [targetId]: result },
    activeResultId: targetId,
    isComputing: false, 
    error: null 
  })),
  setActiveResult: (targetId) => set({ activeResultId: targetId }),
  setComputing: (computing) => set({ isComputing: computing }),
  setError: (error) => set({ error, isComputing: false }),
  clear: () => set({ results: {}, activeResultId: null, error: null, isComputing: false }),
}));

// --- Web Worker Integration ---
let workerInstance: Worker | null = null;
let msgId = 0;
const resolvers = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

function getWorker(): Worker {
  if (typeof window === 'undefined') {
    throw new Error('Worker cannot be created on server side');
  }
  if (!workerInstance) {
    workerInstance = new Worker(new URL('../workers/quant.worker.ts', import.meta.url));
    workerInstance.onmessage = (e) => {
      const { id, type, result, error } = e.data;
      const deferred = resolvers.get(id);
      if (deferred) {
        resolvers.delete(id);
        if (type === 'SUCCESS') deferred.resolve(result);
        else deferred.reject(new Error(error));
      }
    };
  }
  return workerInstance;
}

export async function runWorkerCommand<T>(type: string, payload: any): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const worker = getWorker();
      const id = ++msgId;
      resolvers.set(id, { resolve, reject });
      worker.postMessage({ id, type, payload });
    } catch (err) {
      reject(err);
    }
  });
}
