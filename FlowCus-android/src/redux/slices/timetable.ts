// src/redux/slices/timetable.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export interface TimetableItem {
  id: number;
  timetableId: number;
  taskCategoryId: number;
  taskSubtypeId?: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  taskName?: string; // Computed from backend
  colorHex?: string; // Computed from backend
  isDeleted: boolean; // <--- ADDED THIS FIELD
}

export interface Timetable {
  id: number;
  name: string;
  isDefault: boolean;
  isActive: boolean;
}

interface TimetableState {
  timetables: Timetable[];
  activeTimetableId: number | null;
  items: TimetableItem[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TimetableState = {
  timetables: [],
  activeTimetableId: null,
  items: [],
  isLoading: false,
  error: null,
};

// --- Thunks ---

export const fetchTimetables = createAsyncThunk('timetable/fetchAll', async () => {
  const response = await apiClient.get('/timetable');
  return response.data;
});

export const fetchTimetableItems = createAsyncThunk('timetable/fetchItems', async (timetableId: number) => {
  const response = await apiClient.get(`/timetable/${timetableId}/items`);
  return response.data;
});

export const createTimetableItem = createAsyncThunk('timetable/createItem', async (item: Partial<TimetableItem>) => {
  const response = await apiClient.post('/timetable/items', item);
  return { ...item, id: response.data.id } as TimetableItem;
});

export const deleteTimetableItem = createAsyncThunk('timetable/deleteItem', async (id: number) => {
  await apiClient.delete(`/timetable/items/${id}`);
  return id;
});

// --- Slice ---

const timetableSlice = createSlice({
  name: 'timetable',
  initialState,
  reducers: {
    setActiveTimetable: (state, action) => {
      state.activeTimetableId = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchTimetables.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTimetables.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetables = action.payload;
        // Auto-select active one
        const active = action.payload.find((t: Timetable) => t.isActive);
        if (active) state.activeTimetableId = active.id;
        else if (action.payload.length > 0) state.activeTimetableId = action.payload[0].id;
      })
      // Fetch Items
      .addCase(fetchTimetableItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTimetableItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      // Create Item
      .addCase(createTimetableItem.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      // Delete Item
      .addCase(deleteTimetableItem.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  },
});

export const { setActiveTimetable } = timetableSlice.actions;
export default timetableSlice.reducer;