import { getFooterImageBase64, getWatermarkBase64 } from '@/constants/icons';
import { supabase } from '@/lib/supabase';
import { generateRecord } from '@/services/pdfService';
import { useNotificationStore } from '@/store/notificationStore';
import { PDF, User } from '@/types/generics';
import { Chimney, ObjectWithRelations } from '@/types/objectSpecific';
import { ProjectWithRelations } from '@/types/projectSpecific';
import { act, renderHook } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useHandlePDFs } from '../useHandlePDFs';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/store/notificationStore');
jest.mock('@/services/pdfService');
jest.mock('@/constants/icons');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('useHandlePDFs', () => {
  let mockProjectWithRelations: ProjectWithRelations;
  let mockUsers: User[];
  let mockQueryBuilder: any;
  let mockStorage: any;
  let mockNotificationStore: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsers = [{ id: 'user1', name: 'Test User' } as User];

    mockProjectWithRelations = {
      project: { id: 'project1' } as any,
      client: { id: 'client1' } as any,
      users: mockUsers,
      objects: [
        {
          object: { id: 'object1' } as any,
          client: {} as any,
          chimneys: [
            { id: 'chimney1', placement: 'test' } as Chimney,
            { id: 'chimney2', placement: 'test' } as Chimney,
          ],
        },
      ] as ObjectWithRelations[],
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

    (getWatermarkBase64 as jest.Mock) = jest
      .fn()
      .mockResolvedValue('watermark-base64');
    (getFooterImageBase64 as jest.Mock) = jest
      .fn()
      .mockResolvedValue('footer-base64');
    (generateRecord as jest.Mock) = jest
      .fn()
      .mockResolvedValue('file://generated.pdf');
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() =>
      useHandlePDFs({
        projectWithRelations: mockProjectWithRelations,
        users: mockUsers,
      })
    );

    expect(result.current.uploadingPDFs).toBe(false);
    expect(result.current.loadingPDFs).toBe(false);
    expect(result.current.generatingPDFs).toBe(false);
    expect(result.current.selectedPDF).toBeUndefined();
    expect(result.current.chimneySums).toEqual({});
    expect(result.current.PDFs).toEqual([]);
  });

  describe('fetchPDFs', () => {
    it('should fetch PDFs from database', async () => {
      const mockPDFs: PDF[] = [
        {
          id: 'pdf1',
          project_id: 'project1',
          file_name: 'pdf1.pdf',
          storage_path: 'path1',
        } as PDF,
        {
          id: 'pdf2',
          project_id: 'project1',
          file_name: 'pdf2.pdf',
          storage_path: 'path2',
        } as PDF,
      ];

      mockQueryBuilder.order.mockResolvedValueOnce({
        data: mockPDFs,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await result.current.fetchPDFs();
      });

      expect(supabase.from).toHaveBeenCalledWith('pdfs');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith(
        'project_id',
        'project1'
      );
      expect(mockQueryBuilder.order).toHaveBeenCalledWith(
        'generated_at',
        { ascending: false }
      );
      expect(result.current.PDFs).toEqual(mockPDFs);
      expect(result.current.loadingPDFs).toBe(false);
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockQueryBuilder.order.mockReturnValueOnce(promise);

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      act(() => {
        result.current.fetchPDFs();
      });

      expect(result.current.loadingPDFs).toBe(true);

      await act(async () => {
        resolvePromise!({ data: [], error: null });
        await promise;
      });

      expect(result.current.loadingPDFs).toBe(false);
    });

    it('should handle fetch errors gracefully', async () => {
      const mockError = { message: 'Fetch error' };
      mockQueryBuilder.order.mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await result.current.fetchPDFs();
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'Error fetching PDFs:',
        mockError
      );
      expect(result.current.loadingPDFs).toBe(false);

      consoleLogSpy.mockRestore();
    });

    it('should handle null data from API', async () => {
      mockQueryBuilder.order.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await result.current.fetchPDFs();
      });

      expect(result.current.PDFs).toEqual([]);
    });
  });

  describe('handleGeneratePDF', () => {
    it('should generate cleaning PDFs for all chimneys', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValue({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'pdf1' } as PDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await result.current.handleGeneratePDF('cleaning');
      });

      expect(getWatermarkBase64).toHaveBeenCalled();
      expect(getFooterImageBase64).toHaveBeenCalled();
      expect(generateRecord).toHaveBeenCalledTimes(2); // 2 chimneys
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'PDF dokumenty boli vygenerované',
        'success',
        3000
      );
      expect(result.current.generatingPDFs).toBe(false);
      expect(result.current.chimneySums).toEqual({});
    });

    it('should generate inspection PDFs for all chimneys', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValue({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'pdf1' } as PDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await result.current.handleGeneratePDF('inspection');
      });

      expect(generateRecord).toHaveBeenCalledTimes(2);
      expect(result.current.generatingPDFs).toBe(false);
    });

    it('should generate cleaningWithPaymentReceipt for all chimneys when no chimneyId provided', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValue({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'pdf1' } as PDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      // Set chimney sums
      act(() => {
        result.current.setChimneySums({
          chimney1: ['100', 'sto'],
          chimney2: ['200', 'dvesto'],
        });
      });

      await act(async () => {
        await result.current.handleGeneratePDF('cleaningWithPaymentReceipt');
      });

      expect(generateRecord).toHaveBeenCalledTimes(2);
      expect(result.current.chimneySums).toEqual({});
    });

    it('should generate cleaningWithPaymentReceipt for specific chimney only', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValue({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'pdf1' } as PDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      act(() => {
        result.current.setChimneySums({
          chimney1: ['100', 'sto'],
        });
      });

      await act(async () => {
        await result.current.handleGeneratePDF(
          'cleaningWithPaymentReceipt',
          'chimney1'
        );
      });

      // Should generate receipt for chimney1, cleaning for chimney2
      expect(generateRecord).toHaveBeenCalledTimes(2);
    });

    it('should handle generation errors', async () => {
      (generateRecord as jest.Mock).mockRejectedValueOnce(
        new Error('Generation error')
      );

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await result.current.handleGeneratePDF('cleaning');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'handleGeneratePDF failed:',
        expect.any(Error)
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa vygenerovať PDF',
        'error',
        3000
      );
      expect(result.current.generatingPDFs).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should clear chimneySums after generation', async () => {
      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValue({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValue({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      mockQueryBuilder.single.mockResolvedValue({
        data: { id: 'pdf1' } as PDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      act(() => {
        result.current.setChimneySums({ chimney1: ['100', 'sto'] });
      });

      await act(async () => {
        await result.current.handleGeneratePDF('cleaning');
      });

      expect(result.current.chimneySums).toEqual({});
    });
  });

  describe('uploadPDF', () => {
    it('should upload PDF successfully', async () => {
      const mockChimney: Chimney = { id: 'chimney1' } as Chimney;

      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      const mockPDF: PDF = {
        id: 'pdf1',
        project_id: 'project1',
        file_name: 'cleaning_chimney1_project1.pdf',
        storage_path: 'https://storage.url/pdf.pdf',
      } as PDF;

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockPDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await (result.current as any).uploadPDF(
          'file://pdf.pdf',
          'project1',
          'cleaning',
          'object1',
          mockChimney,
          null
        );
      });

      expect(mockStorageFrom.upload).toHaveBeenCalled();
      expect(mockQueryBuilder.insert).toHaveBeenCalled();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'PDF záznam bol pridaný',
        'success',
        3000
      );
      expect(result.current.PDFs).toContainEqual(mockPDF);
      expect(result.current.uploadingPDFs).toBe(false);
    });

    it('should not upload if uri is null', async () => {
      const mockChimney: Chimney = { id: 'chimney1' } as Chimney;

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await (result.current as any).uploadPDF(
          null,
          'project1',
          'cleaning',
          'object1',
          mockChimney,
          null
        );
      });

      expect(mockStorage.from).not.toHaveBeenCalled();
    });

    it('should handle upload errors', async () => {
      const mockChimney: Chimney = { id: 'chimney1' } as Chimney;

      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValueOnce({
        error: { message: 'Upload error' },
      });

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation();

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await (result.current as any).uploadPDF(
          'file://pdf.pdf',
          'project1',
          'cleaning',
          'object1',
          mockChimney,
          null
        );
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error uploading pdf',
        expect.any(Object)
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa nahrať PDF',
        'error',
        4000
      );
      expect(result.current.uploadingPDFs).toBe(false);

      consoleErrorSpy.mockRestore();
    });

    it('should include sums in PDF data for cleaningWithPaymentReceipt', async () => {
      const mockChimney: Chimney = { id: 'chimney1' } as Chimney;
      const sums = ['100', 'sto'];

      const mockBlob = new Blob(['pdf data'], { type: 'application/pdf' });
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: async () => mockBlob,
      });

      const mockArrayBuffer = new ArrayBuffer(8);
      jest.spyOn(global, 'Response').mockImplementation(() => ({
        arrayBuffer: async () => mockArrayBuffer,
      } as any));

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.upload.mockResolvedValueOnce({ error: null });
      mockStorageFrom.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://storage.url/pdf.pdf' },
      });

      const mockPDF: PDF = {
        id: 'pdf1',
      } as PDF;

      mockQueryBuilder.single.mockResolvedValueOnce({
        data: mockPDF,
        error: null,
      });

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      await act(async () => {
        await (result.current as any).uploadPDF(
          'file://pdf.pdf',
          'project1',
          'cleaningWithPaymentReceipt',
          'object1',
          mockChimney,
          sums
        );
      });

      expect(mockQueryBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: '100',
          amountByWords: 'sto',
        })
      );
    });
  });

  describe('deletePdf', () => {
    it('should delete PDF when confirmed', async () => {
      const mockPDF: PDF = {
        id: 'pdf1',
        file_name: 'pdf1.pdf',
        storage_path: 'https://storage.url/pdf-reports/pdf1.pdf',
      } as PDF;

      const mockStorageFrom = mockStorage.from('pdf-reports');
      mockStorageFrom.remove.mockResolvedValueOnce({ error: null });

      mockQueryBuilder.delete.mockResolvedValueOnce({ error: null });

      (Alert.alert as jest.Mock).mockImplementation(
        (title, message, buttons) => {
          if (buttons && buttons[1] && buttons[1].onPress) {
            buttons[1].onPress();
          }
        }
      );

      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      act(() => {
        result.current.setPDFs([mockPDF]);
        result.current.setSelectedPDF(mockPDF);
      });

      await act(async () => {
        await result.current.deletePdf(mockPDF);
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Odstrániť PDF',
        'Naozaj chcete odstrániť tento PDF záznam?',
        expect.any(Array)
      );
      expect(mockStorageFrom.remove).toHaveBeenCalledWith(['pdf1.pdf']);
      expect(mockQueryBuilder.delete).toHaveBeenCalled();
      expect(result.current.PDFs).not.toContainEqual(mockPDF);
      expect(result.current.selectedPDF).toBeNull();
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'PDF záznam bol odstránený',
        'success',
        3000
      );
    });

    it('should handle delete errors', async () => {
      const mockPDF: PDF = {
        id: 'pdf1',
        file_name: 'pdf1.pdf',
        storage_path: 'https://storage.url/pdf-reports/pdf1.pdf',
      } as PDF;

      const mockStorageFrom = mockStorage.from('pdf-reports');
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
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      act(() => {
        result.current.setPDFs([mockPDF]);
      });

      await act(async () => {
        await result.current.deletePdf(mockPDF);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error deleting pdf:',
        expect.any(Object)
      );
      expect(mockNotificationStore.addNotification).toHaveBeenCalledWith(
        'Nepodarilo sa odstrániť PDF záznam',
        'error',
        4000
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('state setters', () => {
    it('should update all state setters', () => {
      const { result } = renderHook(() =>
        useHandlePDFs({
          projectWithRelations: mockProjectWithRelations,
          users: mockUsers,
        })
      );

      act(() => {
        result.current.setUploadingPDFs(true);
        result.current.setLoadingPDFs(true);
        result.current.setGeneratingPDFs(true);
        result.current.setSelectedPDF({ id: 'pdf1' } as PDF);
        result.current.setChimneySums({ chimney1: ['100', 'sto'] });
        result.current.setPDFs([{ id: 'pdf1' } as PDF]);
      });

      expect(result.current.uploadingPDFs).toBe(true);
      expect(result.current.loadingPDFs).toBe(true);
      expect(result.current.generatingPDFs).toBe(true);
      expect(result.current.selectedPDF).toEqual({ id: 'pdf1' });
      expect(result.current.chimneySums).toEqual({ chimney1: ['100', 'sto'] });
      expect(result.current.PDFs).toEqual([{ id: 'pdf1' }]);
    });
  });
});
