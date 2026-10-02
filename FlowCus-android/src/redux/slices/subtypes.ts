// src/redux/slices/subtypes.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export interface Subtype {
  id: number;
  categoryId: number;
  name: string;
  colorHex?: string;
}

interface SubtypesState {
  list: Subtype[];
  isLoading: boolean;
  error: string | null;
}

const initialState: SubtypesState = {
  list: [],
  isLoading: false,
  error: null,
};

// Fetch All Subtypes
export const fetchSubtypes = createAsyncThunk('subtypes/fetchAll', async () => {
  const response = await apiClient.get('/task-subtype');
  return response.data;
});

// Create Subtype
export const createSubtype = createAsyncThunk(
  'subtypes/create',
  async (data: { categoryId: number; name: string }, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/task-subtype', data);
      return { ...data, id: response.data.id } as Subtype;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to create subtype (Max 5 per user)';
      return rejectWithValue(msg);
    }
  }
);

// Delete Subtype
export const deleteSubtype = createAsyncThunk(
  'subtypes/delete',
  async (id: number, { rejectWithValue }) => {
    try {
      await apiClient.delete(`/task-subtype/${id}`);
      return id;
    } catch (error: any) {
      const msg = error.response?.data?.message || error.response?.data?.error || 'Failed to delete subtype';
      return rejectWithValue(msg);
    }
  }
);

const subtypesSlice = createSlice({
  name: 'subtypes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubtypes.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(fetchSubtypes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchSubtypes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch subtypes';
      })
      .addCase(createSubtype.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      .addCase(deleteSubtype.fulfilled, (state, action) => {
        state.list = state.list.filter(s => s.id !== action.payload);
      });
  },
});

export default subtypesSlice.reducer;