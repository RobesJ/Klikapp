import { supabase } from '@/lib/supabase';
import { Client } from '@/types/generics';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useObjectStore } from './objectStore';

interface ClientFilters {
  searchQuery: string;
}

interface ClientStore {
  clients: Client[];
  filteredClients: Client[];
  filters: ClientFilters;
  
  loading: boolean;
  lastFetch: number;
  error: string | null;
  
  fetchClients: (limit: number) => Promise<void>;
  setFilters: (filters: Partial<ClientFilters>) => void;
  clearFilters: () => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Client) => void;
  deleteClient: (id: string) => void;
  applyFilters: () => void;
}

const CACHE_DURATION = 30000; // 30 seconds

const initialFilters: ClientFilters = {
  searchQuery: '',
};

export const useClientStore = create<ClientStore>((set, get) => ({
  // Initial state
  clients: [],
  filteredClients: [],
  filters: initialFilters,
  loading: false,
  lastFetch: 0,
  error: null,

  fetchClients: async (limit = 100) => {
    const { clients, lastFetch, loading } = get();
    const now = Date.now();

    if (clients.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached clients');
      return;
    }

    if (loading) {
      console.log('Already fetching...');
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('Fetching clients from database...');
      
      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select(`
            *,
            projects:projects(count),
            objects:objects(count)
        `)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      
      const clients: Client[] = clientsData.map(item => ({
          ...item,
          projectsCount: item.projects[0]?.count || 0,
          objectsCount: item.objects[0]?.count || 0
      }));
      
      set({ 
        clients: clients,
        lastFetch: now,
        loading: false 
      });
      
      get().applyFilters();
      console.log(`Fetched ${clients.length} clients`);
    } 
    catch (error: any) {
      console.error('Error fetching clients:', error.message);
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
    const { clients, filters } = get();
    let filtered = [...clients];

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(query) ||
        client.phone?.includes(query)
      );
    }

    set({ filteredClients: filtered });
    console.log(`🔍 Filtered: ${filtered.length}/${clients.length} clients`);
  },
  
  addClient: (client) => {
    set((state) => ({
      clients: [client, ...state.clients]
    }));
    get().applyFilters();
  },

  updateClient: (id, updatedClient) => {
    set((state) => ({
      clients: state.clients.map(client => 
        client.id === id ? updatedClient : client
      )
    }));
    get().applyFilters();
  },

  deleteClient: async (id: string) => {
    Alert.alert(
      'Odstrániť objekt',
      'Naozaj chcete odstrániť klienta?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odstrániť',
          style: 'destructive',
          onPress: async() =>{
            const previousClients = get().clients;
            set((state) => ({
              clients: state.clients.filter(client => client.id !== id)
            }));    
            get().applyFilters();

            try{
              const { data, error} = await supabase
                .from("clients")
                .delete()
                .eq("id", id)
                .select();
            
              if (error) throw error;
              if (data){
                console.log("Client was deleted successfuly");
              }
              useObjectStore.getState().lastFetch = 0;
              Alert.alert('Úspech', 'Klient bol odstránený');
            }
            catch(error){
              console.error("error deleting client:",error);
              Alert.alert('Chyba', 'Nepodarilo sa odstrániť klienta');
              set({clients: previousClients});
              get().applyFilters();
              throw error;
            }
          }
        }
      ]
    );
  }
}));