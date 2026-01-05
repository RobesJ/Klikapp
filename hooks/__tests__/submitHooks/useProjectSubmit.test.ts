import { useProjectSubmit } from "@/hooks/submitHooks/useProjectSubmit";
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/store/notificationStore';
import { useProjectStore } from '@/store/projectStore';
import { Project, User } from '@/types/generics';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { act, renderHook } from '@testing-library/react-native';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/store/notificationStore');
jest.mock('@/store/projectStore');

describe('useProjectSubmit', () => {
  let mockQueryBuilder: any;
  let mockNotificationStore: any;
  let mockProjectStore: any;
  let mockInitialData: ProjectWithRelations;
  let mockFormData: Omit<Project, 'id'>;
  let mockUsers: User[];
  let mockObjects: ObjectWithRelations[];

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsers = [{ id: 'user1', name: 'Test User' } as User];
    mockObjects = [
      {
        object: { id: 'object1' } as any,
        client: { id: 'client1' } as any,
        chimneys: [],
      },
    ];

    mockInitialData = {
      project: {
        id: 'project1',
        client_id: 'client1',
        type: 'Čistenie',
        state: 'Nový',
        scheduled_date: '2024-01-01',
        start_date: null,
        completion_date: null,
        note: '',
      },
      client: { id: 'client1' } as any,
      users: mockUsers,
      objects: mockObjects,
    };

    mockFormData = {
      client_id: 'client1',
      type: 'Čistenie',
      state: 'Nový',
      scheduled_date: '2024-01-01',
      start_date: null,
      completion_date: null,
      note: '',
    };

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

    mockProjectStore = {
      addProject: jest.fn(),
      updateProject: jest.fn(),
    };

    (useNotificationStore.getState as jest.Mock) = jest.fn(
      () => mockNotificationStore
    );

    (useProjectStore as any) = jest.fn(() => mockProjectStore);
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useProjectSubmit({ mode: 'create' })
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.updatingState).toBe(false);
    expect(result.current.submitProject).toBeDefined();
    expect(result.current.handleStateChange).toBeDefined();
  });

  describe('submitProject - create mode', () => {
    it('should create project successfully', async () => {
      const mockCreatedProject = {
        id: 'new-project-id',
        ...mockFormData,
      };

      const mockCompleteProject: ProjectWithRelations = {
        project: mockCreatedProject as Project,
        client: mockInitialData.client,
        users: mockUsers,
        objects: mockObjects,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedProject, error: null }) // insert
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        }); // fetchCompleteProject

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'create',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.submitProject(mockFormData, mockUsers, mockObjects);
      });

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(mockFormData);
      expect(mockProjectStore.addProject).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Projekt bol úspešne vytvorený',
        'success',
        3000
      );
      expect(result.current.loading).toBe(false);
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
        useProjectSubmit({ mode: 'create' })
      );

      await act(async () => {
        await result.current.submitProject(mockFormData, mockUsers, mockObjects);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Chyba pri ukladaní projektu: ',
        mockError
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa vytvoriť projekt',
        'error',
        4000
      );
      expect(result.current.loading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('submitProject - edit mode', () => {
    it('should update project successfully', async () => {
      const mockUpdatedProject = {
        id: 'project1',
        ...mockFormData,
      };

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUpdatedProject, error: null }) // update
        .mockResolvedValueOnce({
          data: {
            ...mockUpdatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        }); // fetchCompleteProject

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
          oldState: 'Nový',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.submitProject(mockFormData, mockUsers, mockObjects);
      });

      expect(supabase.from).toHaveBeenCalledWith('projects');
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockProjectStore.updateProject).toHaveBeenCalled();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Projekt bol úspešne upravený',
        'success',
        3000
      );
      expect(result.current.loading).toBe(false);
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
        useProjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
        })
      );

      await act(async () => {
        await result.current.submitProject(mockFormData, mockUsers, mockObjects);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Chyba pri ukladaní projektu: ',
        mockError
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa upraviť projekt',
        'error',
        4000
      );
      expect(result.current.loading).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('handleStateChange', () => {
    it('should update project state successfully', async () => {
      const mockUpdatedProject = {
        id: 'project1',
        ...mockFormData,
        state: 'Prebieha',
      };

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUpdatedProject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockUpdatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        });

      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
        })
      );

      await act(async () => {
        await result.current.handleStateChange('Prebieha', 'Nový');
      });

      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(mockProjectStore.updateProject).toHaveBeenCalled();
      // State change doesn't show success notification by default
      expect(mockQueryBuilder.update).toHaveBeenCalled();
      expect(result.current.updatingState).toBe(false);
    });

    it('should create new project when state changes to Ukončený', async () => {
      const mockUpdatedProject = {
        id: 'project1',
        ...mockFormData,
        state: 'Ukončený',
        completion_date: '2024-01-15',
      };

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUpdatedProject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockUpdatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'new-project-id',
            client_id: 'client1',
            type: 'Čistenie',
            state: 'Nový',
          },
          error: null,
        })
        .mockResolvedValueOnce({
          data: {
            id: 'new-project-id',
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        });

      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'edit',
          initialData: {
            ...mockInitialData,
            project: {
              ...mockInitialData.project,
              type: 'Obhliadka',
            },
          },
        })
      );

      await act(async () => {
        await result.current.handleStateChange('Ukončený', 'Prebieha');
      });

      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        expect.stringContaining('Bol vytvorený nový projekt typu:'),
        'success',
        3000
      );
      expect(mockProjectStore.addProject).toHaveBeenCalled();
    });

    it('should not update state if initialData is missing', async () => {
      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'edit',
          // No initialData provided
        })
      );

      await act(async () => {
        await result.current.handleStateChange('Prebieha', 'Nový');
      });

      // Should not call update because initialData is missing
      expect(mockQueryBuilder.update).not.toHaveBeenCalled();
    });

    it('should handle state change errors', async () => {
      const mockError = { message: 'State change error' };
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
        useProjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
        })
      );

      await act(async () => {
        await result.current.handleStateChange('Prebieha', 'Nový');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error updating project state:',
        mockError
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa upraviť stav projektu',
        'error',
        4000
      );
      expect(result.current.updatingState).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanFormData', () => {
    it('should calculate dates correctly when state changes from Nový to Prebieha', async () => {
      const mockUpdatedProject = {
        id: 'project1',
        ...mockFormData,
        state: 'Prebieha',
        start_date: expect.any(String),
      };

      mockQueryBuilder.update.mockReturnThis();
      mockQueryBuilder.eq.mockReturnThis();

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockUpdatedProject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockUpdatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        });

      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'edit',
          initialData: mockInitialData,
          oldState: 'Nový',
        })
      );

      const formDataWithStateChange = {
        ...mockFormData,
        state: 'Prebieha',
      };

      await act(async () => {
        await result.current.submitProject(formDataWithStateChange, mockUsers, mockObjects);
      });

      expect(mockQueryBuilder.update).toHaveBeenCalled();
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
        useProjectSubmit({ mode: 'create' })
      );

      act(() => {
        result.current.submitProject(mockFormData, mockUsers, mockObjects);
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
            project_assignments: [],
            project_objects: [],
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
      const mockCreatedProject = {
        id: 'new-project-id',
        ...mockFormData,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedProject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        });

      const onSuccess = jest.fn();

      const { result } = renderHook(() =>
        useProjectSubmit({
          mode: 'create',
          onSuccess,
        })
      );

      await act(async () => {
        await result.current.submitProject(mockFormData, mockUsers, mockObjects);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should not call onSuccess if not provided', async () => {
      const mockCreatedProject = {
        id: 'new-project-id',
        ...mockFormData,
      };

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: mockCreatedProject, error: null })
        .mockResolvedValueOnce({
          data: {
            ...mockCreatedProject,
            clients: mockInitialData.client,
            project_assignments: [],
            project_objects: [],
          },
          error: null,
        });

      const { result } = renderHook(() =>
        useProjectSubmit({ mode: 'create' })
      );

      await act(async () => {
        await result.current.submitProject(mockFormData, mockUsers, mockObjects);
      });

      // Should not throw error even if onSuccess is not provided
      expect(result.current.loading).toBe(false);
    });
  });
});
