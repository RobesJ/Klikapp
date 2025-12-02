import { supabase } from '@/lib/supabase';
import { User } from "@/types/generics";
import { Chimney, ObjectWithRelations, ProjectWithRelations } from '@/types/projectSpecific';
import { addDays, format } from 'date-fns';
import { create } from 'zustand';
import { useClientStore } from './clientStore';

interface ProjectFilters {
  type: string[];
  state: string[];
  users: string[];
  dateFrom: string | null;
  dateTo: string | null;
  searchQuery: string;
}

interface ProjectStore {
  projects: ProjectWithRelations[];
  filteredProjects: ProjectWithRelations[];
  assignedProjects: ProjectWithRelations[];
  unassignedProjects: ProjectWithRelations[];
  filters: ProjectFilters;
  availableUsers: User[];

  filterCache: Map<string, {
    data: ProjectWithRelations[];
    timestamp:number;
    hasMore:boolean;
  }>;

  hasMore: boolean;
  currentPage: number;
  pageSize: number;
  totalCount: number | null;

  initialLoading : boolean;
  backgroundLoading: boolean;
  lastFetch: number;
  error: string | null;
  
  fetchProjects: (limit: number) => Promise<void>;
  fetchUserProjects: (userId: string, limit: number) => Promise<void>;
  fetchActiveProjects: (limit: number) => void;
  fetchAvailableUsers: () => Promise<void>; // New function to fetch users
  fetchAssignedProjects: (date: Date) => Promise<void>;
  fetchUnassignedProjects: (date: Date) => Promise<void>;
  assignProjectToDate: (projectId: string, date: Date) => Promise<void>;
  unassignProject: (projectId: string) => Promise<void>;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  clearFilters: () => void;
  addProject: (project: ProjectWithRelations) => void;
  updateProject: (id: string, project: ProjectWithRelations) => void;
  deleteProject: (id: string) => void;
  applySmartFilters: (filters: ProjectFilters, limit?:number) => Promise<void>;
  invalidateFilterCache: (filterKey?: string) => void;
  loadMoreFiltered: () => Promise<void>;
  removeFilter: (filterType: "type"  | "state", value: string) => void,
  toggleTypeFilter: (type: string) => void;
  toggleStateFilter: (state: string) => void;
  toggleUserFilter: (userId: string) => void; // New toggle for user filter
}

const initialFilters: ProjectFilters = {
  type: [],
  state: [],
  users: [],
  dateFrom: null,
  dateTo: null,
  searchQuery: '',
};

function getFilterKey(filters: ProjectFilters): string {
  return JSON.stringify({
    type: filters.type.sort(),
    state: filters.state.sort(),
    users: filters.users.sort(),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    searchQuery: filters.searchQuery
  });
};

