// src/redux/slices/auth.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import apiClient from '../../services/apiClient';
import { saveAuth, clearAuth, getAuth } from '../../services/storage';

export interface User {
  id: number;
  username: string;
  name: string;
  isAdmin: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: User;
}

interface AuthThunkConfig {
  rejectValue: string;
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

export const login = createAsyncThunk<User, LoginCredentials, AuthThunkConfig>(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);
      const { token, user } = response.data;
      await saveAuth({ accessToken: token });
      return user;
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : null;
      return rejectWithValue(typeof message === 'string' ? message : 'Login failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch {
    // Local logout must still complete when the server is unreachable.
  } finally {
    await clearAuth();
  }
});

export const restoreSession = createAsyncThunk<User, void, AuthThunkConfig>(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const authData = await getAuth();
      if (!authData) return rejectWithValue('No session');
      const response = await apiClient.get<User>('/auth/me');
      return response.data;
    } catch (error: unknown) {
      // A network outage is not proof that a credential expired. Keep the
      // Keychain entry so the user can retry once connectivity returns.
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearAuth();
        return rejectWithValue('Session expired');
      }
      return rejectWithValue('Could not verify your session. Check your connection and log in again.');
    }
  }
);

// NEW: Update Profile Name
export const updateProfileName = createAsyncThunk<string, string, AuthThunkConfig>(
  'auth/updateProfile',
  async (name: string, { rejectWithValue }) => {
    try {
      // Calls PUT /api/users (Matches UserController.cs)
      await apiClient.put('/users', { name });
      return name;
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error : null;
      return rejectWithValue(typeof message === 'string' ? message : 'Update failed');
    }
  }
);

// --- Slice ---

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => { state.error = null; },
    sessionExpired: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.error = null;
    },
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
    builder.addCase(restoreSession.rejected, (state, action) => {
      const isExplicitAuthFailure = action.payload === 'Session expired' || action.payload === 'No session';
      if (isExplicitAuthFailure) {
        state.isAuthenticated = false;
        state.user = null;
      }
      state.isLoading = false;
      state.error = null;
    });

    // Update Profile
    builder.addCase(updateProfileName.fulfilled, (state, action) => {
        if (state.user) {
            state.user.name = action.payload;
        }
    });
  },
});

export const { clearError, sessionExpired } = authSlice.actions;
export default authSlice.reducer;
