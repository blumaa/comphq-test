/// <reference types="vite/client" />

// The variables the browser build needs. Typed here so a missing one is a
// compile error rather than an undefined at runtime.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Optional: where the Edge Functions answer, when that is not the project
   *  itself. Set to a `supabase functions serve` port for local development. */
  readonly VITE_FUNCTIONS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
