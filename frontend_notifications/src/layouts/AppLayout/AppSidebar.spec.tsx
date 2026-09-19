import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { AppSidebar } from './AppSidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('AppSidebar navigation', () => {
  it.each([
    ['/dashboard', 'nav.dashboard'],
    ['/notifications/new', 'nav.create'],
    ['/notifications', 'nav.notifications'],
    ['/notifications/example-id', 'nav.notifications'],
    ['/notifications/example-id/edit', 'nav.notifications'],
  ])('selects only the corresponding entry at %s', (path, label) => {
    const { container } = render(
      <MemoryRouter initialEntries={[path]}>
        <AppSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: label })).toHaveClass('Mui-selected');
    expect(container.querySelectorAll('.Mui-selected')).toHaveLength(1);
  });
});
