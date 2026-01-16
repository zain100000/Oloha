/**
 * User Slice (Super Admin)
 *
 * Manages user-related state and async actions in the Redux store.
 *
 * Super Admin Permissions:
 * - Fetch all users
 *
 * Integrates with a backend API using Axios, with authentication
 * handled via Bearer token stored in localStorage.
 *
 * State Shape:
 * {
 *   users: Array<Object>,
 *   loading: boolean,
 *   error: string | null,
 *   message: string | null
 * }
 */

import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";
import CONFIG from "../config/Config.config";

const { BACKEND_API_URL } = CONFIG;

/**
 * Fetch all users (Super Admin)
 */
export const getUsers = createAsyncThunk(
  "users/getUsers",
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem("authToken");

    if (!token) {
      return rejectWithValue({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      const response = await axios.get(
        `${BACKEND_API_URL}/super-admin/action/get-all-users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { allUsers, message, success } = response.data;

      if (!success) {
        throw new Error(message || "Failed to fetch users");
      }

      return {
        allUsers,
        message,
        success,
      };
    } catch (error) {
      const backendError = error.response?.data;

      return rejectWithValue({
        success: false,
        message:
          backendError?.message || error.message || "Failed to fetch users",
        status: error.response?.status || 0,
      });
    }
  }
);

const userSlice = createSlice({
  name: "users",
  initialState: {
    allUsers: [],
    loading: false,
    error: null,
    message: null,
  },
  reducers: {
    setAllUsers: (state, action) => {
      state.allUsers = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      // Get Users
      .addCase(getUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.message = null;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.allUsers = action.payload.allUsers;
        state.message = action.payload.message;
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message;
        state.message = null;
      });
  },
});

export const { setUsers } = userSlice.actions;

export default userSlice.reducer;
