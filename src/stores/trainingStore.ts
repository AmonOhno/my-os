import { create } from 'zustand';
import {
  fetchSessions,
  fetchTrainingSummary,
  TrainingError,
  type TrainingSession,
  type TrainingSummary,
} from '../training/client';
import { dateOf, monthOf } from '../db/time';

export type TrainingStatus = 'idle' | 'loading' | 'ok' | 'unconfigured' | 'unauthorized' | 'error';

const RECENT_DAYS = 7;

function toStatus(e: unknown): TrainingStatus {
  const kind = e instanceof TrainingError ? e.kind : 'unavailable';
  return kind === 'unconfigured' ? 'unconfigured' : kind === 'unauthorized' ? 'unauthorized' : 'error';
}

interface TrainingState {
  status: TrainingStatus;
  summary: TrainingSummary | null;
  sessionsStatus: TrainingStatus;
  sessions: TrainingSession[] | null;
  loadSummary: () => Promise<void>;
  loadRecentSessions: () => Promise<void>;
}

export const useTrainingStore = create<TrainingState>((set, get) => ({
  status: 'idle',
  summary: null,
  sessionsStatus: 'idle',
  sessions: null,
  loadSummary: async () => {
    if (get().status === 'loading') return;
    set({ status: 'loading' });
    try {
      const summary = await fetchTrainingSummary(monthOf());
      set({ status: 'ok', summary });
    } catch (e) {
      // 失敗してもキャッシュ済みサマリがあれば表示し続ける
      set({ status: toStatus(e) });
    }
  },
  loadRecentSessions: async () => {
    if (get().sessionsStatus === 'loading') return;
    set({ sessionsStatus: 'loading' });
    const from = new Date();
    from.setDate(from.getDate() - (RECENT_DAYS - 1));
    try {
      const sessions = await fetchSessions(dateOf(from), dateOf());
      set({ sessionsStatus: 'ok', sessions });
    } catch (e) {
      set({ sessionsStatus: toStatus(e) });
    }
  },
}));
