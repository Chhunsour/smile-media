import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { createSecureSessionStorage } from './secure-session';

export const sessionStorage = Platform.OS === 'web' ? AsyncStorage : createSecureSessionStorage(SecureStore, AsyncStorage);
