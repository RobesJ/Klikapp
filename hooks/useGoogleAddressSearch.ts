import { AddressFields, Client } from "@/types/generics";
import { useState } from "react";

export const useGoogleSearchAddress = <T extends AddressFields>(
    handleChange: (field: keyof T , value: string) => void
) => {

    const [addressSearch, setAddressSearch] = useState('');
    const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
    const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
    const [searchingAddress, setSearchingAddress] = useState(false);
    const API_KEY = process.env.EXPO_PUBLIC_MAPS_API_KEY;

    const searchGoogleAddress = async (text: string) => {
        setAddressSearch(text);
        handleChange("address" as keyof T, text);

        if (text.length < 3) {
            setAddressSuggestions([]);
            setShowAddressSuggestions(false);
            return;
        }

        setSearchingAddress(true);
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${API_KEY}&components=country:sk&language=sk`
            );
            const data = await response.json();

            if (data.predictions) {
                setAddressSuggestions(data.predictions);
                setShowAddressSuggestions(true);
            }
        } catch (error) {
            console.error('Address search error:', error);
        } finally {
            setSearchingAddress(false);
        }
    };

    const selectClientAddress = async (preselectedClient: Client) => {
        if(preselectedClient.address){
            const fullAddress = preselectedClient.address;
            handleChange("address", fullAddress);
            setAddressSearch(fullAddress);

            if (preselectedClient.streetNumber) {
                handleChange("streetNumber" as keyof T,preselectedClient.streetNumber);
            }
            if (preselectedClient.city) {
                handleChange("city" as keyof T,preselectedClient.city);
            } 
            if (preselectedClient.country) {
                handleChange("country" as keyof T,preselectedClient.country);
            }
        }
    };

    function parseAddressComponents(components: any[]) {
        let street: string | null = null;
        let number: string | null = null;
        
        components.forEach((component: any) => {
            const types = component.types;
            
            if (types.includes('route')) {
                street = component.long_name;
            }
            if (types.includes('street_number')) {
                number = component.long_name;
            }
            if (types.includes('sublocality') || types.includes('locality')) {
                handleChange("city" as keyof T,component.long_name)
            }
            if (types.includes('country')) {
                handleChange("country" as keyof T,component.long_name)
            }
        });
        
        if (street && number) {
            handleChange("streetNumber" as keyof T,`${street} ${number}`);
        } else if (street) {
            handleChange("streetNumber" as keyof T,street);
        } else if (number) {
            handleChange("streetNumber" as keyof T,number);
        }
    };

    const selectAddress = async (suggestion: any) => {
        const fullAddress = suggestion.description;
        handleChange("address" as keyof T, fullAddress);
        setAddressSearch(fullAddress);
        setShowAddressSuggestions(false);
        
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/place/details/json?place_id=${suggestion.place_id}&key=${API_KEY}&language=sk`
            );
            const data = await response.json();
            
            if (data.result && data.result.address_components) {
               parseAddressComponents(data.result.address_components);
            }
        } catch (error) {
            console.error('Error fetching place details:', error);
        }
    };

    return {
        addressSearch,
        addressSuggestions,
        showAddressSuggestions,
        searchingAddress,
        searchGoogleAddress,
        selectClientAddress,
        selectAddress,
        setShowAddressSuggestions,
    };
}