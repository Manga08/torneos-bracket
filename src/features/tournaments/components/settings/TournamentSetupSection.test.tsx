import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TournamentSetupSection } from './TournamentSetupSection';
import type { Tournament, Participant } from '../../../../types/database';

// Mock BracketView to avoid complex rendering
vi.mock('../../components/bracket/BracketView', () => ({
  BracketView: () => <div data-testid="bracket-view-mock">Bracket View</div>
}));

describe('TournamentSetupSection', () => {
  const mockTournament: Tournament = {
    id: '1',
    name: 'Test Tournament',
    status: 'draft',
    format: 'single_elim',
    user_id: 'u1',
    created_by: 'u1',
    config: { has_third_place: false },
    slug: 'test',
    game: 'valorant',
    is_public: false,
    created_at: new Date().toISOString()
  };

  const mockParticipants: Participant[] = [
    { id: 'p1', name: 'Player 1', tournament_id: '1', created_at: new Date().toISOString(), seed: 1 }
  ];

  const defaultProps = {
    tournament: mockTournament,
    participants: mockParticipants,
    themeId: 'default',
    newParticipantName: '',
    addingParticipant: false,
    selectedSlot: null,
    isImportModalOpen: false,
    importText: '',
    importing: false,
    onNewParticipantNameChange: vi.fn(),
    onAddParticipant: vi.fn(),
    onSelectSlot: vi.fn(),
    onOpenImportModal: vi.fn(),
    onCloseImportModal: vi.fn(),
    onImportTextChange: vi.fn(),
    onFileUpload: vi.fn(),
    onImportParticipants: vi.fn(),
    onUpdateConfig: vi.fn(),
    onRandomizeSeeds: vi.fn(),
    onSlotClick: vi.fn(),
    onParticipantMove: vi.fn(),
    onDeleteParticipant: vi.fn(),
  };

  it('renders participants list and add form', () => {
    render(<TournamentSetupSection {...defaultProps} />);
    
    // Check for add input
    const input = screen.getByPlaceholderText(/Nombre del participante/i);
    expect(input).toBeInTheDocument();
  });

  it('handles adding a participant', () => {
    const { rerender } = render(<TournamentSetupSection {...defaultProps} />);
    
    const input = screen.getByPlaceholderText(/Nombre del participante/i);
    fireEvent.change(input, { target: { value: 'New Player' } });
    expect(defaultProps.onNewParticipantNameChange).toHaveBeenCalledWith('New Player');

    // Rerender with the new name to enable the button
    rerender(<TournamentSetupSection {...defaultProps} newParticipantName="New Player" />);

    const addButton = screen.getByText(/Añadir/i); // Assuming button text
    fireEvent.click(addButton);
    expect(defaultProps.onAddParticipant).toHaveBeenCalled();
  });

  it('handles third place toggle', () => {
    render(<TournamentSetupSection {...defaultProps} />);
    
    // Look for checkbox. Might need to find by label text.
    // "Incluir 3er Puesto"
    const checkbox = screen.getByLabelText(/Incluir 3er Puesto/i);
    fireEvent.click(checkbox);
    
    expect(defaultProps.onUpdateConfig).toHaveBeenCalledWith(expect.objectContaining({
      has_third_place: true
    }));
  });
});
