import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/store/notificationStore';
import { Photo, ProjectWithRelations } from '@/types/projectSpecific';
import { act, renderHook } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { useHandlePhotos } from '../useHandlePhotos';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/store/notificationStore');
jest.mock('expo-image-picker');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('useHandlePhotos', () => {
  let mockProjectWithRelations: ProjectWithRelations;
  let mockQueryBuilder: any;
  let mockStorage: any;
  let mockNotificationStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProjectWithRelations = {
      project: { id: 'project1' } as any,
      client: {} as any,
      users: [],
      objects: [],
    };

    mockStorage = {
      from: jest.fn(),
    };

    mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      single: jest.fn(),
      delete: jest.fn().mockReturnThis(),
    };

    const mockStorageFrom = {
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
      remove: jest.fn(),
    };

    mockStorage.from.mockReturnValue(mockStorageFrom);

    (supabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);
    (supabase.storage as any) = mockStorage;

    mockNotificationStore = {
      addNotification: jest.fn(),
    };

    (useNotificationStore.getState as jest.Mock) = jest.fn(
      () => mockNotificationStore
    );

    (ImagePicker.requestCameraPermissionsAsync as jest.Mock) = jest.fn();
    (ImagePicker.launchCameraAsync as jest.Mock) = jest.fn();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
    );

    expect(result.current.uploadingPhotos).toBe(false);
    expect(result.current.loadingPhotos).toBe(false);
    expect(result.current.photos).toEqual([]);
    expect(result.current.selectedPhoto).toBeNull();
  });

  describe('fetchPhotos', () => {
    it('should fetch photos from database', async () => {
      const mockPhotos: Photo[] = [
        {
          id: 'photo1',
          project_id: 'project1',
          file_name: 'photo1.jpg',
          storage_path: 'path1',
        } as Photo,
        {
          id: 'photo2',
          project_id: 'project1',
          file_name: 'photo2.jpg',
          storage_path: 'path2',
        } as Photo,
      ];

      mockQueryBuilder.order.mockResolvedValueOnce({
        data: mockPhotos,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.fetchPhotos();
      });

      expect(supabase.from).toHaveBeenCalledWith('photos');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
        'project_id',
        'project1'
      );
      expect(mockQueryBuilder.order).toHaveBeenCalledWith(
        'uploaded_at',
        { ascending: false }
      );
      expect(result.current.photos).toEqual(mockPhotos);
      expect(result.current.loadingPhotos).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockQueryBuilder.order.mockReturnValueOnce(promise);

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      act(() => {
        result.current.fetchPhotos();
      });

      expect(result.current.loadingPhotos).toBe(true);

      await act(async () => {
        resolvePromise!({ data: [], error: null });
        await promise;
      });

      expect(result.current.loadingPhotos).toBe(false);
    });

    it('should handle fetch errors gracefully', async () => {
      const mockError = { message: 'Fetch error' };
      mockQueryBuilder.order.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.fetchPhotos();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error fetching photos:',
        mockError
      );
      expect(result.current.loadingPhotos).toBe(false);

      consoleLogSpy.mockRestore();
    });

    it('should handle null data from API', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.fetchPhotos();
      });

      expect(result.current.photos).toEqual([]);
    });
  });

  describe('requestCameraPermission', () => {
    it('should request camera permission successfully', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce(
        { status: 'granted' }
      );

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      // requestCameraPermission is not directly exposed, so we test it through takePhoto
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg' }],
      });

      const mockBlob = new Blob(['photo data'], { type: 'image/jpeg' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('project-photos');
      mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/photo.jpg' },
      });

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: { id: 'photo1' } as Photo,
        error: null,
      });

      await act(async () => {
        await result.current.takePhoto();
      });

      expect(ImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should show alert when camera permission is denied', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce(
        { status: 'denied' }
      );

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.takePhoto();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Povolenie potrebné',
        'Na použitie fotoaparátu je potrebné udeliť povolenie.'
      );
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });
  });

  describe('takePhoto', () => {
    it('should take photo and upload it', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce(
        { status: 'granted' }
      );

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
        canceled: false,
        assets: [{ uri: 'file://photo.jpg' }],
      });

      const mockBlob = new Blob(['photo data'], { type: 'image/jpeg' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('project-photos');
      mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/photo.jpg' },
      });

      const mockPhoto: Photo = {
        id: 'photo1',
        project_id: 'project1',
        file_name: '1234567890.jpg',
        storage_path: 'https://storage.url/photo.jpg',
      } as Photo;

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockPhoto,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.takePhoto();
      });

      expect(ImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        quality: 0.7,
      });
      expect(mockStorageFrom.upload).toHaveBeenCalled();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Fotografia bola pridaná',
        'success',
        3000
      );
      expect(result.current.photos).toContainEqual(mockPhoto);
      expect(result.current.uploadingPhotos).toBe(false);
    });

    it('should not upload if photo capture is canceled', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce(
        { status: 'granted' }
      );

      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValueOnce({
        canceled: true,
        assets: [],
      });

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.takePhoto();
      });

      expect(mockStorage.from).not.toHaveBeenCalled();
      expect(result.current.uploadingPhotos).toBe(false);
    });

    it('should handle camera error', async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValueOnce(
        { status: 'granted' }
      );

      (ImagePicker.launchCameraAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Camera error')
      );

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.takePhoto();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error taking photos:',
        expect.any(Error)
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa otvorit fotoaparát',
        'error',
        4000
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('uploadPhoto', () => {
    it('should upload photo successfully', async () => {
      const mockBlob = new Blob(['photo data'], { type: 'image/jpeg' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('project-photos');
      mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/photo.jpg' },
      });

      const mockPhoto: Photo = {
        id: 'photo1',
        project_id: 'project1',
        file_name: '1234567890.jpg',
        storage_path: 'https://storage.url/photo.jpg',
      } as Photo;

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockPhoto,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.uploadPhoto('file://photo.jpg');
      });

      expect(mockStorageFrom.upload).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Fotografia bola pridaná',
        'success',
        3000
      );
      expect(result.current.photos).toContainEqual(mockPhoto);
      expect(result.current.uploadingPhotos).toBe(false);
    });

    it('should handle upload errors', async () => {
      const mockBlob = new Blob(['photo data'], { type: 'image/jpeg' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('project-photos');
      mockStorageFrom.upload.mockResolvedValueOnce({
        error: { message: 'Upload error' },
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      await act(async () => {
        await result.current.uploadPhoto('file://photo.jpg');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error uploading photo:',
        expect.any(Object)
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa nahrať fotografiu',
        'error',
        4000
      );
      expect(result.current.uploadingPhotos).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deletePhoto', () => {
    it('should delete photo when confirmed', async () => {
      const mockPhoto: Photo = {
        id: 'photo1',
        project_id: 'project1',
        file_name: 'photo1.jpg',
        storage_path: 'https://storage.url/project-photos/project1/photo1.jpg',
      } as Photo;

      const mockStorageFrom = mockStorage.from('project-photos');
      mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

      mockQueryBuilder.delete.mockResolvedValueOnce({ error: null });

      // Mock Alert.alert to call the destructive button's onPress
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          if (buttons && buttons[1] && buttons[1].onPress) {
            buttons[1].onPress();
          }
        }
      );

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      // Set a photo first
      act(() => {
        result.current.setPhotos([mockPhoto]);
        result.current.setSelectedPhoto(mockPhoto);
      });

      await act(async () => {
        await result.current.deletePhoto(mockPhoto);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Odstrániť fotografiu',
        'Naozaj chcete odstrániť túto fotografiu?',
        expect.any(Array)
      );
      expect(mockStorageFrom.remove).toHaveBeenCalledWith([
        'project1/photo1.jpg',
      ]);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(result.current.photos).not.toContainEqual(mockPhoto);
      expect(result.current.selectedPhoto).toBeNull();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Fotografia bola odstránená',
        'success',
        3000
      );
    });

    it('should not delete photo when canceled', async () => {
      const mockPhoto: Photo = {
        id: 'photo1',
        project_id: 'project1',
        file_name: 'photo1.jpg',
        storage_path: 'https://storage.url/project-photos/project1/photo1.jpg',
      } as Photo;

      // Mock Alert.alert to not call any button's onPress (cancel)
      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          // Don't call any onPress handlers (simulating cancel)
        }
      );

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      act(() => {
        result.current.setPhotos([mockPhoto]);
      });

      await act(async () => {
        await result.current.deletePhoto(mockPhoto);
      });

      const mockStorageFrom = mockStorage.from('project-photos');
      expect(mockStorageFrom.remove).not.toHaveBeenCalled();
      expect(result.current.photos).toContainEqual(mockPhoto);
    });

    it('should handle delete errors', async () => {
      const mockPhoto: Photo = {
        id: 'photo1',
        project_id: 'project1',
        file_name: 'photo1.jpg',
        storage_path: 'https://storage.url/project-photos/project1/photo1.jpg',
      } as Photo;

      const mockStorageFrom = mockStorage.from('project-photos');
      mockStorageFrom.remove.mockResolvedValueOnce({
        error: { message: 'Delete error' },
      });

      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          if (buttons && buttons[1] && buttons[1].onPress) {
            buttons[1].onPress();
          }
        }
      );

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      act(() => {
        result.current.setPhotos([mockPhoto]);
      });

      await act(async () => {
        await result.current.deletePhoto(mockPhoto);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting photo:',
        expect.any(Object)
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa odstrániť fotografiu',
        'error',
        4000
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('state setters', () => {
    it('should update uploadingPhotos state', () => {
      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      act(() => {
        result.current.setUploadingPhotos(true);
      });

      expect(result.current.uploadingPhotos).toBe(true);
    });

    it('should update loadingPhotos state', () => {
      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      act(() => {
        result.current.setLoadingPhotos(true);
      });

      expect(result.current.loadingPhotos).toBe(true);
    });

    it('should update photos state', () => {
      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      const mockPhotos: Photo[] = [
        { id: 'photo1' } as Photo,
        { id: 'photo2' } as Photo,
      ];

      act(() => {
        result.current.setPhotos(mockPhotos);
      });

      expect(result.current.photos).toEqual(mockPhotos);
    });

    it('should update selectedPhoto state', () => {
      const { result } = renderHook(() =>
        useHandlePhotos({ projectWithRelations: mockProjectWithRelations })
      );

      const mockPhoto: Photo = { id: 'photo1' } as Photo;

      act(() => {
        result.current.setSelectedPhoto(mockPhoto);
      });

      expect(result.current.selectedPhoto).toEqual(mockPhoto);
    });
  });
});
