import { Client } from "@/types/generics";
import { validateAndNormalizePhone } from "./phoneInputValidation";

export type ValidationResult<T> = {
    valid: boolean;
    errors: Partial<Record<keyof T, string>>;
    normalized?: Partial<T>;
};

export function validateClient(
    data: Omit<Client, "id">
  ): ValidationResult<Omit<Client, "id">> {
    const errors: ValidationResult<any>["errors"] = {};
    const normalized: Partial<Omit<Client, "id">> = {};

    if(!data.name.trim()){
        errors.name = "Meno je povinná položka!";
    }
    else {
        const normalizedName = data.name
            .trim()
            .replace(/\s+/g, ' ')                           // Normalize spaces: "   " → " "            
            .replace(/\s*,\s*/g, ', ')                      // Normalize commas: "ABC,s.r.o." → "ABC, s.r.o."
            .replace(/\bs\.?\s*r\.?\s*o\.?\b/gi, 's.r.o.')  // Normalize s.r.o variations: "sro" → "s.r.o."
            .replace(/\ba\.?\s*s\.?\b/gi, 'a.s.');          // Normalize a.s. variations: "as" → "a.s."
        if (normalizedName !== data.name){
            normalized.name = normalizedName;
        }
    }

    if(data.email && data.email.trim() !== ''){
        const normalizedEmail = data.email.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            errors.email = 'Neplatný formát emailu!';
        }
        else if (normalizedEmail !== data.email){
            normalized.email = normalizedEmail;
            normalized.unformatted_email = data.email.trim();
        }
    }

    if(!data.address?.trim()){
        errors.address = "Adresa je povinná položka!";
    }

    if(!data.phone || data.phone.trim() === ' '){
        errors.phone = "Telefonné číslo je povinná položka!";
    }
    else {
        const phoneValidation = validateAndNormalizePhone(data.phone);
        if (!phoneValidation.valid && phoneValidation.error ){
            errors.phone = phoneValidation.error;
        }
        else if (phoneValidation.valid && phoneValidation.normalized){
            normalized.phone = phoneValidation.normalized;
        }
    }

    if(!data.type){
        errors.type = "Typ klienta je povinná položka!";
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
        normalized
    }
};