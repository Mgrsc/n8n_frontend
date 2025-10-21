/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USERS?: string
  readonly VITE_AGENT_1_PASSWORD?: string
  readonly VITE_AGENT_2_PASSWORD?: string
  readonly VITE_AGENT_3_PASSWORD?: string
  readonly VITE_TOPIC_LLM_API_KEY?: string
  // Add more environment variables as needed
  readonly [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
