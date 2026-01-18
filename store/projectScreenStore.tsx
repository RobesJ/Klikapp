import { supabase } from '@/lib/supabase';
import { ProjectFilters, ProjectWithRelations } from '@/types/projectSpecific';
import { allProjectsQuery } from '@/utils/projectQueries';
import { transformProjects } from '@/utils/transformProject';
import { Alert } from 'react-native';
import { create } from 'zustand';
import { useClientStore } from './clientStore';
import { useNotificationStore } from './notificationStore';

export type LockResult = 
  | {
      success: true;
    }
  | {
      success:false;
      lockedByName: string | null;
  }

interface ProjectsMetadata {
    hasMore: boolean; 
    isLoading: boolean;
    offset: number
}

interface ProjectStore {
  projects: Map<string, ProjectWithRelations>;
  metadata: ProjectsMetadata;
  initialLoading : boolean;
  backgroundLoading: boolean;
  error: string | null;

  // Fetching functions
  fetchProjects: () => Promise<void>;

  // Pagination
  // loadMore: (filters: ProjectFilters) => Promise<void>;

  // Filtering
  // applyFilters: (filters: ProjectFilters) => Promise<void>;

  // Project management
  addProject: (project: ProjectWithRelations) => void;
  updateProject: (id: string, project: ProjectWithRelations, showNotification: boolean) => void;
  deleteProject: (id: string) => Promise<void>;

  // Lock management
  lockProject: (id: string, userID: string, userName: string) => Promise<LockResult>;
  unlockProject: (id: string, userID: string) => void;
  
  // Refresh
  refresh: (filters: ProjectFilters) => Promise<void>;
}

const PAGE_SIZE = 20;
const MIN_RESULTS = 20;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: new Map(),
  metadata: {
      hasMore: true,
      isLoading: false,
      offset: 0
  },

  initialLoading: true,
  backgroundLoading: false,
  error: null,

   // ======== FETCHING FUNCTIONS ========
  fetchProjects: async (filters?: ProjectFilters) => {
    set({ initialLoading: true, error: null });

    try {
      const { data, error } = await allProjectsQuery();
        
      if (error) throw error;

      const transformedProjects = transformProjects(data || []);
      const projectsMap = new Map<string, ProjectWithRelations>();
      transformedProjects.forEach(p => projectsMap.set(p.project.id, p));
      
      set({
        projects: projectsMap,
        //metadata: {
        //  hasMore: data.length === PAGE_SIZE,
        //  isLoading: false,
        //  offset: data.length
        //},
        initialLoading: false
      });

      console.log(`Fetched ${transformedProjects.length} projects`);
    }
    catch (error: any) {
      console.error('Error fetching projects:', error);
      set({
        initialLoading: false, 
        error: error.message
      });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať projekty',
        'error',
        "projects",
        4000
      );
    }
  },

  // ======== PAGINATION FUNCTIONS ========
  //loadMore: async (filters: ProjectFilters) => {
  //  const { backgroundLoading, metadata } = get();
  //  
  //  if (backgroundLoading || !metadata.hasMore) {
  //    console.log("Load more: already loading or no more data");
  //    return;
  //  }
//
  //  set({ backgroundLoading: true });
//
  //  try {
  //    // Apply server-side filters for type, state, dates
  //    const serverFilters = {
  //      type: filters.type,
  //      state: filters.state,
  //      dateFrom: filters.dateFrom,
  //      dateTo: filters.dateTo,
  //      users: [], // Don't send to server
  //      searchQuery: '' // Don't send to server
  //    };
//
  //    const { data, error } = await allProjectsQuery(
  //      metadata.offset,
  //      PAGE_SIZE,
  //      isInitialFilter(serverFilters) ? undefined : serverFilters
  //    );
//
  //    if (error) throw error;
//
  //    const transformed = transformProjects(data || []);
  //    
  //    // Merge with existing projects
  //    const projectsMap = new Map(get().projects);
  //    transformed.forEach(p => projectsMap.set(p.project.id, p));
//
  //    set({
  //      projects: projectsMap,
  //      backgroundLoading: false,
  //      metadata: {
  //        hasMore: data.length === PAGE_SIZE,
  //        isLoading: false,
  //        offset: metadata.offset + data.length
  //      }
  //    });
//
  //    console.log(`Loaded ${transformed.length} more projects (total offset: ${metadata.offset + data.length})`);
  //  } catch (error: any) {
  //    console.error('Load more error:', error);
  //    set({ 
  //      backgroundLoading: false,
  //      error: error.message
  //    });
  //  }
  //},

  // ======== FILTER FUNCTIONS ========
  // applyFilters: async (filters: ProjectFilters) => {
  //   const { backgroundLoading } = get();
  //   
  //   if (backgroundLoading) return;
  //   
  //   // Reset state and fetch fresh data with filters
  //   set({ 
  //     backgroundLoading: true,
  //     projects: new Map(), // Clear existing projects
  //     metadata: {
  //       hasMore: true, 
  //       offset: 0,
  //       isLoading: false 
  //     }
  //   });
  // 
  //   try {
  //     // Server-side filters only for database-indexable fields
  //     const serverFilters = {
  //       type: filters.type,
  //       state: filters.state,
  //       dateFrom: filters.dateFrom,
  //       dateTo: filters.dateTo,
  //       users: [], // Client-side only
  //       searchQuery: '' // Client-side only
  //     };
