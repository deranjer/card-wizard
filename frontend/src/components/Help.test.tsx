import { render, screen } from '@testing-library/react';
import { Help } from './Help';
import { MantineProvider } from '@mantine/core';
import { describe, it, expect } from 'vitest';

// Wrap component with MantineProvider
const renderWithMantine = (component: React.ReactNode) => {
  return render(
    <MantineProvider>
      {component}
    </MantineProvider>
  );
};

describe('Help Component', () => {
  it('renders the main title', () => {
    renderWithMantine(<Help />);
    expect(screen.getByText('Card Wizard Help')).toBeInTheDocument();
  });

  it('renders section titles', () => {
    renderWithMantine(<Help />);
    expect(screen.getByText('Deck Details')).toBeInTheDocument();
    expect(screen.getByText('Card Design')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Print')).toBeInTheDocument();
  });

  it('renders quick start guide', () => {
    renderWithMantine(<Help />);
    expect(screen.getByText('Quick Start Guide')).toBeInTheDocument();
    expect(screen.getByText('Creating Your First Deck')).toBeInTheDocument();
  });
});
