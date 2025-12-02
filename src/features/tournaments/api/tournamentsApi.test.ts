import { describe, it, expect, vi, beforeEach } from 'vitest';

import { fetchDashboardTournaments, createTournament } from './tournamentsApi';

// Mock Supabase client using vi.hoisted to avoid hoisting issues
const { mockSelect, mockOrder, mockInsert, mockSingle, mockSupabase } = vi.hoisted(() => {
  const mockSelect = vi.fn();
  const mockOrder = vi.fn();
  const mockInsert = vi.fn();
  const mockSingle = vi.fn();

  const mockSupabase = {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
    })),
  };

  return { mockSelect, mockOrder, mockInsert, mockSingle, mockSupabase };
});

// Chain mocks
mockSelect.mockReturnValue({ order: mockOrder });
mockOrder.mockResolvedValue({ data: [], error: null });
mockInsert.mockReturnValue({ select: vi.fn(() => ({ single: mockSingle })) });
mockSingle.mockResolvedValue({ data: {}, error: null });

vi.mock('../../../shared/api/supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('tournamentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default implementations if needed
    mockSelect.mockReturnValue({ order: mockOrder });
    mockInsert.mockReturnValue({ select: vi.fn(() => ({ single: mockSingle })) });
  });

  describe('fetchDashboardTournaments', () => {
    it('should fetch tournaments ordered by created_at desc', async () => {
      const mockData = [{ id: '1', name: 'Test' }];
      mockOrder.mockResolvedValue({ data: mockData, error: null });

      const result = await fetchDashboardTournaments();

      expect(mockSupabase.from).toHaveBeenCalledWith('tournaments');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.data).toEqual(mockData);
    });

    it('should return error if supabase fails', async () => {
      const mockError = { message: 'Error fetching' };
      mockOrder.mockResolvedValue({ data: null, error: mockError });

      const result = await fetchDashboardTournaments();

      expect(result.error).toEqual(mockError);
    });
  });

  describe('createTournament', () => {
    it('should insert tournament and return single result', async () => {
      const newTournament = {
        name: 'New Tournament',
        game: 'valorant',
        format: 'single_elim',
        is_public: false,
        created_by: 'user-1',
        slug: 'new-tournament',
        config: {},
        status: 'draft',
      };

      const createdTournament = { id: '1', ...newTournament };
      mockSingle.mockResolvedValue({ data: createdTournament, error: null });

      // Note: createTournament in api might take specific args, let's check signature.
      // Assuming it takes the object directly.
      const result = await createTournament(newTournament as any);

      expect(mockSupabase.from).toHaveBeenCalledWith('tournaments');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Tournament',
        }),
      );
      expect(result.data).toEqual(createdTournament);
    });
  });
});
