import { supabase } from '@/lib/supabase';
import { User } from "@/types/generics";
import { ProjectWithRelations } from '@/types/projectSpecific';
import { activeProjectsQuery } from '@/utils/projectQueries';
import { transformProjects } from '@/utils/transformProject';
import { format } from 'date-fns';
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

interface HomeScreenStore {
  activeProjects: Map<string, ProjectWithRelations>;
  availableUsers: User[];
  initialLoading : boolean;
  backgroundLoading: boolean;
  error: string | null;
  lastFetch: number;

  // Fetching functions
  fetchActiveProjects: () => Promise<void>;
  fetchAvailableUsers: () => Promise<void>;

  // Project management
  updateProject: (id: string, project: ProjectWithRelations, showNotification: boolean) => void;
  deleteProject: (id: string) => Promise<void>;

  // Lock management
  lockProject: (id: string, userID: string, userName: string) => Promise<LockResult>;
  unlockProject: (id: string, userID: string) => void;
}

const CACHE_DURATION = 300000; // 5 min

export const useHomeScreenStore = create<HomeScreenStore>((set, get) => ({
  // Initial state
  activeProjects: new Map(),
  availableUsers: [],
  initialLoading: true,
  backgroundLoading: false,
  error: null,
  lastFetch: 0,

  // ======== FETCHING FUNCTIONS ========
  fetchActiveProjects: async() => {
    const { activeProjects, lastFetch, backgroundLoading } = get();
    const now = Date.now();
    const today = format(new Date(), "yyyy-MM-dd");

    if (backgroundLoading){
      return;
    }

    if (activeProjects.size > 0 && (now - lastFetch) < CACHE_DURATION) {
      console.log('Using cached active projects');
      return;
    }

    set({ initialLoading: true, backgroundLoading: true,  error: null });

    try {
      const { data, error} = await activeProjectsQuery(today);
        
      if (error) throw error;

      const transformedProjects = transformProjects(data || []);
      const projectsMap = new Map(get().activeProjects);
      transformedProjects.forEach(p => projectsMap.set(p.project.id, p));
      
      set({
        activeProjects: projectsMap,
        initialLoading: false,
        backgroundLoading: false
      });

      console.log(`Fetched ${transformedProjects.length} active projects`);
    }
    catch (error: any){
      console.error('Error fetching active projects:', error);
      set({
        initialLoading: false, 
        backgroundLoading: false,
        error: error.message
      });
      
      useNotificationStore.getState().addNotification(
        'Nepodarilo sa načítať aktívne projekty',
        'error',
        "home",
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

  // ======== PROJECT MANAGEMENT ========
  updateProject: (id: string, updatedProject: ProjectWithRelations, showNotification: boolean) => {
    set(state => {
      const existing = state.activeProjects.get(id);

      if (existing && JSON.stringify(existing) === JSON.stringify(updatedProject)){
        return state;
      }

      const newMap = new Map(state.activeProjects);
      newMap.set(id, updatedProject);
      return {
        activeProjects: newMap,
      };
    });

    if (showNotification) {
      useNotificationStore.getState().addNotification(
        'Projekt bol úspešne aktualizovaný',
        'success',
        "home",
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
            const previousProjects = new Map(get().activeProjects);
                  
            set(state => {
              const newMap = new Map(state.activeProjects);
              newMap.delete(id);
              return {activeProjects: newMap};
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
                "home",
                3000
              );
            }
            catch (error) {
              console.error("Error deleting project:", error);
              set({ activeProjects: previousProjects });
              useNotificationStore.getState().addNotification(
                'Projekt sa nepodarilo odstrániť',
                "error",
                "home",
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

      const project = get().activeProjects.get(id);
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
        const project = get().activeProjects.get(id);
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
