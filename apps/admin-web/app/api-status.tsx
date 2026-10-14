'use client';

import { useEffect, useState } from 'react';

type HealthPayload = {
  data?: {
    status: string;
    database?: { connected: boolean; engine: string | null; version: string | null };
  };
};

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ok'; engine: string | null; version: string | null }
  | { kind: 'error'; message: string };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export function ApiStatus() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/health`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API returned HTTP ${response.status}`);
        }
        return (await response.json()) as HealthPayload;
      })
      .then((payload) => {
        const database = payload.data?.database;
        if (!database?.connected) {
          setState({
            kind: 'error',
            message: 'API merespons, tetapi ping MySQL gagal.',
          });
          return;
        }
        setState({ kind: 'ok', engine: database.engine ?? null, version: database.version ?? null });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setState({
          kind: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'API tidak dapat dihubungi. Jalankan layanan backend terlebih dahulu.',
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Status koneksi API</h2>
      {state.kind === 'loading' ? (
        <p className="mt-2 text-sm text-slate-500">Memeriksa {API_URL}/health …</p>
      ) : null}
      {state.kind === 'ok' ? (
        <p className="mt-2 text-sm text-emerald-800">
          Terhubung ke API. Database {state.engine ?? 'unknown'} {state.version ?? ''}.
        </p>
      ) : null}
      {state.kind === 'error' ? (
        <p className="mt-2 text-sm text-red-800">{state.message}</p>
      ) : null}
    </section>
  );
}
