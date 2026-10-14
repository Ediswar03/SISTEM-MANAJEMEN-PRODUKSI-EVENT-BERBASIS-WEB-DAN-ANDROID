'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, setTokens, clearTokens, getAccessToken, ApiError } from '../lib/api-client.js';
import type { UserInfo } from '../lib/api-client.js';

interface FormState {
  email: string;
  password: string;
  error: string;
  loading: boolean;
}

export default function LoginPage() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({
    email: '',
    password: '',
    error: '',
    loading: false,
  });

  // Redirect if already logged in
  useEffect(() => {
    if (getAccessToken()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState((s) => ({ ...s, loading: true, error: '' }));

    try {
      const res = await api.login(state.email, state.password);
      setTokens(res.data.accessToken, res.data.refreshToken);
      router.replace('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Login failed. Please try again.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <h1>EPMS</h1>
          <p>Event Production Management System</p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="form-input"
                placeholder="admin@epms.local"
                value={state.email}
                onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={state.password}
                onChange={(e) => setState((s) => ({ ...s, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>

            {state.error && (
              <div
                style={{
                  background: 'var(--danger)15',
                  border: '1px solid var(--danger)40',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '13px',
                  color: '#f87171',
                }}
              >
                {state.error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={state.loading}
              style={{ width: '100%', justifyContent: 'center', padding: '11px 16px', marginTop: '4px' }}
            >
              {state.loading ? (
                <>
                  <div className="spinner" style={{ width: '16px', height: '16px' }} />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          EPMS © 2026 — Restricted Access
        </p>
      </div>
    </div>
  );
}
