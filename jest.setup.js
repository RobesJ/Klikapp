// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
  );
  
  // Mock react-native-url-polyfill
  jest.mock('react-native-url-polyfill/auto', () => {});

  jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');
  
  // Mock Supabase globally
  jest.mock('@/lib/supabase', () => ({
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        upsert: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockReturnThis(),
      })),
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({ 
          data: { subscription: { unsubscribe: jest.fn() } } 
        })),
      },
    },
  }));


  jest.mock('expo-modules-core', () => {
    const modulesCore = jest.requireActual('expo-modules-core');
    return {
      ...modulesCore,
      NativeModulesProxy: {
        ExponentFileSystem: {},
      },
    };
  });
  
  // Mock expo-file-system if used
  jest.mock('expo-file-system', () => ({
    downloadAsync: jest.fn(),
    getInfoAsync: jest.fn(),
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    deleteAsync: jest.fn(),
    moveAsync: jest.fn(),
    copyAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    readDirectoryAsync: jest.fn(),
    createDownloadResumable: jest.fn(),
    documentDirectory: 'file://mock-document-directory/',
    cacheDirectory: 'file://mock-cache-directory/',
  }));
  
  // Mock expo-image-picker if used
  jest.mock('expo-image-picker', () => ({
    launchImageLibraryAsync: jest.fn(),
    launchCameraAsync: jest.fn(),
    requestMediaLibraryPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
    requestCameraPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
    MediaTypeOptions: {
      Images: 'Images',
      Videos: 'Videos',
      All: 'All',
    },
  }));