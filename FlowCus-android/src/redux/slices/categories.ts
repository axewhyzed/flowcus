// src/redux/slices/categories.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export interface Category {
  id: number;
  name: string;
}

interface CategoriesState {
  list: Category[];
  isLoading: boolean;
}

const initialState: CategoriesState = {
  list: [],
  isLoading: false,
};

export const fetchCategories = createAsyncThunk(
  'categories/fetchAll',
  async () => {
    // FIX: Changed '/task-categories' to '/task-category' to match Controller
    const response = await apiClient.get('/task-category'); 
    return response.data;
  }
);

const categoriesSlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchCategories.rejected, (state) => {
        state.isLoading = false;
        // Optional: handle error state here
      });
  },
});

export default categoriesSlice.reducer;