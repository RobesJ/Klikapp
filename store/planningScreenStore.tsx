import { supabase } from '@/lib/supabase';
import { ProjectFilters, ProjectWithRelations } from '@/types/projectSpecific';
import { assignedPlannedQuery, unassignedPlannedQuery } from '@/utils/projectQueries';
import { transformProjects } from '@/utils/transformProject';
import { addDays, format, isBefore } from 'date-fns';
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

interface PaginationMeta {
  hasMore: boolean;
  cursor: string; 
  isLoading: boolean;
  count: number
}

interface ProjectsMetadata {
  unassigned: PaginationMeta;
  assigned: PaginationMeta;
}

interface PlanningScreenStore {
  projects: Map<string, ProjectWithRelations>;
  metadata: ProjectsMetadata;
  initialLoading : boolean;
  backgroundLoading: boolean;
  error: string | null;

  // Fetching functions
  fetchPlannedProjects: () => Promise<void>; 

  // Getters
  getAssignedProjects: (date: Date) => ProjectWithRelations[];
  getUnassignedProjects: (date: Date) => ProjectWithRelations[];

  // Pagination
  loadMoreUnassigned: (filters: ProjectFilters) => Promise<void>;
  loadMoreAssigned: (targetDate: Date) => Promise<void>;
  
  // Project management
  updateProject: (id: string, project: ProjectWithRelations, showNotification: boolean) => void;
  deleteProject: (id: string) => Promise<void>;

  // Lock management
  lockProject: (id: string, userID: string, userName: string) => Promise<LockResult>;
  unlockProject: (id: string, userID: string) => void;

  // Planning functions
  assignProjectToDate: (projectId: string, date: Date) => void; 
  unassignProject: (projectId: string) => Promise<void>;   
  changeStateOfAssignedProject: (projectId: string, date: Date) => Promise<void>; 

  refreshPlanning: () => void;
}

const PAGE_SIZE = 30;

