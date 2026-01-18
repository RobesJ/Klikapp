import { supabase } from '@/lib/supabase';
import { useNotificationStore } from "@/store/notificationStore";
import { Client } from '@/types/generics';
import { Alert } from 'react-native';
import { create } from 'zustand';

interface ClientFilters {
  searchQuery: string;
}

export type LockClientResult =
  | { success: true }
  | { success: false; lockedByName: string | null };

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
  isSearching: boolean;
  
  fetchClients: (limit: number) => Promise<void>;
  setFilters: (filters: Partial<ClientFilters>) => void;
  clearFilters: () => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Client) => void;
  deleteClient: (id: string) => void;
  applyFilters: () => Client[];
  lookForClientInDBS: () => Promise<void>;
  loadMore: () => Promise<void>;
  lockClient: (id: string, userID: string, userName: string) => Promise<LockClientResult>;
  unlockClient: (id: string, userID: string) => Promise<void>;
  updateClientCounts: (id: string, projectCount: number, objectCount: number) => void;
  reset: () => void;
}

const CACHE_DURATION = 300000; // 5 min
const MIN_SEARCH_LENGTH = 2;

const initialFilters: ClientFilters = {
  searchQuery: '',
};
const initialState = {
  clients: [],
  filteredClients: [],
  filters: initialFilters,
  loading: true,
  hasMore: true,
  lastFetch: 0,
  error: null,
  pageSize: 30,
  offset: 0,
  isSearching: false,
};

