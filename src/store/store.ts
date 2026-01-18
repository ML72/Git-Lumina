import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from 'redux';
import storage from 'redux-persist/lib/storage';
import { 
  persistReducer, 
  persistStore,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';

import { uiSlice } from "./slices/ui";
import { graphSlice } from "./slices/graph";

const combinedReducer = combineReducers({
    [uiSlice.name]: uiSlice.reducer,
    [graphSlice.name]: graphSlice.reducer
});

const persistConfig = {
  key: 'git-lumina-root',
  whitelist: ['graph'],
  storage
}
const persistedReducer = persistReducer(persistConfig, combinedReducer);

export const store = configureStore({
  reducer: persistedReducer,
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);