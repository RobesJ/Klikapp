import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { Client } from "@/types/generics";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

interface UseClientSubmitProps{
    mode: "create" | "edit";
    initialData?: Client;
    onSuccess?: (client: Client) => void;
}

export function useClientSubmit({mode, initialData, onSuccess} : UseClientSubmitProps) {
    const [loading, setLoading] = useState(false);
    
    const confirmDuplicateWarning = (duplicates: string[]): Promise<boolean> => {
        return new Promise((resolve) => {
            Alert.alert(
                "Nájdená duplicita v mene alebo adrese",
                `Podobní klienti:\n${duplicates.join('\n')}\n\nChcete pokračovať?`,
                [
                    { 
                        text: 'Nie', 
                        style: "cancel",
                        onPress:  () => resolve(false)
                    },
                    {
                        text: 'Áno',
                        style: 'default',
                        onPress: async () => resolve(false)
                    }
                ]
            );
        });
    }

    const showDuplicateError = (duplicates: string[]): void => {
        Alert.alert(
            "Klient existuje",
            `V databáze existuje klient s rovnakým číslom alebo emailom:\n${duplicates.join('\n')}`,
            [
                { 
                    text: "OK", 
                    style: "cancel"
                }
            ]
        );
    }

    async function checkDuplicateWithFuzzy(name: string, phone: string | null, email: string | null, place_id: string | null) {
        const { data, error } = await supabase.rpc('find_similar_clients', {
            p_name: name,
            p_phone: phone,
            p_place_id: place_id,
            p_email: email,
            similarity_threshold: 0.4
        });

        if (error) throw error;

        if (data && data.length > 0) {
            const duplicateInfoWarn: string [] = [];
            const duplicateInfoQuit: string [] = [];
            data.forEach((match: any) => {
                if(match.match_type === "exact_email"){
                    duplicateInfoQuit.push(`${match.name} (rovnaký email)`);
                }
                else if(match.match_type === "exact_phone"){
                    duplicateInfoQuit.push(`${match.name} (rovnaké číslo)`);
                }
                else if(match.match_type === "exact_address"){
                    duplicateInfoWarn.push(`${match.name} (rovnaká adresa)`);
                }
                else if(match.match_type === "name_similarity"){
                    duplicateInfoWarn.push(`${match.name} (podobné meno)`);
                }
            });
            return {
              isDuplicate: true,
              duplicateInfoQuit,
              duplicateInfoWarn
            };
        }
        return { isDuplicate: false, duplicateInfoQuit: [], duplicateInfoWarn: []};
    };

    async function createClient (formData: Omit<Client, "id">){
        const {data, error} = await supabase
            .from('clients')
            .insert([formData])
            .select()
            .single();
        
        if (error) throw error;
        onSuccess?.(data);
        return data;
    };

    async function updateClient (formData: Omit<Client, "id">){
        const {data, error} = await supabase
           .from('clients')
           .update(formData)
           .eq('id', initialData?.id)
           .select()
           .single();

        if (error) throw error;
        onSuccess?.(data);
        return data;
    };

    const submitClient = useCallback(async (formData: Omit<Client, "id">,) => {
        setLoading(true);
        try{
            if (mode === "create"){
                const result = await checkDuplicateWithFuzzy(formData.name, formData.phone, formData.email, formData.place_id);
                if (result.isDuplicate){
                    if(result.duplicateInfoQuit.length > 0){
                        showDuplicateError(result.duplicateInfoQuit);
                        return;
                    }

                    if (result.duplicateInfoWarn.length > 0){
                        const shouldProceed = await confirmDuplicateWarning(result.duplicateInfoWarn);
                        if(!shouldProceed) return; 
                    }
                }
                
                await createClient(formData);
            }
            else { 
                await updateClient(formData);
                
            }
        }
        catch (error: any){
            console.error("Error saving client: ", error);
            let message: string = mode === "create" 
             ? "Nastala chyba pri vytváraní klienta"
             : "Nastala chyba pri úprave klienta";

            useNotificationStore.getState().addNotification(
                message,
                'error',
                "clientForm",
                3000
            );
        }
        finally{
            setLoading(false);
        }
    },[initialData, mode]);

    return {
        loading,
        submitClient
    };
}