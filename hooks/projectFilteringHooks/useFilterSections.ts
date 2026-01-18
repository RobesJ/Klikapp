import { STATE_OPTIONS, TYPE_OPTIONS } from "@/components/badge";
import { ProjectFilters } from "@/store/projectScreenStore";
import { User } from "@/types/generics";
import { useMemo } from "react";

interface UseFilterSectionsProps {
    filters: ProjectFilters;
    availableUsers: User[];
    availableCities?: string[];
    toggleType: (type: string) => void;
    toggleState: (state: string) => void;
    toggleUser: (userId: string) => void;
    toggleCity?: (city: string) => void;
    stateOptions?: typeof STATE_OPTIONS;
}

export function useFilterSections({
    filters,
    availableUsers,
    availableCities,
    toggleType,
    toggleState,
    toggleUser,
    toggleCity,
    stateOptions = STATE_OPTIONS
}: UseFilterSectionsProps){

    return useMemo(() => {
        const sections = [
            {
              id: 'type',
              title: 'Typ',
              type: 'styled' as const,
              options: TYPE_OPTIONS.map(type => ({
                value: type.value,
                colors: type.colors,
              })),
              selectedValues: filters.type,
              onToggle: toggleType,
            },
            {
              id: 'state',
              title: 'Stav',
              type: 'styled' as const,
              options: STATE_OPTIONS.map(state => ({
                value: state.value,
                colors: state.colors,
              })),
              selectedValues: filters.state,
              onToggle: toggleState,
            },
            {
              id: 'users',
              title: 'Priradení používatelia',
              type: 'simple' as const,
              options: availableUsers.map(user => ({
                value: user.id,
                label: user.name,
              })),
              selectedValues: filters.users,
              onToggle: toggleUser,
            },
        ];

        if (availableCities && toggleCity){
            sections.push({
                id: 'cities',
                title: 'Mesto',
                type: 'simple' as const,
                options: availableCities.map(city => ({
                  value: city,
                  label: city,
                })),
                selectedValues: filters.cities ?? [],
                onToggle: toggleCity,
            });
        }

        return sections;
    }, [
        filters, 
        availableCities,
        availableUsers,
        toggleState,
        toggleState,
        toggleUser,
        toggleCity,
        stateOptions
    ]);
}