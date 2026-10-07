import { demoAI } from '@/services/ai/demo';
import { demoAuth } from '@/services/auth/demo';
import { demoDatabase } from '@/services/database/demo';
import { demoPublishing } from '@/services/publishing/demo';
import { demoScheduling } from '@/services/scheduling/demo';
import { demoStorage } from '@/services/storage/demo';
import { supabaseServices } from '@/services/supabase';
import type { Services } from '@/services/types';

import { APP_MODE } from './app';

/** Which implementation backs each service. Swap one line to plug in another backend. */
export const providers: Services =
  APP_MODE === 'live'
    ? supabaseServices
    : { auth: demoAuth, database: demoDatabase, storage: demoStorage, ai: demoAI, publishing: demoPublishing, scheduling: demoScheduling };