export const usePlanningScreenStore = create<PlanningScreenStore>((set, get) => ({
  // Initial state
  projects: new Map(),
  metadata: {
    unassigned: {
      hasMore: true,
      cursor: format(addDays(Date.now(), 30), "yyyy-MM-dd"),
      isLoading: false,
      count: 0
    },
    assigned: {
      hasMore: true,
      cursor: format(addDays(Date.now(), 30), "yyyy-MM-dd"),
      isLoading: false,
      count: 0
    }
  },

  initialLoading: true,
  backgroundLoading: false,
  error: null,

  // ======== FETCHING FUNCTIONS ========
  fetchPlannedProjects: async () => {
    const { metadata, backgroundLoading } = get();

    if (backgroundLoading) return;

    set({ backgroundLoading: true, error: null });

    try {

      const [assignedResult, unassignedResult] = await Promise.all([
        assignedPlannedQuery(true, undefined, metadata.assigned.cursor),
        unassignedPlannedQuery(true, undefined, metadata.unassigned.cursor)
      ]);

      if (assignedResult.error) throw assignedResult.error;
      if (unassignedResult.error) throw unassignedResult.error;

      const assignedProjects = transformProjects(assignedResult.data || []);
      const unassignedProjects = transformProjects(unassignedResult.data || []);
      
      // Merge into single map
      const projectsMap = new Map<string, ProjectWithRelations>();
      assignedProjects.forEach(p => projectsMap.set(p.project.id, p));
      unassignedProjects.forEach(p => projectsMap.set(p.project.id, p));
      
      set({
        projects: projectsMap,
        metadata: {
          unassigned: {
            hasMore: true,
            cursor: format(addDays(metadata.unassigned.cursor, 30), "yyyy-MM-dd"),
            isLoading: false,
            count: unassignedProjects.length
          },
          assigned: {
            hasMore: true,
            cursor: format(addDays(metadata.assigned.cursor, 30), "yyyy-MM-dd"),
            isLoading: false,
            count: assignedProjects.length
          }
        },
        backgroundLoading: false,
        initialLoading: false
      });

      console.log(`Fetched ${assignedProjects.length} assigned + ${unassignedProjects.length} unassigned projects`);
    }
    catch (error: any) {
      console.error('Error fetching planned projects:', error);
      set({ backgroundLoading: false, initialLoading: false, error: error.message });
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať plánované projekty',
        'error',
        "planning",
        4000
      );
    }
  },

  // ======== GETTERS ========
  getAssignedProjects: (date: Date) => {
    const { projects } = get();
    const dateString = format(date, "yyyy-MM-dd");
    
    return Array.from(projects.values()).filter(p =>
      p?.project?.state === "Naplánovaný" &&
      p.project.start_date === dateString
    );
  },

  getUnassignedProjects: (date: Date) => {
    const { projects } = get();
    const futureDate = format(addDays(date, 30), "yyyy-MM-dd");

    return Array.from(projects.values())
      .filter(p => 
        p?.project?.state === "Nový" //&&
      //  p.project.scheduled_date &&
      //  p.project.scheduled_date <= futureDate 
      )
      .sort((a, b) =>
        (a.project.scheduled_date || "").localeCompare(b.project.scheduled_date || "")
      );
  },

  // ======== PAGINATION FUNCTIONS ========

  loadMoreUnassigned: async (filters: ProjectFilters) => {
    const { backgroundLoading, metadata } = get();

    if ( backgroundLoading || !metadata.unassigned.hasMore ) return;

    set({ 
      backgroundLoading: true,
      metadata: {
        ...metadata,
        unassigned: { ...metadata.unassigned, isLoading: true }
      }
    });

    const isInitial = isInitialFilter(filters);

    try {
      const { data, error } = await unassignedPlannedQuery(
          false,
          metadata.unassigned.cursor,
          undefined,
          PAGE_SIZE,
          isInitial ? undefined : filters
      );

      if (error) throw error;

      let transformed = transformProjects(data || []);
      
      // Client-side filtering
      if (filters.users.length > 0) {
        transformed = transformed.filter(p =>
          p.users.some(user => filters.users.includes(user.id))
        );
      }

      if (filters.cities && filters.cities.length > 0) {
        transformed = transformed.filter(p =>
          p.objects.some(obj => 
            obj.object.city && filters.cities!.includes(obj.object.city)
          )
        );
      }

      if (filters.searchQuery) {
        const searchLower = filters.searchQuery.toLowerCase();
        transformed = transformed.filter(p =>
          p.client.name.toLowerCase().includes(searchLower) ||
          p.client.phone?.toLowerCase().includes(searchLower) ||
          p.objects.some(obj => obj.object.city?.toLowerCase().includes(searchLower))
        );
      }

      const projectsMap = new Map(get().projects);
      transformed.forEach(p => projectsMap.set(p.project.id, p));

      set({
        projects: projectsMap,
        backgroundLoading: false,
        metadata: {
          ...metadata,
          unassigned: {
            hasMore: data.length === PAGE_SIZE,
            cursor: data[data.length -1].scheduled_date,
            count: metadata.unassigned.count + transformed.length,
            isLoading: false
          }
        }
      });

      console.log(`Loaded ${transformed.length} more unassigned projects`);
    } 
    catch (error: any) {
      console.error('Load more unassigned error:', error);
      set({ 
        backgroundLoading: false,
        metadata: {
          ...get().metadata,
          unassigned: { ...get().metadata.unassigned, isLoading: false }
        },
        error: error.message
      });
    }
  },

  loadMoreAssigned: async (targetDate: Date) => {
    const { backgroundLoading, metadata } = get();
  
    if (backgroundLoading || !metadata.assigned.hasMore) return;
  
    set({ 
      backgroundLoading: true,
      metadata: {
        ...metadata,
        assigned: { ...metadata.assigned, isLoading: true }
      }
    });
  
    try {
      // Extend the cursor by another 30 days
      const newFutureDate = format(
        addDays(targetDate, 30), 
        "yyyy-MM-dd"
      );


      const { data, error } = await unassignedPlannedQuery(
        false,
        metadata.unassigned.cursor,
        newFutureDate,
        undefined, // dont need limit
        undefined
      );
  
      if (error) throw error;
  
      const transformed = transformProjects(data || []);
      const projectsMap = new Map(get().projects);
      transformed.forEach(p => projectsMap.set(p.project.id, p));
  
      set({
        projects: projectsMap,
        backgroundLoading: false,
        metadata: {
          ...metadata,
          assigned: {
            hasMore: data.length === PAGE_SIZE,
            cursor: newFutureDate,
            count: metadata.assigned.count + transformed.length,
            isLoading: false
          }
        }
      });
  
      console.log(`Loaded ${transformed.length} more assigned projects (cursor: ${newFutureDate})`);
    } catch (error: any) {
      console.error('Load more assigned error:', error);
      set({ 
        backgroundLoading: false,
        metadata: {
          ...get().metadata,
          assigned: { ...get().metadata.assigned, isLoading: false }
        },
        error: error.message
      });
    }
  },

  // ======== PROJECT MANAGEMENT ========
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

  // ======== PLANNING FUNCTIONS ========
  assignProjectToDate: (projectId: string, date: Date) => {
    try {
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
        get().updateProject(projectId, updated, false);
      }
    }
    catch(error: any){
      console.error("Error assigning project:", error);
      throw error;
    }
  },

  unassignProject: async(projectId: string) => {
    try {
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
        get().updateProject(projectId, updated, false);
      }
    }
    catch(error: any){
      console.error("Error unassigning project:", error);
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
          get().updateProject(projectId, updated, true);
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
      }
    }
    catch(error: any){
      console.error("Error changing project state:", error);
      throw error;
    }
  },

  // ======== REFRESH FUNCTIONS ========

  refreshPlanning: async () => {
    set({ 
      backgroundLoading: true,
      metadata: {
        unassigned: {
            count: 0, 
            cursor: format(addDays(Date.now(), 30), "yyyy-MM-dd"),
            hasMore: true,
            isLoading: false
        },
        assigned: {
            count: 0,
            cursor: format(addDays(Date.now(), 30), "yyyy-MM-dd"),
            hasMore: true,
            isLoading: false
        }
      }
    });
    await get().fetchPlannedProjects();
  },
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

