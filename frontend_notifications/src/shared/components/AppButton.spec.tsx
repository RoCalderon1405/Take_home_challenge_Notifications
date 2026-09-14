import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppButton } from './AppButton';

describe('AppButton', () => {
  it('disables the button while loading', () => {
    render(<AppButton loading>Save</AppButton>);

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
