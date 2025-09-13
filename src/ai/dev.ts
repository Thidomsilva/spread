'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/live-parity-comparison.ts';
import '@/ai/flows/get-market-price.ts';
import '@/ai/flows/network-analysis.ts';
import '@/ai/flows/get-exchange-assets.ts';
import '@/ai/flows/manage-assets-db.ts';
