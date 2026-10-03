/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AGENTSAM_INGEST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
