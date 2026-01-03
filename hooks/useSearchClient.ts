import { supabase } from "@/lib/supabase";
import { Client, ClientField } from "@/types/generics";
import { useCallback, useState } from "react";

export const useSearchClient = <T extends ClientField>(
    handleChange: (field:keyof T, value: string) => void
) => {

    const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [timerId, setTimerId] = useState<number>();

    const handleSearchClient = useCallback((text: string) => {
        setSearchQuery(text);

        if(timerId) {
            clearTimeout(timerId);
        }
        const timer = window.setTimeout(() => {
            searchClient(text);
        }, 300);

        setTimerId(timer);
    }, [timerId]);

    async function searchClient(query: string) {
        if (query.trim().length < 2){
            setClientSuggestions([]);
            return;
        }
        setLoadingClients(true);
        try{
            const { data, error } = await supabase
                .from("clients")
                .select("*")
                .or(`name.ilike.%${query}%,phone.ilike.%${query}%`)
                .order("name")
                .limit(20);

            if (error) throw error;
            setClientSuggestions(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setClientSuggestions([]);
        }
        finally{
            setLoadingClients(false);
        }
    }

    const handleSelectedClient = (client: Client) => {
        setSelectedClient(client);
        setSearchQuery(client.name);
        setClientSuggestions([]);
        handleChange("client_id", client.id);
        //setFormData(prev => ({ ...prev, client_id: client.id}));

        //if (errors.client_id){
        //    setErrors(prev => {
        //        const newErrors = {...prev};
        //        delete newErrors.client_id;
        //        return newErrors;
        //    });
        //}
    };

    return {
        handleSearchClient,
        searchClient,
        handleSelectedClient,
        clientSuggestions,
        loadingClients,
        searchQuery,
        selectedClient,
        setSelectedClient,
        setSearchQuery
    };
}