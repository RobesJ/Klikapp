import { ProjectFilters } from "@/store/projectScreenStore";
import { User } from "@/types/generics";
import { useMemo } from "react";

export function useActiveFilters(
    filters: ProjectFilters,
    availableUsers: User []
){
    return useMemo(() => [
        ...filters.type.map(t => ({ type: "type" as const, value: t })),
        ...filters.state.map(s => ({ type: "state" as const, value: s })),
        ...filters.users.map(u => 
          ({ type: "users" as const, 
            value: u,
            label: availableUsers.find(user => user.id === u)?.name || u 
        })),
        ...(filters.cities || []).map(c => ({ type: "cities" as const, value: c })),
    ], [filters, availableUsers]);
}