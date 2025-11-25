import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentSettingsSection } from './TournamentSettingsSection';
import type { Tournament } from '../../../../types/database';

describe('TournamentSettingsSection', () => {
  const mockTournament: Tournament = {
    id: '1',
    name: 'Old Name',
    status: 'draft',
    format: 'single_elim',
    user_id: 'u1',
    created_by: 'u1',
    config: {},
    slug: 'old-name',
    game: 'valorant',
    is_public: false,
    created_at: new Date().toISOString()
  };

  const defaultProps = {
    tournament: mockTournament,
    themeId: 'default',
    onUpdateTournament: vi.fn(),
    onSaveSettings: vi.fn(),
    onDeleteTournament: vi.fn(),
  };

  it('renders current settings', () => {
    render(<TournamentSettingsSection {...defaultProps} />);
    
    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
  });

  it('handles name change', () => {
    render(<TournamentSettingsSection {...defaultProps} />);
    
    const input = screen.getByDisplayValue('Old Name');
    fireEvent.change(input, { target: { value: 'New Name' } });
    
    expect(defaultProps.onUpdateTournament).toHaveBeenCalledWith(expect.objectContaining({
      name: 'New Name'
    }));
  });

  it('handles save action', () => {
    render(<TournamentSettingsSection {...defaultProps} />);
    
    const saveButton = screen.getByText(/Guardar Cambios/i); // Assuming text
    fireEvent.click(saveButton);
    
    expect(defaultProps.onSaveSettings).toHaveBeenCalled();
  });
});
