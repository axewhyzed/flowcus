// src/redux/slices/timetable.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export interface TimetableItem {
  id: number;
  timetableId: number;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  dayOfWeek: number; // 0=Sunday, 1=Monday...
  startTime: string; // "HH:mm:ss"
  endTime: string;   // "HH:mm:ss"
  specificDate?: string | null; // Local date-only value for a one-off block.
  taskName?: string; // Computed from backend
  title?: string;
  categoryName?: string;
  subtypeName?: string;
  colorHex?: string; // Computed from backend
  isDeleted: boolean;
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
  isLoading: true,
  error: null,
};

// --- Thunks ---

export const fetchTimetables = createAsyncThunk('timetable/fetchAll', async () => {
  const response = await apiClient.get<Timetable[]>('/timetable');
  return response.data;
});

export const fetchTimetableItems = createAsyncThunk('timetable/fetchItems', async (timetableId: number) => {
  const response = await apiClient.get<TimetableItem[]>(`/timetable/${timetableId}/items`);
  return response.data;
});

export const createTimetableItem = createAsyncThunk('timetable/createItem', async (item: Partial<TimetableItem>) => {
  const response = await apiClient.post<{ id: number }>('/timetable/items', item);
  return { ...item, id: response.data.id } as TimetableItem;
});

export const updateTimetableItem = createAsyncThunk(
  'timetable/updateItem',
  async ({ id, item }: { id: number; item: Partial<TimetableItem> }) => {
    await apiClient.put(`/timetable/items/${id}`, item);
    return { ...item, id } as TimetableItem;
  },
);

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
        state.error = null;
      })
      .addCase(fetchTimetables.fulfilled, (state, action) => {
        state.isLoading = false;
        state.timetables = action.payload;
        const active = action.payload.find((t: Timetable) => t.isActive);
        state.activeTimetableId = active?.id ?? null;
        if (!active) state.items = [];
      })
      .addCase(fetchTimetables.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load schedules';
      })
      // Fetch Items
      .addCase(fetchTimetableItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTimetableItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload;
      })
      .addCase(fetchTimetableItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load schedule blocks';
      })
      // Create Item
      .addCase(createTimetableItem.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(updateTimetableItem.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) state.items[index] = { ...state.items[index], ...action.payload };
      })
      // Delete Item
      .addCase(deleteTimetableItem.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload);
      });
  },
});

export const { setActiveTimetable } = timetableSlice.actions;
export default timetableSlice.reducer;
