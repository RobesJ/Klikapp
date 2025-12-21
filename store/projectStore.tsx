import { supabase } from '@/lib/supabase';
import { User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from '@/types/projectSpecific';
import { addDays, format, isBefore, parseISO } from 'date-fns';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useClientStore } from './clientStore';
import { useNotificationStore } from './notificationStore';

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
  filtered: {
    offset: number;
    hasMore: boolean;
  },
  planned: {
    lastFetch: number,
    dateRange: {start: string, end: string} | null,
    futureDate: string,
    count: number,
  },
  projects: {
    //currentOffset: number;
    hasMore: boolean;
    totalCount: number;
    futureDate: string;
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
  assignProjectToDate: (projectId: string, date: Date) => void; 
  unassignProject: (projectId: string) => Promise<void>;   
  changeStateOfAssignedProject: (projectId: string, date: Date) => Promise<void>; 
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
    filtered: {
      offset: 0,
      hasMore: true
    },
    planned: {
      lastFetch: 0,
      dateRange: null,
      futureDate: format(addDays(new Date(),30), "yyyy-MM-dd"),
      count: 0
    },
    projects: {
      hasMore: true,
      totalCount: 0,
      futureDate: format(addDays(new Date(),30), "yyyy-MM-dd")
    }
  },

  filters: initialFilters,
  availableUsers: [],
  initialLoading: false,
  backgroundLoading: false,
  error: null,

  // ======== FETCHING FUNCTIONS ========

  // Fetch all the projects that has state "Naplanovany dnes" | "Prebieha" | "Pozastaveny" ("should be less then 100")
  // this function is called during initial loading
  fetchActiveProjects: async() => {
    const {initialLoading} = get();
    const today = format(new Date(), "yyyy-MM-dd");

    if (initialLoading){
      console.log("Using cached active projects");
      return;
    }

    set({
      initialLoading: true, 
      error: null
    });

    try {
      const { data, error} = await supabase
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
        .or(`state.eq.Prebieha,state.eq.Pozastavený,and(state.eq.Naplánovaný,start_date.eq.${today})`)
        .order("created_at", {ascending: false});
        
        if (error) throw error;

        const transformedProjects = transformProjects(data || []);
        const projectsMap = new Map(get().projects);

        transformedProjects.forEach(p => projectsMap.set(p.project.id, p));
        
        set({
          projects: projectsMap,
          initialLoading: false,
        });
        console.log(`Fetched ${transformedProjects.length} active projects`);
    }
    catch (error: any){
      console.error('Error fetching active projects:', error);
      set({
        initialLoading: false, 
        error: error.message
      });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať aktívne projekty',
        'error',
        4000
      );
    }
  },

  // Fetch all the projects that has state "Novy" | "Naplanovany"
  // This function is called during background loading
  fetchPlannedProjects: async() => {
    const {metadata, backgroundLoading} = get();
    const now = Date.now();
    const today = format(new Date(), "yyyy-MM-dd");

    if (backgroundLoading && (now - metadata.planned.lastFetch) < CACHE_DURATION){
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
      // const futureDate = format(addDays(new Date(),30), "yyyy-MM-dd");

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
        .or(`and(state.eq.Nový,scheduled_date.lte.${metadata.planned.futureDate}),and(state.eq.Naplánovaný,start_date.lte.${metadata.planned.futureDate})`)
        .order("scheduled_date", {ascending: true});
        
        if (error) throw error;
        
        const transformedProjects = transformProjects(data || []);
        const projectsMap = new Map(get().projects);

        transformedProjects.forEach(p => {
          projectsMap.set(p.project.id, p);
        });
        //console.log(projectsMap.size);

        set({
          projects: projectsMap,
          metadata: {
            ...get().metadata,
            planned: {
              lastFetch: now,
              dateRange: {start: today, end: metadata.planned.futureDate},
              futureDate: metadata.planned.futureDate,
              count: count || 0
            },
            projects:{
              hasMore: true,
              totalCount: projectsMap.size,
              futureDate: metadata.planned.futureDate,
            }
          },
          backgroundLoading: false,
        });
        console.log(`Fetched ${transformedProjects.length} planned projects`);
    }
    catch (error: any){
      console.error('Error fetching planned projects:', error);
      set({
        backgroundLoading: false, 
        error: error.message
      });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať plánované projekty',
        'error',
        4000
      );
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
    return results;
  },
  
  applySmartFilters: async (filters: ProjectFilters, amount: number) => {
    const {metadata, backgroundLoading} = get();
    
    if(backgroundLoading || !metadata.projects.hasMore) return;
    
    set({backgroundLoading: true});
    console.log("Running smart filters...");
    try{
      const isInitial = isInitialFilter(filters);
    
      const {data, error, count} = isInitialFilter(filters)
        ? await buildQuery(metadata.planned.futureDate, amount)
        : await buildFilteredQuery(filters,  metadata.filtered.offset, amount);
      
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

      if (isInitial) {
        const newFutureDate = transformed.length > 0
          ? transformed.reduce((max, project) => {
              const schedDate = project.project.scheduled_date;
              return schedDate && schedDate > max ? schedDate : max;
            }, metadata.projects.futureDate)
          : metadata.projects.futureDate;
  
        set({
          projects: projectsMap,
          backgroundLoading: false,
          metadata: {
            ...get().metadata,
            projects: {
              ...get().metadata.projects,
              hasMore: transformed.length === amount,
              futureDate: newFutureDate
            }
          }
        });
      } else {
        const newOffset = metadata.filtered.offset + transformed.length;
        
        set({
          projects: projectsMap,
          backgroundLoading: false,
          metadata: {
            ...get().metadata,
            filtered: {
              offset: newOffset,
              hasMore: newOffset < (count || 0)
            }
          }
        });
      }
      console.log(`Fetched ${transformed.length} projects via filter`);
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
    const isInitial = isInitialFilter(filters);

    const hasMore = isInitial ? metadata.projects.hasMore : metadata.filtered.hasMore;
    if(backgroundLoading || !hasMore) return;
  
    console.log("Fetching more projects...");

    set({
      backgroundLoading: true
    });

    try {
      const limit = 30;
      // const previousFutureDay = metadata.planned.futureDate;

      const query = isInitial
        ? buildQuery(metadata.planned.futureDate, limit)
        : buildFilteredQuery(filters, metadata.filtered.offset, limit);
  
      const { data, error, count } = await query;
      //console.log(`Count is: ${count}`);
      if (error) throw error;
  
      let transformed = transformProjects(data || []); 
      const projectsMap = new Map(get().projects);
      transformed.forEach(p => projectsMap.set(p.project.id, p));

      if (isInitial) {
        const newFutureDate = transformed.length > 0
          ? transformed.reduce((max, project) => {
              const schedDate = project.project.scheduled_date;
              return schedDate && schedDate > max ? schedDate : max;
            }, metadata.projects.futureDate)
          : metadata.projects.futureDate;
  
        set({
          projects: projectsMap,
          metadata: {
            ...get().metadata,
            projects: {
              ...get().metadata.projects,
              hasMore: transformed.length === limit,
              futureDate: newFutureDate
            }
          },
          backgroundLoading: false
        });
      } else {
        const newOffset = metadata.filtered.offset + transformed.length;
        
        set({
          projects: projectsMap,
          metadata: {
            ...get().metadata,
            filtered: {
              offset: newOffset,
              hasMore: newOffset < (count || 0)
            }
          },
          backgroundLoading: false
        });
      }
  
      console.log(`Loaded ${transformed.length} more projects`);
      return transformed;
    } catch (error: any) {
      console.error('Load more error:', error);
      set({ 
        backgroundLoading: false,
        error: error.message
       });
       useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať viac projektov',
        'error',
        4000
      );
    }
  },

  getAssignedProjects(date: Date) {
    const {projects, metadata} = get();
    const dateString = format(date, "yyyy-MM-dd");
    
    const midpoint = metadata.planned.dateRange?.start 
                    ? format(addDays(parseISO(metadata.planned.dateRange.start), 15),"yyyy-MM-dd") 
                    : null;
    if(midpoint && dateString >= midpoint){
      //fetchPlannedProjects();
      console.log("Fetching planned projects");
    }
    return Array.from(projects.values()).filter(p =>
      p?.project?.state === "Naplánovaný" &&
      p.project.start_date === dateString
    );
  },

  getUnassignedProjects(date: Date)  {
    const { projects } = get();
    const futureDate = format(addDays(date, 30), "yyyy-MM-dd");

    const unassignedProjects =  Array.from(projects.values()).filter(p => 
        p?.project?.state === "Nový" &&
        p.project.scheduled_date &&
        p.project.scheduled_date <= futureDate 
      )
      .sort((a,b) =>
        (a.project.scheduled_date || "").localeCompare(b.project.scheduled_date || "")
      );
    return unassignedProjects;
  },

  // ======== FILTER MANAGEMENT FUNCTIONS ========
  setFilters: (newFilters) => {
    set(state => {
      const oldFilters = state.filters;
      const updatedFilters = { ...oldFilters, ...newFilters };
      const filtersChanged = JSON.stringify(oldFilters) !== JSON.stringify(updatedFilters);
    return {
        filters: updatedFilters,
        metadata: {
          ...state.metadata,
          filtered: {
            offset: filtersChanged ? 0 : state.metadata.filtered.offset,
            hasMore: filtersChanged ? true : state.metadata.filtered.hasMore
          }
        }
      }
    });
  },
  
  clearFilters: () => {
    set({ filters: initialFilters,
        metadata: {
          ...get().metadata,
          filtered: {
            offset: 0,
            hasMore: true,
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
          filters: { ...state.filters, type: types},
          metadata: {
            ...state.metadata,
            filtered: {
              offset: 0,
              hasMore: true
            }
          }
        };
      });
  },
  
  toggleStateFilter: (state: string) => {
    set(currentState => {
      const states = currentState.filters.state.includes(state)
        ? currentState.filters.state.filter(t => t !== state)  // Remove state from filter
        : [...currentState.filters.state, state];              // Add new state to filter

      return {
        filters: { ...currentState.filters, state: states},
        metadata: {
          ...currentState.metadata,
          filtered: {
            offset: 0,
            hasMore: true
          }
        }
      };
    });
  },

  toggleUserFilter: (userId: string) => {
    set(state => {
      const users = state.filters.users.includes(userId)
        ? state.filters.users.filter(u => u !== userId)
        : [...state.filters.users, userId];

      return {
        filters: { ...state.filters, users: users},
        metadata: {
          ...state.metadata,
          filtered: {
            offset: 0,
            hasMore: true
          }
        }
      };
    });
  },

  removeFilter: (filterType: "type" | "state" | "users", value: string) => {
    set(state => {
      return {
        filters: {
          ...state.filters,
          [filterType]: state.filters[filterType].filter((v: string) => v !== value)
        },
        metadata: {
          ...state.metadata,
          filtered: {
            offset: 0, 
            hasMore: true     
          }
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
    });
    useNotificationStore.getState().addNotification(
      'Projekt bol úspešne pridaný',
      'success',
      3000
    );
  },
  
  updateProject: (id: string, updatedProject) => {
    set(state => {
      const newMap = new Map(state.projects);
      newMap.set(id, updatedProject);
      return {projects: newMap};
    });
    useNotificationStore.getState().addNotification(
      'Projekt bol úspešne aktualizovaný',
      'success',
      3000
    );
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
                  planned: {...state.metadata.planned, lastFetch: 0}
                }
              }));
            
              useClientStore.getState().lastFetch = 0;
              useNotificationStore.getState().addNotification(
                'Projekt bol úspešne odstránený',
                'success',
                3000
              );
            }
            catch (error) {
              console.error("Error deleting project:", error);
              // rollback if error
              set({ projects: previousProjects });
              useNotificationStore.getState().addNotification(
                'Projekt sa nepodarilo odstrániť',
                "error",
                3000
              );
            }
          }
        }
      ]
    );
  },

  // ======== PLANNING FUNCTIONS ========
  assignProjectToDate: (projectId: string, date: Date) => {
    try{
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const project = get().projects.get(projectId);
      if (project) {
        const updated = {
          ...project,
          project: {
            ...project.project,
            state: "Naplánovaný",
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

  changeStateOfAssignedProject: async(projectId: string, date: Date) => {
    try{
      const dateStr = format(date, 'yyyy-MM-dd');
      const today = new Date();
      
      const project = get().projects.get(projectId);
      if(isBefore(date, today)){
        const {error} = await supabase
          .from("projects")
          .update({
            state: "Prebieha",
            start_date: dateStr
          })
          .eq("id", projectId);
        if(error) throw error;
        
        if (project) {
          const updated = {
            ...project,
            project: {
              ...project.project,
              state: "Prebieha",
              start_date: dateStr
            }
          };
          console.log('Updated project in store:', updated.project.start_date);
          get().updateProject(projectId, updated);
        }
      }
      else{
        const {error} = await supabase
          .from("projects")
          .update({
            state: "Naplánovaný",
            start_date: dateStr
          })
          .eq("id", projectId);
        if(error) throw error;
        console.log('Updated project in store:');
      }
    }
    catch(error: any){
      console.error("Error assigning project:", error);
      throw error;
    }
  },
  }
));

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
async function buildQuery (startDate: string, limit: number) {      
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
      .or(`and(state.eq.Nový,scheduled_date.gte.${startDate}),state.eq.Ukončený,state.eq.Zrušený`)
      .limit(limit)
      .order('scheduled_date', {ascending: true });
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
      .range(offset, offset + limit - 1)
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