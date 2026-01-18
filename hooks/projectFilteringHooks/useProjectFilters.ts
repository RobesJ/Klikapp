import { ProjectFilters } from "@/store/projectScreenStore";
import { useCallback, useState } from "react";

export type FilterType = "type" | "state" | "users" | "cities" | "dateFrom" | "dateTo" | "searchQuery";

interface UseProjectFiltersOptions {
    includeCities?: boolean;
    includeSearch?: boolean;
    includeDates?: boolean;
}

export function useProjectFilters(options: UseProjectFiltersOptions = {}){
    const {
        includeCities = false,
        includeSearch = false,
        includeDates = false
    } = options;

    const [filters, setFilters] = useState<ProjectFilters>({
        type: [],
        state: [],
        users: [],
        ...(includeCities && {cities : []}),
        ...(includeSearch && {searchQuery: '' }),
        ...(includeDates && {dateFrom: null, dateTo: null}),
    });

    const toggleType = useCallback((type: string) => {
        setFilters(prev => ({
            ...prev,
            type: prev.type.includes(type)
              ? prev.type.filter(t => t !== type)
              : [...prev.type, type]
        }));
    },[]);
      
    const toggleState = useCallback((state: string) => {
        setFilters(prev => ({
            ...prev,
            state:  prev.state.includes(state)
              ? prev.state.filter(s => s !== state) 
              : [...prev.state, state],       
        }));
    }, []);
    
    const toggleUser = useCallback((userId: string) => {
        setFilters(prev => ({
            ...prev,
            users: prev.users.includes(userId)
            ? prev.users.filter(u => u !== userId)
            : [...prev.users, userId],
        }));
    }, []);

    const toggleCity = useCallback((city: string) => {
        if(!includeCities) return;

        setFilters(prev => {
            const cities = prev.cities ?? [];
            return {
                ...prev,
                cities: cities.includes(city)
                ? cities.filter(c => c !== city)
                : [...cities, city],
            };
        });
    }, []);
    
    const setSearchQuery = useCallback((query: string) => {
        if(!includeSearch) return;
        setFilters(prev => ({ ...prev, searchQuery: query}));
    }, [includeCities]);

    const setDateRange = useCallback((from: string | null, to: string | null) => {
        if(!includeDates) return;
        setFilters(prev => ({ ...prev, dateFrom: from, dadeTo: to}));
    }, [includeDates]);

    const removeFilter = useCallback((filterType: FilterType, value: string) => {
        setFilters(prev => {
            if (filterType === "searchQuery"){
                return { ...prev, searchQuery: ''};
            }
            if (filterType === "dateFrom" || filterType === "dateTo" ){
                return { ...prev, [filterType]: null};
            }

            return {
                ...prev,
                [filterType]: ((prev[filterType] as string[]) || []).filter(v => v !== value),
            };
        });
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ 
            type: [],
            state: [],
            users: [],
            ...(includeCities && {cities : []}),
            ...(includeSearch && {searchQuery: '' }),
            ...(includeDates && {dateFrom: null, dateTo: null}),
        });
    }, []);

    const hasActiveFilters = 
        filters.type.length > 0 ||
        filters.state.length > 0 ||
        filters.users.length > 0 ||
        (filters.cities?.length ?? 0) > 0 ||
        (filters.searchQuery ?? '').length > 0 ||
        filters.dateFrom !== null ||
        filters.dateTo !== null;

    return {
        filters, 
        toggleType,
        toggleCity,
        toggleState,
        toggleUser,
        setSearchQuery,
        setDateRange,
        removeFilter,
        clearFilters,
        hasActiveFilters
    };
}