import { supabase } from '@/lib/supabase';
import { Chimney, ObjectWithRelations } from '@/types/objectSpecific';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useClientStore } from './clientStore';

interface ObjectFilters {
  city: string | null;
  clientId: string | null;
  searchQuery: string;
}

interface ObjectStore {
  objects: ObjectWithRelations[];
  filteredObjects: ObjectWithRelations[];
  filters: ObjectFilters;
  
  loading: boolean;
  initial_loading: boolean;
  lastFetch: number;
  error: string | null;
  
  fetchObjects: (limit?: number) => Promise<void>;
  setFilters: (filters: Partial<ObjectFilters>) => void;
  clearFilters: () => void;
  addObject: (object: ObjectWithRelations) => void;
  updateObject: (id: string, object: ObjectWithRelations) => void;
  deleteObject: (id: string) => void;
  applyFilters: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

const initialFilters: ObjectFilters = {
  city: null,
  clientId: null,
  searchQuery: '',
};

export const useObjectStore = create<ObjectStore>((set, get) => ({
  // Initial state
  objects: [],
  filteredObjects: [],
  filters: initialFilters,
  loading: false,
  initial_loading: true,
  lastFetch: 0,
  error: null,

  fetchObjects: async (limit = 100) => {
    const { objects, lastFetch,  loading } = get();
    const now = Date.now();

    if (objects.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached objects');
      return;
    }

    if (loading) {
      console.log('Already fetching...');
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
        initial_loading: false 
      });
      
      get().applyFilters();
      console.log(`✅ Fetched ${objectWithRelations.length} objects`);
    } catch (error: any) {
      console.error('Error fetching objects:', error.message);
      set({ error: error.message, loading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
    get().applyFilters();
  },

  clearFilters: () => {
    set({ filters: initialFilters });
    get().applyFilters();
  },

  applyFilters: () => {
    const { objects, filters } = get();
    
    let filtered = [...objects];

    if (filters.city) {
      filtered = filtered.filter(o => o.object.city === filters.city);
    }

    if (filters.clientId) {
      filtered = filtered.filter(o => o.object.client_id === filters.clientId);
    }

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(o => 
        o.client.name.toLowerCase().includes(query) ||
        o.object.city?.toLowerCase().includes(query)
      );
    }

    set({ filteredObjects: filtered });
    console.log(`🔍 Filtered: ${filtered.length}/${objects.length} projects`);
  },
  
  addObject: (object) => {
    if (!object || !object.object || !object.object.id || !object.client){
      console.log("Invalid object structure:", object);
      return;
    }

    set((state) => ({
      objects: [object, ...state.objects]
    }));
    get().applyFilters();
  },

  updateObject: (id: string, updatedObject) => {
    set((state) => ({
      objects: state.objects.map(o => 
        o.object.id === id ? updatedObject : o
      )
    }));
    get().applyFilters();
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
            get().applyFilters();
          
            try{
              const { data, error } = await supabase
                .from("objects")
                .delete()
                .eq("id", id)
                .select();
            
              if(error) throw error;
              if(data){
                console.log("Deleted object with id:", id);
              }
            
              useClientStore.getState().lastFetch = 0;
              //useProjectStore.getState().lastFetch = 0;
              Alert.alert('Úspech', 'Objekt bol odstránený');
            }
            catch(error){
              console.error("Chyba pri mazani objektu:", error);
              Alert.alert('Chyba', 'Nepodarilo sa odstrániť objekt');
              set({objects:previousObjects});
              get().applyFilters();
              throw error;
            }
          }
        }
      ]
    );
  }
}));
        