import { supabase } from '@/lib/supabase';
import { Chimney, ObjectWithRelations } from '@/types/objectSpecific';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useNotificationStore } from './notificationStore';

interface ObjectFilters {
  searchQuery: string;
}

export type LockResult =
  | {
      success: true;
    }
  | {
      success: false;
      lockedByName: string | null;
    };

interface ObjectStore {
  objects: ObjectWithRelations[];
  filteredObjects: ObjectWithRelations[];
  filters: ObjectFilters;
  
  loading: boolean;
  hasMore: boolean;
  lastFetch: number;
  offset: number;
  pageSize: number;
  error: string | null;
  
  fetchObjects: (limit?: number) => Promise<void>;
  setFilters: (filters: Partial<ObjectFilters>) => void;
  clearFilters: () => void;
  addObject: (object: ObjectWithRelations) => void;
  updateObject: (id: string, object: ObjectWithRelations) => void;
  deleteObject: (id: string) => void;
  lookForObjectInDBS: (searchTerm: string) => void;
  loadMore: () => void;
  lockObject: (id: string, userID: string, userName: string) => Promise<LockResult>;
  unlockObject: (id: string, userID: string) => Promise<void>;
}

const CACHE_DURATION = 300000; // 5 min

const initialFilters: ObjectFilters = {
  searchQuery: '',
};