// 
  //     const { data, error } = await allProjectsQuery(
  //       0,
  //       PAGE_SIZE,
  //       isInitialFilter(serverFilters) ? undefined : serverFilters
  //     );
// 
  //     if (error) throw error;
// 
  //     const transformed = transformProjects(data || []);
  //     const projectsMap = new Map<string, ProjectWithRelations>();
  //     transformed.forEach(p => projectsMap.set(p.project.id, p));
  // 
  //     set({
  //       projects: projectsMap,
  //       backgroundLoading: false,
  //       metadata: {
  //         hasMore: data.length === PAGE_SIZE,
  //         offset: data.length,
  //         isLoading: false
  //       }
  //     });
  // 
  //     console.log(`Applied filters, found ${transformed.length} projects`);
  //   } catch (error: any) {
  //     console.error("Filter error:", error);
  //     set({ 
  //       backgroundLoading: false,
  //       error: error.message 
  //     });
  //   }
  // },


  // ======== PROJECT MANAGEMENT ========
  addProject: (project) => {
    set(state => {
      const newMap = new Map(state.projects);
      newMap.set(project.project.id, project);
      return {projects: newMap};
    });
    useNotificationStore.getState().addNotification(
      'Projekt bol úspešne pridaný',
      'success',
      "projects",
      3000
    );
  },
  
  updateProject: (id: string, updatedProject: ProjectWithRelations, showNotification: boolean) => {
    set(state => {
      const existing = state.projects.get(id);

      if (existing && JSON.stringify(existing) === JSON.stringify(updatedProject)){
        return state;
      }

      const newMap = new Map(state.projects);
      newMap.set(id, updatedProject);
      return {
        projects: newMap,
      };
    });

    if (showNotification) {
      useNotificationStore.getState().addNotification(
        'Projekt bol úspešne aktualizovaný',
        'success',
        "projects",
        3000
      );
    }
  },

  deleteProject: async(id: string) => {
    Alert.alert(
      'Odstrániť projekt',
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
          
            try{
              const { error } = await supabase
                .from("projects")
                .delete()
                .eq("id", id);
            
              if (error) throw error;
            
              useClientStore.getState().lastFetch = 0;
              useNotificationStore.getState().addNotification(
                'Projekt bol úspešne odstránený',
                'success',
                "projects",
                3000
              );
            }
            catch (error) {
              console.error("Error deleting project:", error);
              set({ projects: previousProjects });
              useNotificationStore.getState().addNotification(
                'Projekt sa nepodarilo odstrániť',
                "error",
                "projects",
                3000
              );
            }
          }
        }
      ]
    );
  },
  
  // ======== LOCK MANAGEMENT ========
  lockProject: async (id: string, userID: string, userName: string) => {
    try {
      const {data, error} = await supabase.rpc("lock_project_and_relations", {
        p_project_id: id,
        p_user_id: userID,
        p_user_name: userName
      });

      if (error) throw error;

      if (!data?.[0].locked){
        return {
          success: false,
          lockedByName: data?.[0]?.locked_by_name ?? null
        };
      }

      const project = get().projects.get(id);
      if (project) {
        const updated = {
          ...project,
          project: {
            ...project.project,
            locked_by: userID,
            locked_by_name: userName ?? 'Unknown',
            lock_expires_at: data[0].lock_expires_at
          }
        };
        get().updateProject(id, updated, false);
      }
      return { success: true };
    }
    catch (error: any){
      console.error("Error locking project:", error);
      return {
        success: false,
        lockedByName: null
      };
    }
  },

  unlockProject: async (id: string, userID: string) => {
    try { 
        const { error } = await supabase.rpc("unlock_project", {
          p_project_id: id,
          p_user_id: userID
        });

        if (error) throw error;
        const project = get().projects.get(id);
        if(project){
          const updated = {
            ...project,
            project: {
              ...project.project,
              locked_by: null,
              locked_by_name: null,
              lock_expires_at: null
            }
          };
          get().updateProject(id, updated, false);
        }
    }
    catch (error: any){
      console.error("Error unlocking project:", error);
    }
  },

  // ======== REFRESH FUNCTIONS ========
  refresh: async (filters: ProjectFilters) => {
    set({ 
      backgroundLoading: true,
      metadata: {
          offset: 0,
          hasMore: true,
          isLoading: false
      }
    });
    //await get().applyFilters(filters);
  }
}));


function isInitialFilter(filters: ProjectFilters): boolean {
  return (
    filters.type.length === 0 &&
    filters.state.length === 0 &&
    filters.users.length === 0 &&
    (!filters.dateFrom || filters.dateFrom === null) &&
    (!filters.dateTo || filters.dateTo === null) &&
    (!filters.searchQuery || filters.searchQuery === '')
  );
}