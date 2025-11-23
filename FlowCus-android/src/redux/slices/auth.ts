// src/redux/slices/auth.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';
import { saveAuth, clearAuth, getAuth } from '../../services/storage';

export interface User {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,
};

// --- Thunks ---

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: any, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/auth/login', credentials);
      const { token, refreshToken, user } = response.data;
      await saveAuth({ accessToken: token, refreshToken });
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Login failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await clearAuth();
});

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const authData = await getAuth();
      if (!authData) return rejectWithValue('No session');
      const response = await apiClient.get('/auth/me');
      return response.data;
    } catch (error) {
      await clearAuth();
      return rejectWithValue('Session expired');
    }
  }
);

// NEW: Update Profile Name
export const updateProfileName = createAsyncThunk(
  'auth/updateProfile',
  async (name: string, { rejectWithValue }) => {
    try {
      // Calls PUT /api/users (Matches UserController.cs)
      await apiClient.put('/users', { name });
      return name;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Update failed');
    }
  }
);

// --- Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    // Login
    builder.addCase(login.pending, (state) => { state.isLoading = true; state.error = null; });
    builder.addCase(login.fulfilled, (state, action) => {
      state.isLoading = false;
      state.user = action.payload;
      state.isAuthenticated = true;
    });
    builder.addCase(login.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Logout
    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
    });

    // Restore
    builder.addCase(restoreSession.fulfilled, (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.isLoading = false;
    });
    builder.addCase(restoreSession.rejected, (state) => {
      state.isAuthenticated = false;
      state.isLoading = false;
    });

    // Update Profile
    builder.addCase(updateProfileName.fulfilled, (state, action) => {
        if (state.user) {
            state.user.name = action.payload;
        }
    });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;