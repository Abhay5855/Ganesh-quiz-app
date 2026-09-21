/**
 * Lightweight helpers — Supabase client is untyped at the DB generic layer
 * for MVP speed; domain types live in game.ts / questions.ts.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