export const useClientStore = create<ClientStore>((set, get) => ({
  ...initialState,

  reset: () => set(initialState),

  fetchClients: async (limit) => {
    const { clients, lastFetch, loading } = get();
    const now = Date.now();

    if (loading && clients.length > 0){
      return;
    }

    if (clients.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached clients');
      set({loading: false});
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
     
      set({ 
        clients,
        lastFetch: now,
        offset: clients.length,
        loading: false, 
        hasMore: clients.length >= limit,
        error: null
      });
      
      console.log(`Fetched ${clients.length} clients`);
    } 
    catch (error: any) {
      console.error('Error fetching clients:', error.message);
      set({ error: error.message, loading: false });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať klientov',
        'error',
        "clients",
        4000
      );
    }
  },
  
  lockClient: async (id: string, userID: string, userName: string) => {
    try {
      const {data, error} = await supabase.rpc("lock_client", {
        p_client_id: id,
        p_user_id: userID,
        p_user_name: userName
      });

      if (error) throw error;

      if(!data || data.length === 0){
        console.error("No data returned from lock_client");
        return { success: false, lockedByName: null };
      }

      if (!data?.[0].locked){
        return {
          success: false,
          lockedByName: data?.[0]?.locked_by_name ?? null
        };
      }

      set(state => ({
        clients: state.clients.map(c =>
          c.id === id
            ? {
                ...c,
                locked_by: userID,
                locked_by_name: userName ?? 'Unknown',
                lock_expires_at: data[0].lock_expires_at
              }
            : c
        ),
        filteredClients: state.filteredClients.map(c =>
          c.id === id
            ? {
                ...c,
                locked_by: userID,
                locked_by_name: userName ?? 'Unknown',
                lock_expires_at: data[0].lock_expires_at
              }
            : c
        )
      }));
    
      return { success: true };
    }
    catch (error: any){
      console.error('Error locking client:', error);
      return { 
        success: false,
        lockedByName: null
       };
    }
  },

  unlockClient: async (id: string, userID: string) => {
    try {
      const { error } = await supabase.rpc("unlock_client", {
        p_client_id: id,
        p_user_id: userID
      });

      if (error) throw error;
      set(state => ({
        clients: state.clients.map(c =>
          c.id === id
            ? {
              ...c,
              locked_by: null,
              locked_by_name: null,
              lock_expires_at: null
            }
            : c
          ),
          filteredClients: state.filteredClients.map(c =>
            c.id === id
              ? {
                  ...c,
                  locked_by: null,
                  locked_by_name: null,
                  lock_expires_at: null
                }
              : c
          )
      }));
    } catch (error) {
      console.error('Error unlocking client:', error);
      // Still update UI even if unlock fails (prevents stuck locks)
      set(state => ({
        clients: state.clients.map(c =>
          c.id === id
            ? {
                ...c,
                locked_by: null,
                locked_by_name: null,
                lock_expires_at: null
              }
            : c
        )
      }));
    }
  },

  setFilters: (newFilters) => {
    const { filters } = get(); 
    const updatedFilters = {...filters, ...newFilters};
    set({ filters: updatedFilters});
    const filtered = get().applyFilters();
    set({ filteredClients: filtered });
  
    // if (newFilters.searchQuery?.trim() && newFilters.searchQuery?.trim().length > 3 && filtered.length === 0) {
    //   get().lookForClientInDBS();
    // }
    const query = updatedFilters.searchQuery?.trim();
    if (query && query.length >= MIN_SEARCH_LENGTH && filtered.length === 0) {
      get().lookForClientInDBS();
    }
  },

  clearFilters: () => {
    set({
      filters: initialFilters,
      filteredClients: [],
      error: null
    });
  },

  applyFilters: () => {
    const { clients, filters } = get();

    const query = filters.searchQuery.trim();
    if (!query) {
      return [];
    }

    const lowerQuery = query.toLowerCase();
    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(lowerQuery) ||
      client.phone?.includes(query) || // Phone search without toLowerCase for exact matches
      client.unformatted_email?.toLowerCase().includes(lowerQuery)
    );

    console.log(`Filtered: ${filtered.length}/${clients.length} clients`);
    return filtered;
  },

  lookForClientInDBS: async () =>{
    const { clients, filters } = get();

    if (filters.searchQuery.trim()) {
      try {
        console.log('Looking for clients in database...');
        const searchTerm = filters.searchQuery.trim();

        const { data: clientsData, error: clientsError} = await supabase
          .from("clients")
          .select(`
              *,
              projects:projects(count),
              objects:objects(count)
          `)
          .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
          .limit(5);

        if (clientsError) throw clientsError;
          
        const filtered: Client[] = clientsData.map(item => ({
            ...item,
            projectsCount: item.projects[0]?.count || 0,
            objectsCount: item.objects[0]?.count || 0
        }));

        set({ 
          clients: [...filtered, ...clients],
          filteredClients: filtered,
        });
        console.log(`Found: ${filtered.length} matching clients`);
      } 
      catch (error: any) {
        console.error('Error searching for clients in dbs:', error.message);
        set({ error: error.message, loading: false });

        useNotificationStore.getState().addNotification(
          'Nepodarilo sa vyhľadať klientov',
          'error',
          "clients",
          4000
        );
      }
    }
  },

  loadMore: async () => {
    const {clients, offset, pageSize, loading, hasMore } = get();

    if (loading || !hasMore) {
      return;
    }

    console.log("Fetching more clients...");
    set({ loading: true });

    try {
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
        offset: offset + nextClients.length,
        loading: false, 
        hasMore: pageSize === nextClients.length
      });
    }
    catch (error: any) {
      console.error('Load more clients error:', error);
      set({ 
        loading: false,
        error: error.message
       });

       useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať viac klientov',
        'error',
        "clients",
        4000
      );
    }
  },
  
  addClient: (client) => {
    set((state) => ({
      clients: [client, ...state.clients],
      offset: state.offset + 1,
    }));

    useNotificationStore.getState().addNotification(
      'Klient bol úspešne pridaný',
      'success',
      "clients",
      3000
    );
  },

  updateClient: (id, updatedClient) => {
    set((state) => ({
      clients: state.clients.map(client => 
        client.id === id ? updatedClient : client
      )
    }));
    
    useNotificationStore.getState().addNotification(
      'Klient bol úspešne aktualizovaný',
      'success',
      "clients",
      3000
    );
  },

  updateClientCounts: (clientId: string, projectCount: number, objectCount: number) => {
    set(state => ({
      clients: state.clients.map(client => 
        client.id === clientId 
          ? { 
              ...client, 
              projectsCount: (client.projectsCount || 0) + projectCount,
              objectsCount: (client.objectsCount || 0) + objectCount
            }
          : client
      ),
      filteredClients: state.filteredClients.map(client => 
        client.id === clientId 
          ? { 
              ...client, 
              projectsCount: (client.projectsCount || 0) + projectCount,
              objectsCount: (client.objectsCount || 0) + objectCount
            }
          : client
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
            const previousFiltered = get().filteredClients;
           
            set((state) => ({
              clients: state.clients.filter(client => client.id !== id),
              filteredClients: state.filteredClients.filter(client => client.id !== id)
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
                useNotificationStore.getState().addNotification(
                  'Klient bol úspešne odstránený',
                  'success',
                  "clients",
                  3000
                );
              }
              
            }
            catch(error){
              console.error("error deleting client:",error);
              set({
                clients: previousClients,
                filteredClients: previousFiltered,
                error: "Nepodarilo sa odstrániť klienta"
              });
              
              useNotificationStore.getState().addNotification(
                'Nepodarilo sa odstrániť klienta',
                'error',
                "clientDetails",
                4000
              );
            }
          }
        }
      ]
    );
  }
}));