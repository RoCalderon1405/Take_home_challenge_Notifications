import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import type { UserModel } from '../../features/auth/models/user.model';

export interface AuthState {
  user: UserModel | null;
  initialized: boolean;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticatedUser(state, action: PayloadAction<UserModel>) {
      state.user = action.payload;
      state.initialized = true;
    },
    clearAuthenticatedUser(state) {
      state.user = null;
      state.initialized = true;
    },
    markAuthInitialized(state) {
      state.initialized = true;
    },
  },
});

export const {
  clearAuthenticatedUser,
  markAuthInitialized,
  setAuthenticatedUser,
} = authSlice.actions;
export const authReducer = authSlice.reducer;
