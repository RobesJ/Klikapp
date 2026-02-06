import { supabase } from "@/lib/supabase";

/*
export async function activeProjectsQuery(today: string) {
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
                chimney_type_id,
                placement,
                appliance,
                note,
                chimney_type:chimney_types (
                  id,
                  type, 
                  labelling
                )
              )
            )
          )
        `)
        .or(`state.eq.Prebieha,state.eq.Pozastavený,and(state.eq.Naplánovaný,start_date.eq.${today})`)
        .order("created_at", {ascending: false})
    return await query;
};

export async function unassignedPlannedQuery(
  initialCall: boolean,
  range_start?: string | undefined,
  futureDate?: string | undefined, 
  limit?: number,
  filters?: ProjectFilters
) {
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
                chimney_type_id,
                placement,
                appliance,
                note,
                chimney_type:chimney_types (
                  id,
                  type, 
                  labelling
                )
              )
            )
          )
        `);
    
    if(!initialCall && range_start && limit){
        query = query
          .eq('state', 'Nový')
          .gt('scheduled_date', range_start)                  // After current cursor
          //.lte('scheduled_date', futureDate)                 // Up to new cursor
          .order('scheduled_date', {ascending: true, nullsFirst: false})
          .limit(limit);
    }

    if(initialCall && futureDate) {
      query = query
        .or(`and(state.eq.Nový,scheduled_date.lte.${futureDate})`)
        .order('scheduled_date', {ascending: true, nullsFirst: false});
    }


    if (filters) {
      if (filters.type.length > 0) {
        query = query.in("type", filters.type);
      }

      if (filters.dateFrom) {
        query = query.gte("scheduled_date", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("scheduled_date", filters.dateTo);
      }
    }

    if(limit){
      query = query.limit(limit);
    }
    
    return await query;
};

export async function assignedPlannedQuery(
  initialCall: boolean, 
  range_start?: string | undefined, 
  futureDate?: string | undefined, 
  limit?: number | undefined, 
  filters?: ProjectFilters) {
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
                chimney_type_id,
                placement,
                appliance,
                note,
                chimney_type:chimney_types (
                  id,
                  type, 
                  labelling
                )
              )
            )
          )
        `);
        
    // query for initial fetch
    if (initialCall && futureDate){
      query = query
        .or(`and(state.eq.Naplánovaný,start_date.lte.${futureDate})`)
        .order("scheduled_date", {ascending: true});
    } 
    
    // query for loadMoreAll
    if(!initialCall && range_start  && !futureDate && limit){
      query = query
        .or(`and(state.eq.Naplánovaný,start_date.gt.${range_start})`)
        .order("scheduled_date", {ascending: true})
        .limit(limit);
    }

    // query for loadMore assigned
    if(!initialCall && range_start  && futureDate && !limit){
      query = query
        .eq('state', 'Naplánovaný')
        .gt('start_date', range_start) 
        .lte('start_date', futureDate)          
        .order('start_date', {ascending: true});
    }

    if (filters) {
      if (filters.type.length > 0) {
        query = query.in("type", filters.type);
      }
      if (filters.dateFrom) {
        query = query.gte("start_date", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("start_date", filters.dateTo);
      }
    }

    if (limit) {
        query.limit(limit);
    }
    return await query;
};
*/
export async function allProjectsQuery(sync: boolean, timestamp?: string | null){
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
                chimney_type_id,
                placement,
                appliance,
                note,
                chimney_type:chimney_types (
                  id,
                  type, 
                  labelling
                )
              )
            )
          )
        `);
    
    if (sync){
      query = query.gt('updated_at', timestamp);
    }
    return  await query;
}
