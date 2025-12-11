import { supabase } from '@/lib/supabase';
import { User } from "@/types/generics";
import { Chimney, ObjectWithRelations, ProjectWithRelations } from '@/types/projectSpecific';
import { addDays, format, isBefore, parseISO } from 'date-fns';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useClientStore } from './clientStore';

export interface ProjectFilters {
  type: string[];
  state: string[];
  users: string[];
  cities?: string[];
  dateFrom?: string | null;
  dateTo?: string | null;
  searchQuery?: string;
}

interface ProjectsMetadata {
  active: {
    allLoaded: boolean,
    lastFetch: number,
    count: number
  },
  planned: {
    allLoaded: boolean,
    lastFetch: number,
    dateRange: {start: string, end: string} | null,
    futureDate: string,
    count: number,
  },
  projects: {
    currentOffset: number;
    hasMore: boolean;
    totalCount: number | null;
  }
}

interface ProjectStore {
  projects: Map<string, ProjectWithRelations>;

  metadata: ProjectsMetadata;
  filters: ProjectFilters;
  availableUsers: User[];

  initialLoading : boolean;
  backgroundLoading: boolean;
  error: string | null;

  // Fetching functions
  fetchActiveProjects:  () => Promise<void>;
  fetchPlannedProjects: () => Promise<void>; 
  fetchAvailableUsers:  () => Promise<void>;

  //Filter functions
  getFilteredProjects: (filters: ProjectFilters) => ProjectWithRelations[];
  applySmartFilters: (filters: ProjectFilters, amount: number) => Promise<void>;
  loadMore: (filters: ProjectFilters, amount: number) => void;
  getAssignedProjects: (date: Date) => ProjectWithRelations[];
  getUnassignedProjects: (date: Date) => ProjectWithRelations[];

  // Filter management
  setFilters: (filters: Partial<ProjectFilters>) => void;         
  clearFilters: () => void;
  toggleTypeFilter: (type: string) => void;
  toggleStateFilter: (state: string) => void;
  toggleUserFilter: (userId: string) => void;
  removeFilter: (filterType: "type"  | "state" | "users", value: string) => void,

  // Project management
  addProject: (project: ProjectWithRelations) => void;
  updateProject: (id: string, project: ProjectWithRelations) => void;
  deleteProject: (id: string) => Promise<void>;

  // Planning functions
  assignProjectToDate: (projectId: string, date: Date) => Promise<void>; 
  unassignProject: (projectId: string) => Promise<void>;                 
}

const initialFilters: ProjectFilters = {
  type: [],
  state: [],
  users: [],
  dateFrom: null,
  dateTo: null,
  searchQuery: '',
};

