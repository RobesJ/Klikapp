import { supabase } from '@/lib/supabase';
import { User } from '@/types/generics';
import { ProjectFilters, ProjectWithRelations } from '@/types/projectSpecific';
import { allProjectsQuery } from '@/utils/projectQueries';
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

interface ProjectsMetadata {
    hasMore: boolean; 
    isLoading: boolean;
    offset: number
}

interface ProjectStore {
  projects: Map<string, ProjectWithRelations>;
  lastSync: string | null; 
  syncCount: number, 
  metadata: ProjectsMetadata;
  availableUsers: User[];
  initialLoading : boolean;
  backgroundLoading: boolean;
  error: string | null;

  // Fetching functions
  fetchProjects: () => Promise<void>;
  fetchAvailableUsers: () => Promise<void>;

  syncProjects: () => Promise<void>;

  // Getters
  getActiveProjects: () => ProjectWithRelations[];
  getAssignedProjects: () => ProjectWithRelations[];
  getUnassignedProjects: (daysAhead: number) => ProjectWithRelations[];

  // Planning functions
  assignProjectToDate: (projectId: string, date: Date) => void; 
  unassignProject: (projectId: string) => Promise<void>;   
  changeStateOfAssignedProject: (projectId: string, date: Date) => Promise<void>; 

  // Project management
  addProject: (project: ProjectWithRelations) => void;
  updateProject: (id: string, project: ProjectWithRelations, showNotification: boolean) => void;
  deleteProject: (id: string) => Promise<void>;

  // Lock management
  lockProject: (id: string, userID: string, userName: string) => Promise<LockResult>;
  unlockProject: (id: string, userID: string) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: new Map(),
  lastSync:  null, 
  syncCount: 0, 
  metadata: {
      hasMore: true,
      isLoading: false,
      offset: 0
  },
  availableUsers: [],
  initialLoading: true,
  backgroundLoading: false,
  error: null,

   // ======== FETCHING FUNCTIONS ========
  fetchProjects: async (filters?: ProjectFilters) => {
    set({ initialLoading: true, error: null });

    try {
      const { data, error } = await allProjectsQuery(false);
        
      if (error) throw error;

      const transformedProjects = transformProjects(data || []);
      const projectsMap = new Map<string, ProjectWithRelations>();
      transformedProjects.forEach(p => projectsMap.set(p.project.id, p));
      
      set({
        projects: projectsMap,
        initialLoading: false,
        lastSync: new Date().toISOString()
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

  syncProjects: async() =>{
    const {lastSync, syncCount} = get();

    // refrehshin whole dataset after 20 sync to get catch deletions
    // to improve => implement soft deletes
    const shouldRefetch = syncCount === 20;

    if (!lastSync || shouldRefetch) {
      set({ syncCount: 0});
      return get().fetchProjects();
    }

    try{
        const { data, error } = await allProjectsQuery(true, lastSync);
       
        if(error) throw error;

        if (data && data.length > 0){
          const transformedProjects = transformProjects(data || []);
          set(state => {
            const projectsMap = new Map(state.projects);
            transformedProjects.forEach(p => projectsMap.set(p.project.id, p));
          
            return {
              projects: projectsMap,
              lastSync: new Date().toISOString(),
              syncCount: state.syncCount + 1
            }
          });
        
          console.log(`Fetched ${transformedProjects.length} projects`);
        }
        else {
          set({
            lastSync: new Date().toISOString(),
            syncCount: get().syncCount + 1
          });
        }
    }
    catch(error: any){
        console.error("Error syncing projects:", error);
    }
  },

  getActiveProjects: () => {
    const { projects } = get();
    const dateString = format(Date.now(), "yyyy-MM-dd");
    return Array.from(projects.values()).filter(p =>
      p?.project?.state === "Prebieha" || 
      p?.project?.state === "Pozastavený" ||
      (p?.project?.state === "Naplánovaný" &&
      p.project.start_date === dateString)
    );
  },

  // all the projects with state Naplanovany 
  // the planning screen will filter value based on date
  getAssignedProjects: () => {
    const { projects } = get();
   // const dateString = format(date, "yyyy-MM-dd");
    
    return Array.from(projects.values())
      .filter(p =>p?.project?.state === "Naplánovaný")
      .sort((a, b) => (a.project.start_date || "").localeCompare(b.project.start_date || ""));
  },

  // by default are unassigned all the projects where
  // scheduled_date < today + 30
  getUnassignedProjects: (daysAhead: number = 30) => {
    const { projects } = get();
    const futureDate = format(addDays(Date.now(), daysAhead), "yyyy-MM-dd");

    return Array.from(projects.values())
      .filter(p => 
        p?.project?.state === "Nový" &&
        p.project.scheduled_date &&
        p.project.scheduled_date <= futureDate 
      )
      .sort((a, b) =>
        (a.project.scheduled_date || "").localeCompare(b.project.scheduled_date || "")
      );
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
  }
}));