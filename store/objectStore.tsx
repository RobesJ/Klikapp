import { supabase } from '@/lib/supabase';
import { Client } from '@/types/generics';
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

export interface ObjectSection {
  id: string;
  title: string;
  client: Client;
  data: ObjectWithRelations[];
}

interface ObjectStore {
  objects: ObjectWithRelations[];
  groupedObjects: ObjectSection[];
  filteredGroupedObjects: ObjectSection[];
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
  groupObjects: (objects: ObjectWithRelations[]) => ObjectSection[];
}

const CACHE_DURATION = 300000; // 5 min

const initialFilters: ObjectFilters = {
  searchQuery: '',
};

export const useObjectStore = create<ObjectStore>((set, get) => ({
  // Initial state
  objects: [],
  groupedObjects: [],
  filteredGroupedObjects: [],
  filters: initialFilters,
  loading: false,
  hasMore: true,
  lastFetch: 0,
  offset: 0,
  pageSize: 30,
  error: null,


  groupObjects: (objectsToGroup: ObjectWithRelations[]): ObjectSection[] => {
    const groupMap = new Map<string, ObjectSection>();

    objectsToGroup.forEach((obj) => {
      if (!obj.client?.id) { 
        return;
      }

      const clientId = obj.client.id;
      
      if(!groupMap.has(clientId)){
        groupMap.set(clientId, {
          id: clientId,
          title: obj.client.name,
          client: obj.client,
          data: []
        });
      }

      groupMap.get(clientId)!.data.push(obj);
    });

    return Array.from(groupMap.values()).map(section => ({
      ...section,
      title: `${section.client.name} (${section.data.length})`
    }));

  },

  fetchObjects: async (limit?: number) => {
    console.log("fetch object called");
    const { groupedObjects, lastFetch, loading, pageSize } = get();
    const now = Date.now();

    if (groupedObjects.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached objects');
      return;
    }

    if (loading) {
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('Fetching objects from database...');
      const fetchLimit = limit || pageSize;
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
        .limit(fetchLimit);

      if (objectError) throw objectError;

      const objectWithRelations: ObjectWithRelations[] = objectsData.map((objectItem: any) => {
        const chimneys: Chimney[] = objectItem.chimneys || [];

        return {
          object: objectItem,
          client: objectItem.clients,
          chimneys: chimneys,
        };
      });

      const groupedData = get().groupObjects(objectWithRelations);

      set({ 
        objects: objectWithRelations,
        groupedObjects: groupedData,
        filteredGroupedObjects: [],
        lastFetch: now,
        loading: false,
        hasMore: limit === objectWithRelations.length,
        offset: objectWithRelations.length
      });

      console.log(`Fetched ${objectWithRelations.length} objects`);
    } 
    catch (error: any) {
      console.error('Error fetching objects:', error.message);
      set({ error: error.message, loading: false });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať objekty',
        'error',
        4000
      );
    }
  },

  setFilters: (newFilters) => {
    console.log("setFilters called with:", newFilters);
    const { filters, objects} = get();
  
    const updatedFilters = { ...filters, ...newFilters };
    set({ filters: updatedFilters });
    
    const query = updatedFilters.searchQuery?.toLowerCase().trim() ?? '';
  
    if (!query) {
      set({ filteredGroupedObjects: [] });
      return;
    }
  
    // Filter from the complete objects array
    const filteredLocal = objects.filter(o => {
      return o.client.name.toLowerCase().includes(query) ||
        (o.object.city?.toLowerCase() ?? '').includes(query) ||
        (o.object.address?.toLowerCase() ?? '').includes(query)
    });
  
    const filteredGrouped = get().groupObjects(filteredLocal);
    set({ filteredGroupedObjects: filteredGrouped });
  
    // Trigger database search for longer queries
    if (query.length > 3) {
      get().lookForObjectInDBS(query);
    }
  },

  clearFilters: () => {
    //console.log("clear filters called");
    set({ 
      filters: initialFilters,
      filteredGroupedObjects: []
    });
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

      const updatedObjects = [...objects, ...newObjects];
      const filteredGrouped = get().groupObjects(filtered);

      set({ 
        objects: updatedObjects,
        filteredGroupedObjects: filteredGrouped,
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
    const { objects, offset, hasMore, pageSize, loading, filters } = get();
  
    if (loading || !hasMore) {
      console.log(`loadMore skipped - loading: ${loading}, hasMore: ${hasMore}`);
      return;
    }
    
    console.log(`loadMore called - current offset: ${offset}, objects count: ${objects.length}`);
    set({ loading: true });
  
    try {
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
        .range(offset, offset + pageSize - 1);
  
      if (objectError) throw objectError;
  
      if (!objectsData || objectsData.length === 0) {
        console.log('No more objects to load');
        set({ 
          loading: false, 
          hasMore: false 
        });
        return;
      }
      const newObjects: ObjectWithRelations[] = objectsData.map((objectItem: any) => {
        const chimneys: Chimney[] = objectItem.chimneys || [];
        return {
          object: objectItem,
          client: objectItem.clients,
          chimneys: chimneys
        };
      });
  
      const allObjects = [...objects, ...newObjects];
      const grouped = get().groupObjects(allObjects);

      set({ 
        objects: allObjects,
        groupedObjects: grouped,
        offset: offset + newObjects.length,
        hasMore: newObjects.length === pageSize,
        loading: false 
      });
      
      // Re-apply current filter if one exists
      const currentFilter = filters.searchQuery;
      if (currentFilter && currentFilter.trim()) {
        console.log('Re-applying filter after loadMore');
        get().setFilters({ searchQuery: currentFilter });
      }
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

    const updatedObjects = [object, ...get().objects];
    const grouped = get().groupObjects(updatedObjects);

    set((state) => ({
      objects: updatedObjects,
      groupedObjects: grouped,
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
    const updatedObjects = get().objects.map(o =>
      o.object.id === id ? updatedObject : o
    );

    const grouped = get().groupObjects(updatedObjects);

    const updatedFiltered = get().filteredGroupedObjects.length > 0
      ? get().groupObjects(
          get().filteredGroupedObjects
            .flatMap(g => g.data)
            .map(o => o.object.id === id ? updatedObject : o)
        )
      : [];

    set({
      objects: updatedObjects,
      groupedObjects: grouped,
      filteredGroupedObjects: updatedFiltered,
      lastFetch: Date.now()
    });

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
            const previousGrouped = get().groupedObjects;
            const previousFiltered = get().filteredGroupedObjects;

            const newObjects = previousObjects.filter(o => o.object.id !== id);
            const newGrouped = get().groupObjects(newObjects);
            const newFiltered = previousFiltered.length > 0
              ? get().groupObjects(
                  previousFiltered.flatMap(g => g.data).filter(o => o.object.id !== id)
                )
              : [];

              set({
                objects: newObjects,
                groupedObjects: newGrouped,
                filteredGroupedObjects: newFiltered,
                lastFetch: Date.now()
              });
          
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
                groupedObjects: previousGrouped,
                filteredGroupedObjects: previousFiltered
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
    
      const updateLockStatus = (obj: ObjectWithRelations) => 
        obj.object.id === id
          ? {
              ...obj, 
              object: {
                ...obj.object,
                locked_by: userID,
                locked_by_name: userName ?? 'Unknown',
                lock_expires_at: data[0].lock_expires_at
              }
            }
          : obj;

      const updatedObjects = get().objects.map(updateLockStatus);
      const updatedGrouped = get().groupObjects(updatedObjects);
      const updatedFiltered = get().filteredGroupedObjects.length > 0
        ? get().groupObjects(
            get().filteredGroupedObjects.flatMap(g => g.data).map(updateLockStatus)
          )
        : [];

      set({
        objects: updatedObjects,
        groupedObjects: updatedGrouped,
        filteredGroupedObjects: updatedFiltered
      });

      return { success: true };
    }
    catch (error: any) {
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
    const updateUnlockStatus = (obj: ObjectWithRelations) =>
      obj.object.id === id
        ? {
            ...obj, 
            object: {
              ...obj.object,
              locked_by: null,
              locked_by_name: null,
              lock_expires_at: null
            }
          }
        : obj;

    const updatedObjects = get().objects.map(updateUnlockStatus);
    const updatedGrouped = get().groupObjects(updatedObjects);
    const updatedFiltered = get().filteredGroupedObjects.length > 0
      ? get().groupObjects(
          get().filteredGroupedObjects.flatMap(g => g.data).map(updateUnlockStatus)
        )
      : [];

    set({
      objects: updatedObjects,
      groupedObjects: updatedGrouped,
      filteredGroupedObjects: updatedFiltered
    });
  },
}));