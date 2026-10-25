// src/redux/slices/dashboard.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

interface DashboardStats {
  dailyAvg: string;
  completionRate: number;
  completedTasks: number;
  streakDays: number;
}

export interface CurrentFocus {
  title?: string;
  taskName?: string;
  categoryName?: string;
  startTime?: string;
  endTime?: string;
}

interface DashboardState {
  stats: DashboardStats | null;
  currentFocus: CurrentFocus | null;
  isLoading: boolean;
  isCurrentFocusLoading: boolean;
  statsError: string | null;
  currentFocusError: string | null;
}

const initialState: DashboardState = {
  stats: null,
  currentFocus: null,
  isLoading: true,
  isCurrentFocusLoading: true,
  statsError: null,
  currentFocusError: null,
};

// Fetch Stats (Calls GET /api/dashboard/stats)
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async () => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats');
    return response.data;
  }
);

// Fetch Current Focus (Calls GET /api/dashboard/now)
export const fetchCurrentFocus = createAsyncThunk(
  'dashboard/fetchCurrentFocus',
  async () => {
    const response = await apiClient.get<CurrentFocus | null>('/dashboard/now');
    return response.data;
  }
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.statsError = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.isLoading = false;
        state.statsError = action.error.message || 'Could not load dashboard statistics.';
      })
      .addCase(fetchCurrentFocus.pending, (state) => {
        state.currentFocusError = null;
        state.isCurrentFocusLoading = true;
      })
      .addCase(fetchCurrentFocus.fulfilled, (state, action) => {
        state.currentFocus = action.payload;
        state.currentFocusError = null;
        state.isCurrentFocusLoading = false;
      })
      .addCase(fetchCurrentFocus.rejected, (state, action) => {
        state.currentFocus = null;
        state.isCurrentFocusLoading = false;
        state.currentFocusError = action.error.message || 'Could not load the current schedule.';
      });
  },
});

export default dashboardSlice.reducer;
