import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistConfig } from 'redux-persist';
import { RootState } from './rootReducer';

export const persistConfig: PersistConfig<RootState> = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user', 'medications', 'reminders', 'family', 'settings', 'wellness', 'achievements'],
  version: 2,
};