const CACHE_DURATION = 300000; // 5 min

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: [],
  filteredProjects: [],
  assignedProjects: [],
  unassignedProjects: [],
  filters: initialFilters,
  availableUsers: [],

  hasMore: true,
  currentPage: 0,
  pageSize: 50,
  totalCount: null,

  initialLoading: false,
  backgroundLoading: false,
  lastFetch: 0,
  error: null,
  filterCache: new Map(),

  fetchAvailableUsers: async() =>{
    try{
      const {data, error} = await supabase
        .from("user_profiles")
        .select("id, name, email")
        .order("name", {ascending: true});
      
      if(error) throw error;

      set({availableUsers: data || []});
    }
    catch(error: any){
      console.error("Error fetching users:", error);
    }
  },

  fetchAssignedProjects: async(date: Date) => {
    set({backgroundLoading: true});
    try{
      const dateString = format(date, "yyyy-MM-dd");

      const {data, error} = await supabase
        .from("projects")
        .select(`
          *,
          clients (*),
          project_assignments (
            user_profiles (id, name, email)
          ),
          project_objects (
            objects (
              id,
              client_id,
              address,
              city, 
              streetNumber,
              country,
              chimneys (
                id,
                chimney_types (id, type, labelling),
                placement,
                appliance,
                note
              )
            )
          )
        `)
        .in("state", ["Naplánovaný", "Aktívny"])
        .eq("start_date", dateString)
        .order("created_at", {ascending: false});
  
      if(error) throw error;

      const transformedProjects = transformProjects(data || []);

      set({
        assignedProjects: transformedProjects,
        backgroundLoading: false
      });
    }
    catch(error: any){
      console.error("Error fetching assigned projects:", error);
      set({backgroundLoading: false, error: error.message});
    }
  },

  fetchUnassignedProjects: async(date: Date) => {
    set({backgroundLoading: true});
    try{
      const dateString = format(date, "yyyy-MM-dd");
      const futureDate = format(addDays(date, 30), "yyyy-MM-dd");

      const {data, error} = await supabase
        .from("projects")
        .select(`
          *,
          clients (*),
          project_assignments (
            user_profiles (id, name, email)
          ),
          project_objects (
            objects (
              id,
              client_id,
              address,
              city, 
              streetNumber,
              country,
              chimneys (
                id,
                chimney_types (id, type, labelling),
                placement,
                appliance,
                note
              )
            )
          )
        `)
        .eq("state", "Nový")
        .or(`scheduled_date.lte.${dateString},and(scheduled_date.gte.${dateString},scheduled_date.lte.${futureDate})`)
        .order('scheduled_date', { ascending: true });

  
      if(error) throw error;

      const transformedProjects = transformProjects(data || []);

      set({
        unassignedProjects: transformedProjects,
        backgroundLoading: false
      });
    }
    catch(error: any){
      console.error("Error fetching unassigned projects:", error);
      set({backgroundLoading: false, error: error.message});
    }
  },

  assignProjectToDate: async(projectId: string, date: Date) => {
    try{
      const dateStr = format(date, 'yyyy-MM-dd');
      const {error} = await supabase
        .from("projects")
        .update({
          state: "Naplánovaný",
          start_date: dateStr
        })
        .eq("id", projectId);

      if(error) throw error;

      await get().fetchAssignedProjects(date);
      await get().fetchUnassignedProjects(date);

      get().invalidateFilterCache();
    }
    catch(error: any){
      console.error("Error assigning project to date:", error);
      throw error;
    }
  },

  unassignProject: async(projectId: string) => {
    try{
      
      const {error} = await supabase
        .from("projects")
        .update({
          state: "Nový",
          start_date: null
        })
        .eq("id", projectId);

      if(error) throw error;

      get().invalidateFilterCache();
    }
    catch(error: any){
      console.error("Error assigning project to date:", error);
      throw error;
    }
  },

  fetchActiveProjects: async(limit) => {
    set({initialLoading: true});
    try {
      const { data, error, count } = await supabase
        .from("projects")
        .select(`
          *,
          clients (*),
          project_assignments (
            user_profiles (id, name, email)
          ),
          project_objects (
            objects (
              id,
              client_id,
              address,
              city, 
              streetNumber,
              country,
              chimneys (
                id,
                chimney_types (id, type, labelling),
                placement,
                appliance,
                note
              )
            )
          )
        `, {count: "exact"})
        .in("state", ["Aktívny","Prebieha"])
        .limit(limit);
        
        if (error) throw error;

        if (data) {
          const transformedProjects = transformProjects(data);
          
          set({
            initialLoading: false,
            projects: transformedProjects,
            filteredProjects: transformedProjects,
            hasMore: (count || 0) > limit,
            totalCount: count,
            currentPage: 1,
          });
        }
        
    }
    catch (error: any){
      console.error('Final error message:', error?.message);
      set({
        initialLoading: false, 
        error: error?.message || JSON.stringify(error)
      });
    }
  },

  fetchUserProjects: async (userId = "fsfdsgs", limit = 50) => {

  },


  fetchProjects: async (limit = 50) => {
    const { projects, currentPage , pageSize, backgroundLoading, lastFetch } = get();
    const now = Date.now();

    if (projects.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using fetched projects');
      return
    }
    if (backgroundLoading) {
      console.log('Already fetching...');
      return;
    }

    //const start = currentPage * pageSize;
    //const end = start + limit - 1;

    if (projects.length === 0){
      set({ initialLoading: true, error: null});
    }
    else{
      set({ backgroundLoading: true, error: null });
    }

    try {
      console.log('Fetching projects from database...');
      
      const { data: projectsData, error: projectError, count } = await supabase
        .from("projects")
        .select(`
          *,
          clients (*),
          project_assignments (
            user_profiles (id, name, email)
          ),
          project_objects (
            objects (
              id,
              client_id,
              address,
              city, 
              streetNumber,
              country,
              chimneys (
                id,
                chimney_types (id, type, labelling),
                placement,
                appliance,
                note
              )
            )
          )
        `, {count: "exact"})
        .limit(limit)
        .order('created_at', { ascending: false });

      if (projectError) throw projectError;

      const transformedProjects = transformProjects(projectsData);
    
      const existingIds = new Set(projects.map(p => p.project.id));
      const newProjects = transformedProjects.filter(p => !existingIds.has(p.project.id))
      
      const updateProjects = [...projects, ...newProjects];
      set({ 
        projects: updateProjects,
        backgroundLoading: false,
        initialLoading: false,
        hasMore: updateProjects.length < (count || 0) ,
        lastFetch: now
      });
      
      get().applySmartFilters(get().filters);
      
      console.log(`Fetched ${transformedProjects.length} projects`);
    } 
    catch (error: any) {
      console.error('Final error message:', error.message);
      set({ 
        error: error?.message || JSON.stringify(error), 
        backgroundLoading: false,
        initialLoading: false
      });
    }
  },

  loadMoreFiltered: async () => {
    const { filters, filteredProjects, filterCache } = get();
    const filterKey = getFilterKey(filters);
    const cached = filterCache.get(filterKey);

    if(!cached?.hasMore){
      console.warn("No more projects to load");
      return;
    }

    set({
      backgroundLoading: true
    });

    try {
      const offset = filteredProjects.length;
      const limit = 30;
  
      let query = supabase
        .from("projects")
        .select(`
          *,
          clients (*),
          project_assignments (user_profiles (*)),
          project_objects (objects (*, chimneys (*, chimney_types (*))))
        `, { count: "exact" })
        .limit(limit)
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
  
      // Apply filters
      if (filters.type.length > 0) {
        query = query.in("type", filters.type);
      }
      if (filters.state.length > 0) {
        query = query.in("state", filters.state);
      }
      if (filters.dateFrom) {
        query = query.gte("scheduled_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("scheduled_date", filters.dateTo);
      }
  
      const { data, error, count } = await query;
      if (error) throw error;
  
      let transformed = transformProjects(data || []);
      
      if(filters.users.length > 0){
        transformed = transformed.filter(p => 
          p.users.some(user => filters.users.includes(user.id))
        );
      }

      // Client-side search filtering
      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        transformed = transformed.filter(p => 
          p.client.name.toLowerCase().includes(searchLower) ||
          p.project.note?.toLowerCase().includes(searchLower) ||
          p.objects.some(obj => obj.object.address?.toLowerCase().includes(searchLower))
        );
      }
  
      const updated = [...filteredProjects, ...transformed];
  
      set(state => {
        const newCache = new Map(state.filterCache);
        newCache.set(filterKey, {
          data: updated,
          timestamp: Date.now(),
          hasMore: updated.length < (count || 0),
        });
  
        return {
          filterCache: newCache,
          filteredProjects: updated,
          backgroundLoading: false,
        };
      });
  
    } catch (error: any) {
      console.error('Load more error:', error);
      set({ backgroundLoading: false });
    }
  },

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters }
    }));
    get().applySmartFilters(get().filters);
  },

  
  clearFilters: () => {
    set({ filters: initialFilters });
    get().applySmartFilters(get().filters);
  },

  applySmartFilters: async (filters: ProjectFilters, limit = 30) => {
    const filterKey = getFilterKey(filters);
    const cached = get().filterCache.get(filterKey);

    if (cached && Date.now() - cached.timestamp < CACHE_DURATION){
      if (cached.data.length >= limit) {
        set({ filteredProjects: cached.data.slice(0,limit) });
        return;
      }
    }

    set({backgroundLoading: true});

    try{
      let query = supabase
      .from("projects")
      .select(`
        *,
        clients (*),
        project_assignments (
          user_profiles (id, name, email)
        ),
        project_objects (
          objects (
            id,
            client_id,
            address,
            city, 
            streetNumber,
            country,
            chimneys (
              id,
              chimney_types (id, type, labelling),
              placement,
              appliance,
              note
            )
          )
        )
      `, {count: "exact"})
      .limit(limit)
      .order('created_at', { ascending: false });

      if (filters.type.length > 0){
        query = query.in("type", filters.type);
      }

      if (filters.state.length > 0){
        query = query.in("state", filters.state);
      }

      const {data, error, count} = await query;

      if (error) throw error;

      let transformed = transformProjects(data);

      if (filters.users.length > 0) {
        transformed = transformed.filter(p =>
          p.users.some(user => filters.users.includes(user.id))
        );
      }

      if (filters.searchQuery && transformed.length > 0){
        const searchLower = filters.searchQuery.toLowerCase();
        transformed = transformed.filter(p =>
          p.client.name.toLowerCase().includes(searchLower) ||
          //p.client.some( => c.phone?.toLowerCase().includes(searchLower)) ||
          p.objects.some(obj => obj.object.city?.toLowerCase().includes(searchLower))
        );
      }
      set(state => {
        const newCache = new Map(state.filterCache);
        newCache.set(filterKey, {
          data: transformed,
          timestamp: Date.now(),
          hasMore: transformed.length < (count || 0),
        });
        
        return {
          filterCache: newCache,
          filteredProjects: transformed,
          backgroundLoading:false
        };
      });
    }
    catch (error: any){
      console.error("Filter error:",error);
      set({ 
        backgroundLoading:false,
        error: error.message 
      });
    }
  },

  invalidateFilterCache(filterKey?: string){
    if (filterKey) {
      set(state => {
        const newCache = new Map(state.filterCache);
        newCache.delete(filterKey);
        return { filterCache: newCache };
      });
    }
    else {
      set({filterCache: new Map()});
    }
  },
    
  toggleTypeFilter:(type: string) => {
      set((state) => {
        const types = state.filters.type.includes(type)
          ? state.filters.type.filter(t => t !== type)  // Remove type from filter
          : [...state.filters.type, type];                 // Add new type to filter

        return {
          filters: { ...state.filters, type: types}
        };
      });
      get().applySmartFilters(get().filters);
  },
  

  toggleStateFilter: (state: string) => {
    set((currentState) => {
      const states = currentState.filters.state.includes(state)
        ? currentState.filters.state.filter(t => t !== state)  // Remove state from filter
        : [...currentState.filters.state, state];                 // Add new state to filter

      return {
        filters: { ...currentState.filters, state: states}
      };
    });
    get().applySmartFilters(get().filters);
  },

  toggleUserFilter: (userId: string) => {
    set((state) => {
      const users = state.filters.users.includes(userId)
        ? state.filters.users.filter(u => u !== userId)
        : [...state.filters.users, userId];

      return {
        filters: { ...state.filters, users: users}
      };
    });
    get().applySmartFilters(get().filters);
  },

  removeFilter: (filterType: "type" | "state", value: string) => {
    set((state) => {
      if (filterType === "type"){
        return {
          filters: {
            ...state.filters,
            type: state.filters.type.filter(t=> t !== value)
          }
        };
      } else if(filterType === "state") {
        return {
          filters: {
            ...state.filters,
            state: state.filters.state.filter(s=> s !== value)
          }
        };
      } else{
        return {
          filters: {
            ...state.filters,
            users: state.filters.users.filter(u => u !== value)
          }
        };
      }
    });
    get().applySmartFilters(get().filters);
  },

  addProject: (project) => {
    set((state) => ({
      projects: [project, ...state.projects]
    }));
    get().applySmartFilters(get().filters);
  },
  
  updateProject: (id: string, updatedProject) => {
    set((state) => ({
      projects: state.projects.map(p => 
        p.project.id === id ? updatedProject : p
      )
    }));
    get().applySmartFilters(get().filters);
  },

  // delete project with optimistic updates
  deleteProject: async(id: string) => {
    const previousProjects = get().projects;
    const previousFiltered = get().filteredProjects;

    set((state) => ({
      projects: state.projects.filter(p => p.project.id !== id),
      filteredProjects: state.filteredProjects.filter(p => p.project.id !== id),
    }));
    get().applySmartFilters(get().filters);

    try{
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id)
        .select();

      if (error) throw error;
      
      set({
        filterCache: new Map(),
        lastFetch: 0
      });

      useClientStore.getState().lastFetch = 0;
    }
    catch (error) {
      console.error("Nastala chyba pri mazani projektu:", error);
      // rollback if error
      set(
        {
          projects: previousProjects,
          filteredProjects: previousFiltered
        });
      //get().applySmartFilters(get().filters);
      throw error;
    }
  }
}));


function transformProjects(data: any): ProjectWithRelations[]{
  const projectWithRelations: ProjectWithRelations[] = data.map((projectItem: any) => {
    const users: User[] = projectItem.project_assignments
      ?.map((pa: any) => pa.user_profiles)
      .filter(Boolean) || [];

    const objects: ObjectWithRelations[] = projectItem.project_objects
      ?.map((po: any) => {
        if (!po.objects) return null;
        
        const chimneys: Chimney[] = po.objects.chimneys
          ?.map((c: any) => ({
            id: c.id,
            type: c.chimney_types?.type || null,
            labelling: c.chimney_type?.labelling || null,
            appliance: c.appliance,
            placement: c.placement,
            note: c.note
          }))
          .filter(Boolean) || [];
        
        return {
          object: po.objects,
          chimneys: chimneys
        };
      })
      .filter(Boolean) || [];
  
    return {
      project: projectItem,
      client: projectItem.clients,
      users: users,
      objects: objects,
    };
  });
  return projectWithRelations;
}