import { supabase } from '@/lib/supabase';
import { Client } from '@/types/generics';
import { Alert } from 'react-native';
import { create } from 'zustand';

interface ClientFilters {
  searchQuery: string;
}

interface ClientStore {
  clients: Client[];
  filteredClients: Client[];
  filters: ClientFilters;
  
  loading: boolean;
  lastFetch: number;
  hasMore: boolean;
  pageSize: number;
  offset: number;
  error: string | null;
  success: string | null;
  
  fetchClients: (limit: number) => Promise<void>;
  setFilters: (filters: Partial<ClientFilters>) => void;
  clearFilters: () => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Client) => void;
  deleteClient: (id: string) => void;
  applyFilters: () => void;
  loadMore: () => Promise<void>;
}

const CACHE_DURATION = 300000; // 5 min

const initialFilters: ClientFilters = {
  searchQuery: '',
};

export const useClientStore = create<ClientStore>((set, get) => ({
  // Initial state
  clients: [],
  filteredClients: [],
  filters: initialFilters,
  loading: false,
  hasMore: true,
  lastFetch: 0,
  error: null,
  pageSize: 30,
  offset: 0,
  success: null,

  fetchClients: async (limit = 50) => {
    const { clients, lastFetch, loading } = get();
    const now = Date.now();

    if (clients.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached clients');
      return;
    }

    if (loading) {
      return;
    }

    set({ loading: true, error: null });

    try {
      console.log('Fetching clients from database...');
      
      const { data: clientsData, error: clientsError} = await supabase
        .from("clients")
        .select(`
            *,
            projects:projects(count),
            objects:objects(count)
        `)
        .limit(limit)
        .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
      
      const clients: Client[] = clientsData.map(item => ({
          ...item,
          projectsCount: item.projects[0]?.count || 0,
          objectsCount: item.objects[0]?.count || 0
      }));
      
      const hasMoreLoc = (clients.length < limit) ? false : true; 
      set({ 
        clients: clients,
        lastFetch: now,
        offset: clients.length,
        loading: false, 
        hasMore: hasMoreLoc
      });
      
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
    console.log(`Filtered: ${filtered.length}/${clients.length} clients`);
  },

  loadMore: async () => {
    const {clients, offset, pageSize, loading, hasMore } = get();

    if (loading || !hasMore) {
      return;
    }
    console.log("Fetching more clients...");
    set({ loading: true });
    try{
      const { data: clientsData, error: clientsError } = await supabase
          .from("clients")
          .select(`
              *,
              projects:projects(count),
              objects:objects(count)
          `)
          .range(offset, offset + pageSize -1)
          .order('created_at', { ascending: false });

      if (clientsError) throw clientsError;
          
      const nextClients: Client[] = clientsData.map(item => ({
        ...item,
        projectsCount: item.projects[0]?.count || 0,
        objectsCount: item.objects[0]?.count || 0
      }));

      set({ 
        clients: [...clients, ...nextClients],
        offset: offset + pageSize,
        loading: false 
      });
    }
    catch (error: any) {
      console.error('Load more clients error:', error);
      set({ 
        loading: false,
        error: error.message
       });
    }
  },
  
  addClient: (client) => {
    set((state) => ({
      clients: [client, ...state.clients],
      offset: state.offset + 1,
    }));
  },

  updateClient: (id, updatedClient) => {
    set((state) => ({
      clients: state.clients.map(client => 
        client.id === id ? updatedClient : client
      )
    }));
  },

  deleteClient: async (id: string) => {
    Alert.alert(
      'Odstrániť klienta',
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
              //useObjectStore.getState().lastFetch = 0;
              set({
                success: "Klient bol úspešne odstránený"
              });
            }
            catch(error){
              console.error("error deleting client:",error);
              set({
                clients: previousClients,
                error: "Nepodarilo sa odstrániť klienta"
              });
              throw error;
            }
          }
        }
      ]
    );
  }
}));