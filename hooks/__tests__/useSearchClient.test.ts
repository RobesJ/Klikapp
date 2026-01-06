
import { supabase } from '@/lib/supabase';
import { Client, ClientField } from '@/types/generics';
import { act, renderHook } from '@testing-library/react-native';
import { useSearchClient } from '../useSearchClient';


jest.useFakeTimers();

jest.mock('@/lib/supabase', () => {
  const queryBuilder = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn(),
  };

  return {
    supabase: {
      from: jest.fn(() => queryBuilder),
    },
  };
});

const flushAsync = async () => {
  await act(async () => {
    jest.runAllTimers();
    await Promise.resolve();
  });
};


describe('useSearchClient', () => {
  let handleChange: jest.Mock;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();
    handleChange = jest.fn();

    // Setup mock query builder chain
    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useSearchClient<ClientField>(handleChange)
    );

    expect(result.current.clientSuggestions).toEqual([]);
    expect(result.current.loadingClients).toBe(false);
    expect(result.current.searchQuery).toBe('');
    expect(result.current.selectedClient).toBeNull();
  });

  describe('handleSearchClient', () => {
    it('should update searchQuery immediately', () => {
      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.handleSearchClient('test query');
      });

      expect(result.current.searchQuery).toBe('test query');
    });

    it('should debounce searchClient call by 300ms', () => {
      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.handleSearchClient('test');
      });

      // Should not call searchClient immediately
      expect(supabase.from).not.toHaveBeenCalled();

      // Fast-forward 299ms - still shouldn't call
      act(() => {
        jest.advanceTimersByTime(299);
      });
      expect(supabase.from).not.toHaveBeenCalled();

      // Fast-forward 1ms more - should call now
      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(supabase.from).toHaveBeenCalledWith('clients');
    });

    it('should clear previous timer when new search is triggered', () => {
      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.handleSearchClient('first');
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      act(() => {
        result.current.handleSearchClient('second');
      });

      act(() => {
        jest.advanceTimersByTime(200);
      });

      // First search should not have been executed
      expect(supabase.from).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Now second search should execute (only once)
      expect(supabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('searchClient', () => {
    it('should not search when query is less than 2 characters', async () => {
      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      await act(async () => {
        await result.current.searchClient('a');
      });

      expect(supabase.from).not.toHaveBeenCalled();
      expect(result.current.clientSuggestions).toEqual([]);
    });

    it('should not search when query is only whitespace', async () => {
      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      await act(async () => {
        await result.current.searchClient('  ');
      });

      expect(supabase.from).not.toHaveBeenCalled();
      expect(result.current.clientSuggestions).toEqual([]);
    });

    it('should fetch clients when query is 2 or more characters', async () => {
      const mockClients: Client[] = [
        { id: '1', name: 'Client 1', phone: '123' } as Client,
        { id: '2', name: 'Client 2', phone: '456' } as Client,
      ];

      mockQueryBuilder.limit.mockResolvedValueOnce({
        data: mockClients,
        error: null,
      });

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      await act(async () => {
        await result.current.searchClient('test');
      });

      expect(supabase.from).toHaveBeenCalledWith('clients');
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
      expect(mockQueryBuilder.or).toHaveBeenCalledWith(
        'name.ilike.%test%,phone.ilike.%test%'
      );
      expect(mockQueryBuilder.order).toHaveBeenCalledWith('name');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(20);
      expect(result.current.clientSuggestions).toEqual(mockClients);
      expect(result.current.loadingClients).toBe(false);
    });

    it('should set loading state during search', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockQueryBuilder.limit.mockReturnValueOnce(promise);

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.searchClient('test');
      });

      // Should be loading
      expect(result.current.loadingClients).toBe(true);

      await act(async () => {
        resolvePromise!({ data: [], error: null });
        await promise;
      });

      expect(result.current.loadingClients).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      const mockError = { message: 'Database error' };
      mockQueryBuilder.limit.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      await act(async () => {
        await result.current.searchClient('test');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith('Chyba: ', 'Database error');
      expect(result.current.clientSuggestions).toEqual([]);
      expect(result.current.loadingClients).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle null data from API', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      await act(async () => {
        await result.current.searchClient('test');
      });

      expect(result.current.clientSuggestions).toEqual([]);
    });

    it('should handle empty results', async () => {
      mockQueryBuilder.limit.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      await act(async () => {
        await result.current.searchClient('test');
      });

      expect(result.current.clientSuggestions).toEqual([]);
    });
  });

  describe('handleSelectedClient', () => {
    it('should update selectedClient and searchQuery', () => {
      const mockClient: Client = {
        id: '1',
        name: 'Test Client',
        phone: '123',
      } as Client;

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.handleSelectedClient(mockClient);
      });

      expect(result.current.selectedClient).toEqual(mockClient);
      expect(result.current.searchQuery).toBe('Test Client');
      expect(result.current.clientSuggestions).toEqual([]);
      expect(handleChange).toHaveBeenCalledWith('client_id', '1');
    });

    it('should clear client suggestions when client is selected', () => {
      const mockClient: Client = {
        id: '1',
        name: 'Test Client',
      } as Client;

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      // Set some suggestions first
      act(() => {
        result.current.setSearchQuery('test');
      });

      act(() => {
        result.current.handleSelectedClient(mockClient);
      });

      expect(result.current.clientSuggestions).toEqual([]);
    });
  });

  describe('setSelectedClient', () => {
    it('should update selectedClient state', () => {
      const mockClient: Client = {
        id: '1',
        name: 'Test Client',
      } as Client;

      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.setSelectedClient(mockClient);
      });

      expect(result.current.selectedClient).toEqual(mockClient);

      act(() => {
        result.current.setSelectedClient(null);
      });

      expect(result.current.selectedClient).toBeNull();
    });
  });

  describe('setSearchQuery', () => {
    it('should update searchQuery state', () => {
      const { result } = renderHook(() =>
        useSearchClient<ClientField>(handleChange)
      );

      act(() => {
        result.current.setSearchQuery('new query');
      });

      expect(result.current.searchQuery).toBe('new query');
    });
  });
});