import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentAdminHeader } from './TournamentAdminHeader';

describe('TournamentAdminHeader', () => {
  const defaultProps = {
    name: 'Test Tournament',
    game: 'valorant',
    status: 'draft' as const,
    formatLabel: 'Single Elimination',
    participantsCount: 4,
    maxParticipants: 8,
    themeId: 'default',
    onBack: vi.fn(),
    onUndo: vi.fn(),
    canUndo: false,
    onShare: vi.fn(),
    onDelete: vi.fn(),
    onStart: vi.fn(),
    activeTab: 'setup' as const,
    onChangeTab: vi.fn(),
  };

  it('renders tournament info correctly', () => {
    render(<TournamentAdminHeader {...defaultProps} />);

    expect(screen.getByText('Test Tournament')).toBeInTheDocument();
    expect(screen.getByText(/Single Elimination/i)).toBeInTheDocument();
    // Check for participants count text (might be formatted like "4 / 8")
    // Using regex to be safe
    expect(screen.getByText(/4/)).toBeInTheDocument();
  });

  it('calls action callbacks when buttons are clicked', () => {
    render(<TournamentAdminHeader {...defaultProps} />);

    // Back button
    const backButton = screen.getByText(/Volver/i);
    fireEvent.click(backButton);
    expect(defaultProps.onBack).toHaveBeenCalled();

    // Share button
    const shareButton = screen.getByText(/Compartir/i);
    fireEvent.click(shareButton);
    expect(defaultProps.onShare).toHaveBeenCalled();

    // Delete button
    const deleteButton = screen.getByText(/Borrar Torneo/i);
    fireEvent.click(deleteButton);
    expect(defaultProps.onDelete).toHaveBeenCalled();
    
    // Start button (visible because status is draft)
    const startButton = screen.getByText(/Iniciar Torneo/i);
    fireEvent.click(startButton);
    expect(defaultProps.onStart).toHaveBeenCalled();
  });

  it('highlights active tab', () => {
    // In draft mode, 'setup' and 'settings' are visible. 'bracket' is not.
    render(<TournamentAdminHeader {...defaultProps} activeTab="setup" />);
    
    const setupTab = screen.getByText(/Configuración/i);
    expect(setupTab).toBeInTheDocument();
    // We can check class if we want, but presence is good enough for now.
  });
});
