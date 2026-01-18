import { Project } from "@/types/generics";
import { ValidationResult } from "./clientValidation";

export function validateProject (
    data: Omit<Project, "id">
) : ValidationResult< Omit<Project, "id">>{
    const newErrors: ValidationResult<any>["errors"] = {};

    if (!data.client_id?.trim()){
        newErrors.client = "Klient je povinný údaj!";
    }
    if (!data.scheduled_date && !data.start_date ){
        newErrors.dates = "Pre uloženie je potrebné zadať plánovaný dátum alebo dátum začatia projektu!";
    }
    
    if (!data.type){
        newErrors.type = "Vyberte typ projektu!";
    }

    if (!data.state){
        newErrors.state = "Vyberte stav projektu!";
    }

    return {
        valid: Object.keys(newErrors).length === 0,
        errors: newErrors
    };
};