const CACHE_DURATION = 300000; // 5 min

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: new Map(),
  metadata: {
    active: {
      allLoaded: false,
      lastFetch: 0,
      count: 0
    },
    planned: {
      allLoaded: false,
      lastFetch: 0,
      dateRange: null,
      futureDate: format(new Date(), "yyyy-MM-dd"),
      count: 0
    },
    projects: {
      currentOffset: 0,
      hasMore: true,
      totalCount: null
    }
  },

  filters: initialFilters,
  availableUsers: [],
  initialLoading: false,
  backgroundLoading: false,
  error: null,

  // ======== FETCHING FUNCTIONS ========

  // Fetch all the projects that has state "Aktivny" | "Prebieha" | "Pozastaveny" ("should be less then 100")
  // this function is called during initial loading
  fetchActiveProjects: async() => {
    const {metadata} = get();
    const now = Date.now();

    if (metadata.active.allLoaded && (now - metadata.active.lastFetch) < CACHE_DURATION){
      console.log("Using cached active projects");
      return;
    }

    set({
      initialLoading: true, 
      error: null
    });

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
        .in("state", ["Naplánovaný", "Prebieha", "Pozastavený"])
        .order("created_at", {ascending: false});
        
        if (error) throw error;

        
        const transformedProjects = transformProjects(data || []);
        const projectsMap = new Map(get().projects);
        //console.log(transformedProjects);
        transformedProjects.forEach(p => projectsMap.set(p.project.id, p));

        set({
          projects: projectsMap,
          metadata: {
            ...get().metadata,
            active: {
              allLoaded: true,
              lastFetch: now,
              count: count || 0
            }
          },
          initialLoading: false,
        });
        console.log(`Loaded ${transformedProjects.length} active projects`);
    }
    catch (error: any){
      console.error('Error fetching active projects:', error);
      set({
        initialLoading: false, 
        error: error.message
      });
    }
  },

  // Fetch all the projects that has state "Novy" | "Naplanovany"
  // This function is called during background loading
  fetchPlannedProjects: async() => {
    const {metadata} = get();
    const now = Date.now();
    const today = format(new Date(), "yyyy-MM-dd");

    if (metadata.planned.allLoaded && (now - metadata.planned.lastFetch) < CACHE_DURATION){
      if(metadata.planned.dateRange){
        const rangeStart = metadata.planned.dateRange.start;
        const midpoint = format(addDays(parseISO(rangeStart),15), "yyyy-MM-dd");

        if (today < midpoint) {
          console.log("Using cached planned projects");
          return;
        }
      }
    }

    set({
      backgroundLoading: true, 
      error: null
    });

    try {
      const today      = format(new Date(), "yyyy-MM-dd");
      const futureDate = format(addDays(new Date(),30), "yyyy-MM-dd");

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
        .or(`state.eq.Nový,and(state.eq.Naplánovaný,start_date.lte.${futureDate})`)
        .order("scheduled_date", {ascending: true});
        
        if (error) throw error;
        
        const transformedProjects = transformProjects(data || []);
        const projectsMap = new Map(get().projects);

        transformedProjects.forEach(p => projectsMap.set(p.project.id, p));

        set({
          projects: projectsMap,
          metadata: {
            ...get().metadata,
            planned: {
              allLoaded: true,
              lastFetch: now,
              dateRange: {start: today, end: futureDate},
              futureDate: futureDate,
              count: count || 0
            }
          },
          backgroundLoading: false,
        });
        console.log(`Loaded ${transformedProjects.length} planned projects`);
    }
    catch (error: any){
      console.error('Error fetching planned projects:', error);
      set({
        backgroundLoading: false, 
        error: error.message
      });
    }
  },

  // Fetch all the users in aplication (amount between 5-20)
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

  //    ======== FILTER FUNCTIONS ========
  getFilteredProjects(filters: ProjectFilters) {
    const {projects} = get();
    let results = Array.from(projects.values());

    if (filters.type.length > 0){
      results = results.filter(p => filters.type.includes(p.project.type));
    }

    if (filters.state.length > 0){
      results = results.filter(p => filters.state.includes(p.project.state));
    }

    if (filters.users.length > 0) {
      results = results.filter(p =>
        p.users.some(user => filters.users.includes(user.id))
      );
    }

    if (filters.dateFrom) {
      results = results.filter(p =>
        p.project.scheduled_date &&  p.project.scheduled_date >= filters.dateFrom!
      );
    }

    if (filters.dateTo) {
      results = results.filter(p =>
        p.project.scheduled_date &&  p.project.scheduled_date <= filters.dateTo!
      );
    }

    if (filters.searchQuery){
      const searchLower = filters.searchQuery.toLowerCase();
      results = results.filter(p =>
        p.client.name.toLowerCase().includes(searchLower) ||
        // p.client.phone.includes(searchLower) ||
        p.objects.some(obj =>
          obj.object.city?.toLowerCase().includes(searchLower) ||
          obj.object.address?.toLowerCase().includes(searchLower)
        )
      );
    }
    //if (results.length <  30){
    //  const amountToFetch = 30 - results.length;
    //  get().applySmartFilters(filters, amountToFetch);
    //}
    return results;
  },
  
  applySmartFilters: async (filters: ProjectFilters, amount: number) => {
    const {metadata, backgroundLoading} = get();
    if(backgroundLoading) return;
    set({backgroundLoading: true});

    try{
      const currentOffset = metadata.projects.currentOffset;
    
      const {data, error, count} = isInitialFilter(filters)
        ? await buildQuery(metadata.planned.futureDate, 0, amount)
        : await buildFilteredQuery(filters, currentOffset, amount);
      

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
          p.client.phone?.toLowerCase().includes(searchLower) ||
          p.objects.some(obj => obj.object.city?.toLowerCase().includes(searchLower))
        );
      }

      const projectsMap = new Map(get().projects);
      transformed.forEach(p => projectsMap.set(p.project.id, p));

      const newOffset = currentOffset + transformed.length;
      const hasMore = newOffset < (count || 0);

      set({
        projects: projectsMap,
        backgroundLoading: false,
        metadata: {
          ...get().metadata,
          projects: {
            ...metadata.projects,
            currentOffset: newOffset,
            hasMore: hasMore,
            totalCount: count
          }
        }
      })
    }
    catch (error: any){
      console.error("SmartFilters error:", error);
      set({ 
        backgroundLoading: false,
        error: error.message 
      });
    }
  },

  // Load more projects (pagination)
  loadMore: async (filters: ProjectFilters) => {
    const { backgroundLoading, metadata } = get();

    if(backgroundLoading) return;
    if(!metadata.projects.hasMore) return;

    set({
      backgroundLoading: true
    });

    try {
      const limit = 30;
      const previousFutureDay = metadata.planned.futureDate;

      let query;
      if (isInitialFilter(filters)){
        query = buildQuery(metadata.planned.futureDate, metadata.projects.currentOffset, limit);
      }
      else {
        query = buildFilteredQuery(filters, metadata.projects.currentOffset, limit);
      }
  
      const { data, error, count } = await query;
      if (error) throw error;
  
      let transformed = transformProjects(data || []);
      const projectsMap = new Map(get().projects);
      transformed.forEach(p => projectsMap.set(p.project.id, p));

      let newOffset = metadata.projects.currentOffset + transformed.length;
      let hasMore = newOffset < (count || 0);
      let updatedFutureDate = previousFutureDay;

      const isToday = updatedFutureDate === format(new Date(), "yyyy-MM-dd");

      // if the updatedFutureDate is today, the fetch planned projects was never called
      // first query gets values that are les then today within a range of offset and limit
      // after that offset is reset, the new future date is highest value found in col scheduled date
      // and the query gets values that are higher than this future date
      if (isToday){
        newOffset = 0;
        hasMore = true
      }
      if(isInitialFilter(filters) && transformed.length > 0){
        updatedFutureDate = transformed.reduce((max, project) => {
          const schedDate = project.project.scheduled_date;
          if(!schedDate) return max;
          return schedDate > max ? schedDate : max;
        }, metadata.planned.futureDate);
      }

      set({
        projects: projectsMap,
        metadata: {
          ...get().metadata,
          projects: {
            ...metadata.projects,
            currentOffset: newOffset,
            hasMore: hasMore,
            totalCount: count
          },
          planned: {
            ...metadata.planned,
            futureDate: updatedFutureDate
          }
        },
        backgroundLoading: false
      });
      
      return transformed;
    } catch (error: any) {
      console.error('Load more error:', error);
      set({ 
        backgroundLoading: false,
        error: error.message
       });
    }
  },

  getAssignedProjects: (date: Date) => {
    const {projects, metadata} = get();
    const dateString = format(date, "yyyy-MM-dd");
    
    const midpoint = metadata.planned.dateRange?.start 
                    ? format(addDays(parseISO(metadata.planned.dateRange.start), 15),"yyyy-MM-dd") 
                    : null;
    if(midpoint && dateString >= midpoint){
      get().fetchPlannedProjects();
    }
    return Array.from(projects.values()).filter(p =>
      p.project.state === "Naplánovaný" &&
      p.project.start_date === dateString
    );
  },

  getUnassignedProjects: (date: Date) => {
    const {projects} = get();
    const futureDate = format(addDays(date, 30), "yyyy-MM-dd");

    const unassignedProjects =  Array.from(projects.values()).filter(p =>
      p.project.state === "Nový" &&
      p.project.scheduled_date &&
      p.project.scheduled_date <= futureDate 
    ).sort((a,b) =>
      (a.project.scheduled_date || "").localeCompare(b.project.scheduled_date || "")
    );
    return unassignedProjects;
  },

  // ======== FILTER MANAGEMENT FUNCTIONS ========
  setFilters: (newFilters) => {
    set(state => {
      const filtersChanged = JSON.stringify(state.filters) !== JSON.stringify({...state.filters, ...newFilters});
      return {
        filters: { ...state.filters, ...newFilters },
        metadata: {
          ...state.metadata,
          projects: {
            ...state.metadata.projects,
            currentOffset: filtersChanged ? 0 : state.metadata.projects.currentOffset,
            hasMore: filtersChanged ? true : state.metadata.projects.hasMore,
            totalCount: filtersChanged ? null : state.metadata.projects.totalCount,
          }
        }
      }
    });
  },
  
  clearFilters: () => {
    set({ filters: initialFilters,
        metadata: {
          ...get().metadata,
          projects: {
            currentOffset: 0,
            hasMore: true,
            totalCount: null
          }
        }
     });
  },

  toggleTypeFilter:(type: string) => {
      set(state => {
        const types = state.filters.type.includes(type)
          ? state.filters.type.filter(t => t !== type)  // Remove type from filter
          : [...state.filters.type, type];              // Add new type to filter

        return {
          filters: { ...state.filters, type: types}
        };
      });
  },
  
  toggleStateFilter: (state: string) => {
    set(currentState => {
      const states = currentState.filters.state.includes(state)
        ? currentState.filters.state.filter(t => t !== state)  // Remove state from filter
        : [...currentState.filters.state, state];              // Add new state to filter

      return {
        filters: { ...currentState.filters, state: states}
      };
    });
  },

  toggleUserFilter: (userId: string) => {
    set(state => {
      const users = state.filters.users.includes(userId)
        ? state.filters.users.filter(u => u !== userId)
        : [...state.filters.users, userId];

      return {
        filters: { ...state.filters, users: users}
      };
    });
  },

  removeFilter: (filterType: "type" | "state" | "users", value: string) => {
    set(state => {
      return {
        filters: {
          ...state.filters,
          [filterType]: state.filters[filterType].filter((v: string) => v !== value)
        }
      }
    });
  },

  // ======== PROJECT MANAGEMENT FUNCTIONS ========
  addProject: (project) => {
    set(state => {
      const newMap = new Map(state.projects);
      newMap.set(project.project.id, project);
      return {projects: newMap};
      //projects: [project, ...state.projects]
    });
    //get().applySmartFilters(get().filters);
  },
  
  updateProject: (id: string, updatedProject) => {
    set(state => {
      const newMap = new Map(state.projects);
      newMap.set(id, updatedProject);
      return {projects: newMap};
    });
    //get().applySmartFilters(get().filters);
  },

  // delete project with optimistic updates
  deleteProject: async(id: string) => {
    Alert.alert(
      'Odstrániť objekt',
      'Naozaj chcete odstrániť tento projekt?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odstrániť',
          style: 'destructive',
          onPress: async() =>{
            const previousProjects = new Map(get().projects);
                  
            set(state => {
              const newMap = new Map(state.projects);
              newMap.delete(id);
              return {projects: newMap};
            });
            //get().applySmartFilters(get().filters);
          
            try{
              const { error } = await supabase
                .from("projects")
                .delete()
                .eq("id", id)
                .select();
            
              if (error) throw error;
              
              set(state => ({
                metadata:{
                  ...get().metadata,
                  active: {...state.metadata.active, lastFetch: 0},
                  planned: {...state.metadata.planned, lastFetch: 0}
                }
              }));
            
              useClientStore.getState().lastFetch = 0;
              Alert.alert('Úspech', 'Projekt bol odstránený');
            }
            catch (error) {
              console.error("Error deleting project:", error);
              Alert.alert('Chyba', 'Nepodarilo sa odstrániť projekt');
              // rollback if error
              set({
                  projects: previousProjects
                });
              throw error;
            }
          }
        }
      ]
    );
  },

  // ======== PLANNING FUNCTIONS ========
  assignProjectToDate: async(projectId: string, date: Date) => {
    try{
      const dateStr = format(date, 'yyyy-MM-dd');
      const today = new Date();
      let newState;

      if(isBefore(date, today)){
        newState = "Prebieha"
      }
      else{
        newState= "Naplánovaný"
      }

      const {error} = await supabase
        .from("projects")
        .update({
          state: newState,
          start_date: dateStr
        })
        .eq("id", projectId);
      if(error) throw error;
      
      const project = get().projects.get(projectId);
      if (project) {
        const updated = {
          ...project,
          project: {
            ...project.project,
            state: newState,
            start_date: dateStr
          }
        };
        console.log('Updated project in store:', updated.project.start_date);
        get().updateProject(projectId, updated);
      }
      
    }
    catch(error: any){
      console.error("Error assigning project:", error);
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
      
      const project = get().projects.get(projectId);
      if (project) {
        const updated = {
          ...project,
          project: {
            ...project.project,
            state: "Nový",
            start_date: null
          }
        };
        get().updateProject(projectId, updated);
      }
    }
    catch(error: any){
      console.error("Error assigning project to date:", error);
      throw error;
    }
  },
}));

