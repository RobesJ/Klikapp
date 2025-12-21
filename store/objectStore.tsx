import { supabase } from '@/lib/supabase';
import { Chimney, ObjectWithRelations } from '@/types/objectSpecific';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useNotificationStore } from './notificationStore';

interface ObjectFilters {
  searchQuery: string;
}

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
  applyFilters: () => ObjectWithRelations[];
  lookForObjectInDBS: () => void;
  loadMore: () => void;
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
        lastFetch: now,
        loading: false,
        hasMore: limit < (objectWithRelations.length),
        offset: objectWithRelations.length
      });

      get().applyFilters();
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

  setFilters: (newFilters) => {
    const { filters } = get();

    set({filters: { ...filters, ...newFilters }});
    const filtered = get().applyFilters();
    set({filteredObjects: filtered});

    if (newFilters.searchQuery?.trim() && newFilters.searchQuery?.trim().length > 3 && filtered.length === 0) {
      get().lookForObjectInDBS();
    }
  },

  clearFilters: () => {
    set({ filters: initialFilters });
    //get().applyFilters();
  },

  applyFilters: () => {
    const { objects, filters } = get();
    
    let filtered = [...objects];

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.client.name.toLowerCase().includes(query) ||
        o.object.city?.toLowerCase().includes(query) ||
        o.object.address?.toLowerCase().includes(query)
      );
    }

    //set({ filteredObjects: filtered });
    console.log(`Filtered: ${filtered.length}/${objects.length} objects`);
    return filtered;
  },

  lookForObjectInDBS: async() => {
    const { objects, filters, loading } = get();

    if (loading) {
      return;
    }

    set({ loading: true, error: null });
    if (filters.searchQuery.trim()) {
      try {
        console.log("Looking for objects from database...");
        const searchTerm = filters.searchQuery.trim();

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

        set({ 
          objects: [...filtered, ...objects],
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
    }
  },
  
  loadMore: async () => {
    const {objects, offset, hasMore, pageSize, loading } = get();

    if (loading && !hasMore) {
      return;
    }

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
        set({ loading: false });
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

      set({ 
        objects: [...objects, ...objectWithRelations],
        offset: offset + objectWithRelations.length,
        loading: false 
      });
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
      offset: state.offset +1
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
      )
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
            set((state) => ({
              objects: state.objects.filter(o => o.object.id !== id)
            }));
            //get().applyFilters();
          
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
              set({objects:previousObjects});
              //get().applyFilters();
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
        