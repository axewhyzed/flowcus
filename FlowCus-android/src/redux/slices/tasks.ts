// src/redux/slices/tasks.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../../services/apiClient';

export interface Task {
  taskId: number;
  title: string;
  description?: string;
  priority?: number;
  isCompleted?: boolean;
  isDeleted: boolean;
  taskCategoryId: number;
  taskSubtypeId?: number | null;
  startTime?: string;
  endTime?: string;
  createdOn?: string;
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
  return { ...taskData, taskId: response.data.id, isCompleted: false, isDeleted: false } as Task;
});

export const toggleTaskComplete = createAsyncThunk('tasks/toggle', async (task: Task) => {
  const newStatus = !task.isCompleted;
  await apiClient.patch(`/tasks/${task.taskId}/toggle-complete`, { isCompleted: newStatus });
  return { ...task, isCompleted: newStatus };
});

export const deleteTask = createAsyncThunk('tasks/delete', async (taskId: number) => {
  await apiClient.delete(`/tasks/${taskId}`);
  return taskId;
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
        state.list.unshift(action.payload);
      })
      // Toggle
      .addCase(toggleTaskComplete.fulfilled, (state, action) => {
        const index = state.list.findIndex(t => t.taskId === action.payload.taskId);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
      })
      // Delete
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.list = state.list.filter(t => t.taskId !== action.payload);
      });
  },
});

export default tasksSlice.reducer;