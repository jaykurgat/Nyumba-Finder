declare module 'playwright-core' {
  export const chromium: {
    connect(endpoint: string, options?: unknown): Promise<{
      newContext(options?: unknown): Promise<any>;
      close(): Promise<void>;
    }>;
  };
}
