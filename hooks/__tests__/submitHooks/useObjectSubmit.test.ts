import { useObjectSubmit } from "@/hooks/submitHooks/useObjectSubmit";
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/store/notificationStore';
import { ChimneyInput, Object as ObjectType, ObjectWithRelations } from '@/types/objectSpecific';
import { act, renderHook } from '@testing-library/react-native';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/store/notificationStore');

describe('useObjectSubmit', () => {
  let mockQueryBuilder: any;
  let mockNotificationStore: any;
  let mockInitialData: ObjectWithRelations;
  let mockFormData: Omit<ObjectType, 'id'>;
  let mockChimneys: ChimneyInput[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockInitialData = {
      object: {
        id: 'object1',
        client_id: 'client1',
        address: 'Test Address',
        streetNumber: '123',
        city: 'Test City',
        country: 'Test Country',
      },
      client: { id: 'client1' } as any,
      chimneys: [],
    };

    mockFormData = {
      client_id: 'client1',
      address: 'New Address',
      streetNumber: '456',
      city: 'New City',
      country: 'New Country',
    };

    mockChimneys = [
      {
        chimney_type_id: 'type1',
        placement: 'Kitchen',
        appliance: 'Boiler',
        note: 'Test note',
      },
    ];

    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);

    mockNotificationStore = {
      addNotification: jest.fn(),
    };

    (useNotificationStore.getState as jest.Mock) = jest.fn(
      () => mockNotificationStore
    );
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useObjectSubmit({ mode: 'create' })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.handleSubmit).toBeDefined();
  });

  describe('handleSubmit - create mode', () => {
    it('should create object successfully', async () => {
      const mockCreatedObject = {
        id: 'new-object-id',
        ...mockFormData,
      };

      const mockCompleteObject: ObjectWithRelations = {
        object: mockCreatedObject as ObjectType,
        client: { id: 'client1' } as any,
        chimneys: [],
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedObject, error: null }) // insert
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        }); // fetchCompleteObject

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useObjectSubmit({
          mode: 'create',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(supabase.from).toHaveBeenCalledWith('objects');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith([mockFormData]);
      expect(mockQueryBuilder.single).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          object: expect.objectContaining({ id: 'new-object-id' }),
        })
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Objekt bol úspešne vytvorený',
        'success',
        3000
      );
      expect(result.current.loading).toBe(false);
    });

    it('should save chimneys when creating object', async () => {
      const mockCreatedObject = {
        id: 'new-object-id',
        ...mockFormData,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedObject, error: null }) // insert
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        }); // fetchCompleteObject

      const { result } = renderHook(() =>
        useObjectSubmit({ mode: 'create' })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(supabase.from).toHaveBeenCalledWith('chimneys');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            object_id: 'new-object-id',
            chimney_type_id: 'type1',
            placement: 'Kitchen',
            appliance: 'Boiler',
            note: 'Test note',
          }),
        ])
      );
    });

    it('should not save chimneys when empty array', async () => {
      const mockCreatedObject = {
        id: 'new-object-id',
        ...mockFormData,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedObject, error: null }) // insert
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        }); // fetchCompleteObject

      const { result } = renderHook(() =>
        useObjectSubmit({ mode: 'create' })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, []);
      });

      // Should not call insert for chimneys when empty
      const chimneyCalls = (supabase.from as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'chimneys'
      );
      expect(chimneyCalls.length).toBe(0);
    });

    it('should handle create errors', async () => {
      const mockError = { message: 'Create error' };
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const { result } = renderHook(() =>
        useObjectSubmit({ mode: 'create' })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving object: ',
        mockError
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa vytvoriť objekt',
        'error',
        4000
      );
      expect(result.current.loading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleSubmit - edit mode', () => {
    it('should update object successfully', async () => {
      const mockUpdatedObject = {
        id: 'object1',
        ...mockFormData,
      };

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUpdatedObject, error: null }) // update
        .mockResolvedValueOnce({
          data: {
            ...mockUpdatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        }); // fetchCompleteObject

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useObjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(supabase.from).toHaveBeenCalledWith('objects');
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(mockFormData);
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
        'id',
        mockInitialData.object.id
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Objekt bol úspešne upravený',
        'success',
        3000
      );
      expect(result.current.loading).toBe(false);
    });

    it('should delete existing chimneys before saving new ones', async () => {
      const mockUpdatedObject = {
        id: 'object1',
        ...mockFormData,
      };

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUpdatedObject, error: null }) // update
        .mockResolvedValueOnce({
          data: {
            ...mockUpdatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        }); // fetchCompleteObject

      const { result } = renderHook(() =>
        useObjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      // Should delete chimneys first
      const deleteCalls = (supabase.from as jest.Mock).mock.calls.filter(
        (call) => call[0] === 'chimneys' && mockQueryBuilder.delete
      );
      expect(deleteCalls.length).toBeGreaterThan(0);
    });

    it('should handle update errors', async () => {
      const mockError = { message: 'Update error' };
      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();
      mockQueryBuilder.single.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const { result } = renderHook(() =>
        useObjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving object: ',
        mockError
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa upraviť objekt',
        'error',
        4000
      );
      expect(result.current.loading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('loading state', () => {
    it('should set loading to true during submission', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockQueryBuilder.single.mockReturnValueOnce(promise);

      const { result } = renderHook(() =>
        useObjectSubmit({ mode: 'create' })
      );

      act(() => {
        result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({
          data: { id: 'new-id', ...mockFormData },
          error: null,
        });
        mockQueryBuilder.single.mockResolvedValueOnce({
          data: {
            id: 'new-id',
            ...mockFormData,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        });
        await promise;
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe('onSuccess callback', () => {
    it('should call onSuccess callback when provided', async () => {
      const mockCreatedObject = {
        id: 'new-object-id',
        ...mockFormData,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedObject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        });

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useObjectSubmit({
          mode: 'create',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          object: expect.objectContaining({ id: 'new-object-id' }),
        })
      );
    });

    it('should not call onSuccess if not provided', async () => {
      const mockCreatedObject = {
        id: 'new-object-id',
        ...mockFormData,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedObject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedObject,
            clients: mockInitialData.client,
            chimneys: [],
          },
          error: null,
        });

      const { result } = renderHook(() =>
        useObjectSubmit({ mode: 'create' })
      );

      await act(async () => {
        await result.current.handleSubmit(mockFormData, mockChimneys);
      });

      // Should not throw error even if onSuccess is not provided
      expect(result.current.loading).toBe(false);
    });
  });
});
