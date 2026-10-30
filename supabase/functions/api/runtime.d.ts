// Runtime globals for the independent backend TypeScript check.
declare const Deno: { env: { get(key: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };
