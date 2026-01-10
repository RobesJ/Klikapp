import { parsePhoneNumberFromString } from "libphonenumber-js";

export function validateAndNormalizePhone(phone: string){
    // repalce slash with space
    const cleanedPhone = phone.replace(/\//g, '');
    
    try {
        // try to validate phone wihtout country (number must start with +XXX prefix)
        let phoneNumber = parsePhoneNumberFromString(cleanedPhone);

        // if it does not have prefix assume the number is Slovak
        if(!phoneNumber){
            phoneNumber = parsePhoneNumberFromString(cleanedPhone, "SK");
        }

        if(!phoneNumber || !phoneNumber.isValid()){
            return {
                valid: false,
                normalized: null,
                error: "Neplatné telefónne číslo" 
            };
        }

        return {
            valid: true,
            normalized: phoneNumber.number,
            country: phoneNumber.country,
            type: phoneNumber.getType(),
            formatted: phoneNumber.formatInternational()
        };
    }
    catch (error: any) {
        return {
            valid: false,
            normalized: null,
            error: "Neplatný formát telefónneho čísla" 
        };
    }
}