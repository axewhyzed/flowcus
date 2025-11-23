// src/redux/slices/tasks.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export interface Task {
  taskId: number;
  title: string;
  description?: string;
  priority?: number;
  isDeleted: boolean;
  taskCategoryId: number; // <--- ADD THIS
  taskSubtypeId?: number | null; // Optional: Add this too for future safety
}

interface TasksState {
  list: Task[];
  isLoading: boolean;
  error: string | null;
}

const initialState: TasksState = {
  list: [],
  isLoading: false,
  error: null,
};

// --- Thunks ---

export const fetchTasks = createAsyncThunk('tasks/fetchAll', async () => {
  const response = await apiClient.get('/tasks');
  return response.data;
});

export const createTask = createAsyncThunk('tasks/create', async (taskData: Partial<Task>) => {
  const response = await apiClient.post('/tasks', taskData);
  return { ...taskData, taskId: response.data.id } as Task; // Optimistic return
});

export const toggleTaskComplete = createAsyncThunk('tasks/toggle', async (task: Task) => {
   // Assuming you might have a dedicated endpoint or use Update
   // For now, let's assume we just mark it deleted or handle status locally?
   // Since your Model has 'IsDeleted', let's use that for "checking off" for now
   const updatedTask = { ...task, isDeleted: !task.isDeleted };
   await apiClient.put(`/tasks/${task.taskId}`, updatedTask);
   return updatedTask;
});

// --- Slice ---

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch tasks';
      })
      // Create
      .addCase(createTask.fulfilled, (state, action) => {
        state.list.push(action.payload);
      })
      // Toggle/Update
      .addCase(toggleTaskComplete.fulfilled, (state, action) => {
        const index = state.list.findIndex(t => t.taskId === action.payload.taskId);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      });
  },
});

export default tasksSlice.reducer;