export const useObjectStore = create<ObjectStore>((set, get) => ({
  // Initial state
  objects: [],
  filteredObjects: [],
  filters: initialFilters,
  loading: false,
  hasMore: true,
  lastFetch: 0,
  offset: 0,
  pageSize: 30,
  error: null,

  fetchObjects: async (limit = 50) => {
    console.log("fetch object called");
    const { objects, lastFetch,  loading } = get();
    const now = Date.now();

    if (objects.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached objects');
      return;
    }

    if (loading) {
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('Fetching objects from database...');
      
      const { data: objectsData, error: objectError } = await supabase
        .from("objects")
        .select(`
          *,
          clients (*),
          chimneys (
            id,
            object_id,
            chimney_type_id,
            placement,
            appliance,
            note,
            chimney_type:chimney_types (
              id,
              type,
              labelling
            )
          )
        `)
        .limit(limit);

      if (objectError) throw objectError;

      const objectWithRelations: ObjectWithRelations[] = objectsData.map((objectItem: any) => {
        const chimneys: Chimney[] = objectItem.chimneys || [];

        return {
          object: objectItem,
          client: objectItem.clients,
          chimneys: chimneys,
        };
      });

      set({ 
        objects: objectWithRelations,
        filteredObjects: [],
        lastFetch: now,
        loading: false,
        hasMore: limit === objectWithRelations.length,
        offset: objectWithRelations.length
      });

      console.log(`Fetched ${objectWithRelations.length} objects`);
    } catch (error: any) {
      console.error('Error fetching objects:', error.message);
      set({ error: error.message, loading: false });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať objekty',
        'error',
        4000
      );
    }
  },

  lockObject: async (id: string, userID: string, userName: string) => {
    try{
      const {data, error} = await supabase.rpc("lock_object_and_chimneys", {
        p_object_id: id,
        p_user_id: userID,
        p_user_name: userName
      });

      if (error) throw error;

      if (!data?.[0].locked){
        useNotificationStore.getState().addNotification(
          `Objekt upravuje používateľ ${data?.[0]?.locked_by_name}`,
          "warning",
          4000
        );

        return {
          success: false,
          lockedByName: data?.[0]?.locked_by_name ?? null
        };
      }
    
      set(state => ({
        objects: state.objects.map(o =>
          o.object.id === id
          ? {
            ...o, 
            object: {
              ...o.object,
              locked_by: userID,
              locked_by_name: userName ?? 'Unknown',
              lock_expires_at: data[0].lock_expires_at
            }
          }
        : o
        ),
        filteredObjects: state.filteredObjects.map(o =>
          o.object.id === id
          ? {
            ...o, 
            object: {
              ...o.object,
              locked_by: userID,
              locked_by_name: userName ?? 'Unknown',
              lock_expires_at: data[0].lock_expires_at
            }
          }
        : o
        )
      }));
  
      return { success: true };
    }
    catch (error: any){
      console.error('Error locking object:', error);
      return { 
        success: false,
        lockedByName: null
       };
    }
  },

  unlockObject: async (id: string, userID: string) => {
    const { error } = await supabase.rpc("unlock_object", {
      p_object_id: id,
      p_user_id: userID
    });

    if (error) throw error;
    console.log("the object is unlocked");
    set(state => ({
      objects: state.objects.map(o =>
        o.object.id === id
        ? {
          ...o, 
          object: {
            ...o.object,
            locked_by: null,
            locked_by_name: null,
            lock_expires_at: null
          }
        }
      : o
      ),
      filteredObjects: state.filteredObjects.map(o =>
        o.object.id === id
        ? {
          ...o, 
          object: {
            ...o.object,
            locked_by: null,
            locked_by_name: null,
            lock_expires_at: null
          }
        }
      : o
      )
    }));
  },

  setFilters: (newFilters) => {
    console.log("set filters called");
    const { filters, objects } = get();

    set({filters: { ...filters, ...newFilters }});
    const query = newFilters.searchQuery?.toLowerCase().trim() ?? '';

    if(!query) {
      set ({filteredObjects: [] });
      return;
    }

    const filteredLocal = objects.filter(o => {
      return o.client.name.toLowerCase().includes(query) ||
      (o.object.city?.toLowerCase() ?? '').includes(query) ||
      (o.object.address?.toLowerCase() ?? '').includes(query)
    });
  
    set({ filteredObjects: filteredLocal });

    if (query.length > 3) {
      get().lookForObjectInDBS(query);
    }
  },

  clearFilters: () => {
    console.log("clear filters called");
    set({ filters: initialFilters });
  },

  lookForObjectInDBS: async(searchTerm: string) => {
    const { objects, loading } = get();

    if (loading) {
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log("Looking for objects from database...");
      
      const { data: clientsData, error: clientsError} = await supabase
        .from("clients")
        .select("*")
        .or(`name.ilike.%${searchTerm}%`);

      if (clientsError) throw clientsError;
      const clientIDs = clientsData.map(c => c.id);

      let query =  supabase
        .from("objects")
        .select(`
          *,
          clients (*),
          chimneys (
            id,
            object_id,
            chimney_type_id,
            placement,
            appliance,
            note,
            chimney_type:chimney_types (
              id,
              type,
              labelling
            )
          )
        `);
      
      if(clientIDs.length > 0){
        query.or(`address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,client_id.in.(${clientIDs.join(',')})`);
      }
      else{
        query.or(`address.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }

      const { data: objectsData, error: objectError } = await query;
      if (objectError) throw objectError;

      const filtered: ObjectWithRelations[] = objectsData.map((objectItem: any) => {
        const chimneys: Chimney[] = objectItem.chimneys || [];
        return {
          object: objectItem,
          client: objectItem.clients,
          chimneys: chimneys,
        };
      });

      const existingIds = new Set(objects.map(o => o.object.id));
      const newObjects = filtered.filter(o => !existingIds.has(o.object.id));

      set({ 
        objects: [...objects, ...newObjects],
        filteredObjects: filtered,
        loading: false
      });
      
      console.log(`Found ${filtered.length} matching objects`);
    } catch (error: any) {
      console.error('Error searching for objects in dbs:', error.message);
      set({ error: error.message, loading: false });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa vyhľadať viac objektov',
        'error',
        4000
      );
    }
  },
  
  loadMore: async () => {
    const {objects, offset, hasMore, pageSize, loading } = get();

    if (loading || !hasMore) {
      return;
    }
    console.log("loadMore object called");
    set({ loading: true });

    try{
      const { data: objectsData, error: objectError } = await supabase
        .from("objects")
        .select(`
          *,
          clients (*),
          chimneys (
            id,
            object_id,
            chimney_type_id,
            placement,
            appliance,
            note,
            chimney_type:chimney_types (
              id,
              type,
              labelling
            )
          )
        `)
        .range(offset, offset + pageSize -1);

      if (objectError) throw objectError;

      if (!objectsData || objectsData.length === 0) {
        set({ 
          loading: false, 
          hasMore: false 
        });
        console.log('No more objects to load');
        return;
      }
      const objectWithRelations: ObjectWithRelations[] = objectsData.map((objectItem: any) => {
        const chimneys: Chimney[] = objectItem.chimneys || [];

        return {
          object: objectItem,
          client: objectItem.clients,
          chimneys: chimneys,
        };
      });

      set(state => ({ 
        objects: [...state.objects, ...objectWithRelations],
        filteredObjects: state.filteredObjects.length > 0
                          ? [...state.filteredObjects, ...objectWithRelations]
                          : state.filteredObjects,
        offset: state.offset + objectWithRelations.length,
        hasMore: objectWithRelations.length === pageSize,
        loading: false 
      }));
      console.log(`Loaded ${objectWithRelations.length} more objects, total: ${objects.length + objectWithRelations.length}`);
    }
    catch (error: any) {
      console.error('Load more objects error:', error);
      set({ 
        loading: false,
        error: error.message
       });
       useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať viac objektov',
        'error',
        4000
      );
    }
  },

  addObject: (object) => {
    if (!object || !object.object || !object.object.id || !object.client){
      console.log("Invalid object structure:", object);
      return;
    }

    set((state) => ({
      objects: [object, ...state.objects],
      offset: state.offset +1,
      lastFetch: Date.now()
    }));

    useNotificationStore.getState().addNotification(
      'Objekt bol úspešne pridaný',
      'success',
      3000
    );
  },

  updateObject: (id: string, updatedObject) => {
    set((state) => ({
      objects: state.objects.map(o => 
        o.object.id === id ? updatedObject : o
      ),
      filteredObjects: state.filteredObjects.map(o => 
        o.object.id === id ? updatedObject : o
      ),
      lastFetch: Date.now()
    }));
    useNotificationStore.getState().addNotification(
      'Objekt bol úspešne aktualizovaný',
      'success',
      3000
    );
  },

  deleteObject: async (id: string) => {
    Alert.alert(
      'Odstrániť objekt',
      'Naozaj chcete odstrániť tento objekt?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odstrániť',
          style: 'destructive',
          onPress: async() =>{
            const previousObjects = get().objects;
            const previousFiltered = get().filteredObjects;

            set((state) => ({
              objects: state.objects.filter(o => o.object.id !== id),
              filteredObjects: state.filteredObjects.filter(o => o.object.id !== id),
              lastFetch: Date.now()
            }));
          
            try{
              const { data, error } = await supabase
                .from("objects")
                .delete()
                .eq("id", id)
                .select();
            
              if(error) throw error;
              if(data){
                console.log("Deleted object with id:", id);
                useNotificationStore.getState().addNotification(
                  'Objekt bol úspešne odstránený',
                  'success',
                  3000
                );
              }
            }
            catch(error){
              console.error("Chyba pri mazani objektu:", error);
              set({
                objects: previousObjects,
                filteredObjects: previousFiltered
              });
              useNotificationStore.getState().addNotification(
                'Nepodarilo sa odstrániť objekt',
                'error',
                4000
              );
            }
          }
        }
      ]
    );
  }
}));