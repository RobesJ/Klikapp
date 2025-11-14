import { supabase } from '@/lib/supabase';
import { User } from "@/types/generics";
import { Chimney, ObjectWithRelations, ProjectWithRelations } from '@/types/projectSpecific';
import { create } from 'zustand';

interface ProjectFilters {
  type: string | null;
  state: string | null;
  clientId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  searchQuery: string;
}

interface ProjectStore {
  projects: ProjectWithRelations[];
  filteredProjects: ProjectWithRelations[];
  filters: ProjectFilters;
  
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
  loadMore: () => Promise<void>;
  setFilters: (filters: Partial<ProjectFilters>) => void;
  clearFilters: () => void;
  addProject: (project: ProjectWithRelations) => void;
  updateProject: (id: string, project: ProjectWithRelations) => void;
  deleteProject: (id: string) => void;
  applyFilters: () => void;
}

const initialFilters: ProjectFilters = {
  type: null,
  state: null,
  clientId: null,
  dateFrom: null,
  dateTo: null,
  searchQuery: '',
};

const CACHE_DURATION = 30000; // 30 seconds

export const useProjectStore = create<ProjectStore>((set, get) => ({
  // Initial state
  projects: [],
  filteredProjects: [],
  filters: initialFilters,

  hasMore: true,
  currentPage: 0,
  pageSize: 50,
  totalCount: null,

  initialLoading: false,
  backgroundLoading: false,
  lastFetch: 0,
  error: null,

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
        .eq("state", "Aktívny")
        .limit(limit);
        
        if (error) throw error;

        if (data) {
          const transformedProjects = transformProjects(data);
          
          set({
            initialLoading:false,
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

    const start = currentPage * pageSize;
    const end = start + limit - 1;

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
      
      get().applyFilters();
      
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

  loadMore: async () => {
    const {hasMore,  backgroundLoading, currentPage } = get();

    if(!hasMore || backgroundLoading){
      console.warn("Cannot load more projects");
      return;
    }

    set({
      currentPage: currentPage + 1,
      backgroundLoading: true
    });

    await get().fetchProjects(get().pageSize);
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
    const { projects, filters } = get();
    
    let filtered = [...projects];

    if (filters.type) {
      filtered = filtered.filter(p => p.project.type === filters.type);
    }

    if (filters.state) {
      filtered = filtered.filter(p => p.project.state === filters.state);
    }

    if (filters.clientId) {
      filtered = filtered.filter(p => p.project.client_id === filters.clientId);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(p => {
        const projectDate = p.project.scheduled_date || p.project.start_date;
        return projectDate && projectDate >= filters.dateFrom!;
      });
    }

    if (filters.dateTo) {
      filtered = filtered.filter(p => {
        const projectDate = p.project.scheduled_date || p.project.start_date;
        return projectDate && projectDate <= filters.dateTo!;
      });
    }

    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.client.name.toLowerCase().includes(query) ||
        p.project.note?.toLowerCase().includes(query) ||
        p.objects.some(obj => obj.object.address?.toLowerCase().includes(query))
      );
    }

    set({ filteredProjects: filtered });
    console.log(`🔍 Filtered: ${filtered.length}/${projects.length} projects`);
  },
  
  addProject: (project) => {
    set((state) => ({
      projects: [project, ...state.projects]
    }));
    get().applyFilters();
  },

  
  updateProject: (id, updatedProject) => {
    set((state) => ({
      projects: state.projects.map(p => 
        p.project.id === id ? updatedProject : p
      )
    }));
    get().applyFilters();
  },

  deleteProject: (id) => {
    set((state) => ({
      projects: state.projects.filter(p => p.project.id !== id)
    }));
    get().applyFilters();
  },
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