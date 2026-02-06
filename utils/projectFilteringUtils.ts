import { ProjectFilters } from "@/store/projectStore";
import { ProjectWithRelations } from "@/types/projectSpecific";

// helpers for project filters
export function applyFilters(
    projects: ProjectWithRelations[], 
    filters: ProjectFilters
): ProjectWithRelations [] {
    // early return if no filters
    if (
      filters.type.length === 0 &&
      filters.state.length === 0 &&
      filters.users.length === 0 &&
      !filters.dateFrom &&
      !filters.dateTo &&
      !filters.searchQuery
    ) {
      return Array.from(projects.values());
    }   
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
}

export function extractCitiesFromProjects(projects: ProjectWithRelations []) : string []{
    const citiesSet = new Set<string>();

    projects.forEach(p => {
        p.objects.forEach(ob => {
          if(ob.object.city){
            citiesSet.add(ob.object.city);
          }
        });
    });

    return Array.from(citiesSet).sort();
}
