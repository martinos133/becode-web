declare module 'pg' {
  const pg: {
    Client: new (config?: object) => {
      connect(): Promise<void>;
      query(text: string, values?: unknown[]): Promise<{ rows: unknown[] }>;
      end(): Promise<void>;
    };
  };
  export default pg;
}
