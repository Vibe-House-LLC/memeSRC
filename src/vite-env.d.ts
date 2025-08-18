/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUBLIC_URL?: string
  readonly [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

