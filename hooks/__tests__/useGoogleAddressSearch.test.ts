import { AddressFields } from '@/types/generics';
import { act, renderHook } from '@testing-library/react-native';
import { useGoogleSearchAddress } from '../useGoogleAddressSearch';

// Mock fetch globally
global.fetch = jest.fn();

// Mock environment variable
process.env.EXPO_PUBLIC_MAPS_API_KEY = 'test-api-key';

describe('useGoogleSearchAddress', () => {
  let handleChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    handleChange = jest.fn();
    (global.fetch as jest.Mock).mockClear();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useGoogleSearchAddress<AddressFields>(handleChange)
    );

    expect(result.current.addressSearch).toBe('');
    expect(result.current.addressSuggestions).toEqual([]);
    expect(result.current.showAddressSuggestions).toBe(false);
    expect(result.current.searchingAddress).toBe(false);
  });

  describe('searchGoogleAddress', () => {
    it('should update addressSearch and call handleChange when text is provided', async () => {
      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Test Address');
      });

      expect(result.current.addressSearch).toBe('Test Address');
      expect(handleChange).toHaveBeenCalledWith('address', 'Test Address');
    });

    it('should not fetch suggestions when text length is less than 3', async () => {
      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Te');
      });

      expect(result.current.addressSuggestions).toEqual([]);
      expect(result.current.showAddressSuggestions).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should fetch and set address suggestions when text length is 3 or more', async () => {
      const mockPredictions = [
        { description: 'Address 1', place_id: 'place1' },
        { description: 'Address 2', place_id: 'place2' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ predictions: mockPredictions }),
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Test Address');
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('Test Address')
      );
      expect(result.current.addressSuggestions).toEqual(mockPredictions);
      expect(result.current.showAddressSuggestions).toBe(true);
      expect(result.current.searchingAddress).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Test Address');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Address search error:',
        expect.any(Error)
      );
      expect(result.current.searchingAddress).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should set searchingAddress to false after fetching', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ predictions: [] }),
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Test Address');
      });

      expect(result.current.searchingAddress).toBe(false);
    });

    it('should handle empty predictions array', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ predictions: [] }),
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Test Address');
      });

      expect(result.current.addressSuggestions).toEqual([]);
      expect(result.current.showAddressSuggestions).toBe(true);
    });

    it('should handle response without predictions property', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({}),
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.searchGoogleAddress('Test Address');
      });

      expect(result.current.addressSuggestions).toEqual([]);
    });
  });

  describe('selectClientAddress', () => {
    it('should set address from preselected client', async () => {
      const mockClient = {
        id: 'client1',
        address: '123 Main St',
        streetNumber: '123',
        city: 'Test City',
        country: 'Test Country',
      } as any;

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectClientAddress(mockClient);
      });

      expect(result.current.addressSearch).toBe('123 Main St');
      expect(handleChange).toHaveBeenCalledWith('address', '123 Main St');
      expect(handleChange).toHaveBeenCalledWith('streetNumber', '123');
      expect(handleChange).toHaveBeenCalledWith('city', 'Test City');
      expect(handleChange).toHaveBeenCalledWith('country', 'Test Country');
    });

    it('should handle client without address', async () => {
      const mockClient = {
        id: 'client1',
      } as any;

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectClientAddress(mockClient);
      });

      expect(handleChange).not.toHaveBeenCalled();
    });

    it('should only set fields that exist on client', async () => {
      const mockClient = {
        id: 'client1',
        address: '123 Main St',
        city: 'Test City',
        // No streetNumber or country
      } as any;

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectClientAddress(mockClient);
      });

      expect(handleChange).toHaveBeenCalledWith('address', '123 Main St');
      expect(handleChange).toHaveBeenCalledWith('city', 'Test City');
      expect(handleChange).not.toHaveBeenCalledWith(
        'streetNumber',
        expect.anything()
      );
      expect(handleChange).not.toHaveBeenCalledWith(
        'country',
        expect.anything()
      );
    });
  });

  describe('selectAddress', () => {
    it('should set address and fetch place details', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      const mockPlaceDetails = {
        result: {
          address_components: [
            {
              long_name: 'Main Street',
              types: ['route'],
            },
            {
              long_name: '123',
              types: ['street_number'],
            },
            {
              long_name: 'Test City',
              types: ['locality'],
            },
            {
              long_name: 'Test Country',
              types: ['country'],
            },
          ],
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: async () => mockPlaceDetails,
        });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(result.current.addressSearch).toBe('Test Address');
      expect(result.current.showAddressSuggestions).toBe(false);
      expect(handleChange).toHaveBeenCalledWith('address', 'Test Address');
      expect(handleChange).toHaveBeenCalledWith('streetNumber', 'Main Street 123');
      expect(handleChange).toHaveBeenCalledWith('city', 'Test City');
      expect(handleChange).toHaveBeenCalledWith('country', 'Test Country');
    });

    it('should handle place details fetch error', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch Error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching place details:',
        expect.any(Error)
      );
      expect(result.current.addressSearch).toBe('Test Address');
      expect(result.current.showAddressSuggestions).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should handle place details without address_components', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => ({ result: {} }),
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(result.current.addressSearch).toBe('Test Address');
      expect(handleChange).toHaveBeenCalledWith('address', 'Test Address');
    });

    it('should parse address components correctly with route and street_number', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      const mockPlaceDetails = {
        result: {
          address_components: [
            {
              long_name: 'Main Street',
              types: ['route'],
            },
            {
              long_name: '123',
              types: ['street_number'],
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPlaceDetails,
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(handleChange).toHaveBeenCalledWith('streetNumber', 'Main Street 123');
    });

    it('should parse address components with only route', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      const mockPlaceDetails = {
        result: {
          address_components: [
            {
              long_name: 'Main Street',
              types: ['route'],
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPlaceDetails,
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(handleChange).toHaveBeenCalledWith('streetNumber', 'Main Street');
    });

    it('should parse address components with only street_number', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      const mockPlaceDetails = {
        result: {
          address_components: [
            {
              long_name: '123',
              types: ['street_number'],
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPlaceDetails,
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(handleChange).toHaveBeenCalledWith('streetNumber', '123');
    });

    it('should handle sublocality as city', async () => {
      const mockSuggestion = {
        description: 'Test Address',
        place_id: 'test-place-id',
      };

      const mockPlaceDetails = {
        result: {
          address_components: [
            {
              long_name: 'Sub City',
              types: ['sublocality'],
            },
          ],
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: async () => mockPlaceDetails,
      });

      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      await act(async () => {
        await result.current.selectAddress(mockSuggestion);
      });

      expect(handleChange).toHaveBeenCalledWith('city', 'Sub City');
    });
  });

  describe('setShowAddressSuggestions', () => {
    it('should update showAddressSuggestions state', () => {
      const { result } = renderHook(() =>
        useGoogleSearchAddress<AddressFields>(handleChange)
      );

      act(() => {
        result.current.setShowAddressSuggestions(true);
      });

      expect(result.current.showAddressSuggestions).toBe(true);

      act(() => {
        result.current.setShowAddressSuggestions(false);
      });

      expect(result.current.showAddressSuggestions).toBe(false);
    });
  });
});
