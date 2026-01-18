import { Chimney, ChimneyInput, Object } from "@/types/objectSpecific";
import { ValidationResult } from "./clientValidation";

export function validateObject(
    data: Omit<Object, "id">,
    selectedChimneys: ChimneyInput[] | []
): ValidationResult<Omit<Object, "id">> {

    const newErrors: ValidationResult<any>["errors"] = {};

    if(!data.client_id?.trim()){
        newErrors.client = "Klient je povinná položka!";
    }

    if(!data.address?.trim()){
        newErrors.address = "Adresa je povinná položka!";
    }

    if (selectedChimneys.length === 0) {
        newErrors.chimneys = "Pre uloženie objektu vytvorte aspoň jeden komín!";
    }

    return {
        valid: Object.keys(newErrors).length === 0,
        errors: newErrors
    };
};

export function validateChimney (
    data: Omit<Chimney, "id">,
): ValidationResult<Omit<Chimney, "id">> {
    const newErrors: ValidationResult<any>["errors"] = {};

    if (!data.appliance?.trim()) {
        newErrors.appliance= "Druh spotrebiča je povinná položka!";
    }

    if (!data.placement?.trim()) {
        newErrors.placement = "Umiestnenie spotrebiča je povinná položka!";
    }

    return {
        valid: Object.keys(newErrors).length === 0,
        errors: newErrors
    };
};