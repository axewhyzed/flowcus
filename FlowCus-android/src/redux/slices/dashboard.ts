// src/redux/slices/dashboard.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

interface DashboardStats {
  dailyAvg: string;
  completionRate: number;
  totalSessions: number;
  streakDays: number;
}

interface DashboardState {
  stats: DashboardStats | null;
  currentFocus: any | null; // Replace 'any' with TimetableItem interface if available
  isLoading: boolean;
}

const initialState: DashboardState = {
  stats: null,
  currentFocus: null,
  isLoading: false,
};

// Fetch Stats (Calls GET /api/dashboard/stats)
export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async () => {
    const response = await apiClient.get('/dashboard/stats');
    return response.data;
  }
);

// Fetch Current Focus (Calls GET /api/dashboard/now)
export const fetchCurrentFocus = createAsyncThunk(
  'dashboard/fetchCurrentFocus',
  async () => {
    const response = await apiClient.get('/dashboard/now');
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
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stats = action.payload;
      })
      .addCase(fetchCurrentFocus.fulfilled, (state, action) => {
        state.currentFocus = action.payload;
      });
  },
});

export default dashboardSlice.reducer;