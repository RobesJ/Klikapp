import { supabase } from '@/lib/supabase';
import { useNotificationStore } from "@/store/notificationStore";
import { Client } from '@/types/generics';
import { Alert } from 'react-native';
import { create } from 'zustand';

interface ClientFilters {
  searchQuery: string;
}

export type LockClientResult =
  | {
      success: true;
    }
  | {
      success: false;
      lockedByName: string | null;
    };

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
  
  fetchClients: (limit: number) => Promise<void>;
  setFilters: (filters: Partial<ClientFilters>) => void;
  clearFilters: () => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, client: Client) => void;
  deleteClient: (id: string) => void;
  applyFilters: () => Client[];
  lookForClientInDBS: () => void;
  loadMore: () => Promise<void>;
  lockClient: (id: string, userID: string, userName: string) => Promise<LockClientResult>;
  unlockClient: (id: string, userID: string) => Promise<void>;
  // refreshClientLock: (id: string, userID: string) => Promise<void>;
  updateClientCounts: (id: string, projectCount: number, objectCount: number) => void;
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

  fetchClients: async (limit) => {
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
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať klientov',
        'error',
        4000
      );
    }
  },
  
  lockClient: async (id: string, userID: string, userName: string) => {
    try{
      const {data, error} = await supabase.rpc("lock_client", {
        p_client_id: id,
        p_user_id: userID,
        p_user_name: userName
      });

      if (error) throw error;

      if (!data?.[0].locked){
        useNotificationStore.getState().addNotification(
          `Klienta upravuje používateľ ${data?.[0]?.locked_by_name}`,
          "warning",
          4000
        );
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
        )
    }));
  },

  setFilters: (newFilters) => {
    const { filters } = get(); 
    
    set({ filters: { ...filters, ...newFilters } });
    const filtered = get().applyFilters();
    set({ filteredClients: filtered });
  
    if (newFilters.searchQuery?.trim() && newFilters.searchQuery?.trim().length > 3 && filtered.length === 0) {
      get().lookForClientInDBS();
    }
  },

  clearFilters: () => {
    set({ filters: initialFilters });
    set({filteredClients: []});
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
          //offset: get().offset +1
        });
        console.log(`Found: ${filtered.length} matching clients`);
      } 
      catch (error: any) {
        console.error('Error searching for clients in dbs:', error.message);
        set({ error: error.message, loading: false });

        useNotificationStore.getState().addNotification(
          'Nepodarilo sa vyhľadať klientov',
          'error',
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
                useNotificationStore.getState().addNotification(
                  'Klient bol úspešne odstránený',
                  'success',
                  3000
                );
              }
              
            }
            catch(error){
              console.error("error deleting client:",error);
              set({
                clients: previousClients,
                error: "Nepodarilo sa odstrániť klienta"
              });
              
              useNotificationStore.getState().addNotification(
                'Nepodarilo sa odstrániť klienta',
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