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
  const response = await apiClient.get('/task-subtype'); // Calls GetAll()
  return response.data;
});

// Create Subtype
export const createSubtype = createAsyncThunk(
  'subtypes/create',
  async (data: { categoryId: number; name: string }, { rejectWithValue }) => {
    try {
      // Backend expects: { categoryId, name }
      const response = await apiClient.post('/task-subtype', data);
      return { ...data, id: response.data.id } as Subtype;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || 'Failed to create subtype');
    }
  }
);

const subtypesSlice = createSlice({
  name: 'subtypes',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSubtypes.pending, (state) => { state.isLoading = true; })
      .addCase(fetchSubtypes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(createSubtype.fulfilled, (state, action) => {
        state.list.push(action.payload);
      });
  },
});

export default subtypesSlice.reducer;