function transformProjects(data: any): ProjectWithRelations[]{
  const projectWithRelations: ProjectWithRelations[] = data
    .filter((projectItem: any) => projectItem && projectItem.id && projectItem.clients)
    .map((projectItem: any) => {
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
            labelling: c.chimney_types?.labelling || null,
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

function isInitialFilter(filters: ProjectFilters) : boolean {
  return (
    filters.type.length === 0 &&
    filters.state.length === 0 &&
    filters.users.length === 0 &&
    filters.dateFrom === null &&
    filters.dateTo === null &&
    filters.searchQuery === ''
  );
}

// Query building functions
// query with initial filters
async function buildQuery (startDate: string, offset: number, limit: number) {
  const isToday = startDate === format(new Date(), "yyyy-MM-dd");
  const gOrl = isToday ? "lte" : "gte";
  
  return supabase
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
      .or(`state.eq.Ukončený,state.eq.Zrušený,and(state.eq.Nový,scheduled_date.${gOrl}.${startDate})`)
      .range(offset, offset + limit -1)
      .order('scheduled_date', { ascending: isToday ? false : true })
}

async function buildFilteredQuery(filters: ProjectFilters, offset: number, limit: number) {
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
      .range(offset, offset + limit -1 )
      .order('created_at', { ascending: false });

      if (filters.type.length > 0){
        query = query.in("type", filters.type);
      }

      if (filters.state.length > 0){
        query = query.in("state", filters.state);
      }

      if (filters.dateFrom) {
        query = query.gte("scheduled_date", filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte("scheduled_date", filters.dateTo);
      }

      return query;
}