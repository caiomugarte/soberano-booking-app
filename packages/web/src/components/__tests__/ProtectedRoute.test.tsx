import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach } from 'vitest';
import { ProtectedRoute } from '../admin/ProtectedRoute';
import { useAuthStore } from '../../stores/auth.store';

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: null, isInitialized: false });
  });

  it('unauthenticated (accessToken null) — redirects and hides children', () => {
    useAuthStore.setState({ accessToken: null, isInitialized: false });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <p>secret</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.queryByText('secret')).toBeNull();
  });

  it('authenticated (accessToken set) — renders children', () => {
    useAuthStore.setState({ accessToken: 'tok', isInitialized: true });

    render(
      <MemoryRouter>
        <ProtectedRoute>
          <p>secret</p>
        </ProtectedRoute>
      </MemoryRouter>,
    );

    expect(screen.getByText('secret')).toBeInTheDocument();
  });
});
