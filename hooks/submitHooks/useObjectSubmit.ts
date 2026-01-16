import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { ChimneyInput, Object as ObjectType, ObjectWithRelations } from "@/types/objectSpecific";
import { useCallback, useState } from "react";


interface UseObjectSubmitProps {
    mode: "create" | "edit";
    initialData?: ObjectWithRelations;
    onSuccess?: (object: ObjectWithRelations) => void;
}

export function useObjectSubmit({mode, initialData, onSuccess} : UseObjectSubmitProps) {
    const [loading, setLoading] = useState(false);

    const transforCompleteObject = (completeObject: any): ObjectWithRelations => {
        return {
            object: {
              id: completeObject.id,
              client_id: completeObject.client_id,
              address: completeObject.address,
              streetNumber: completeObject.streetNumber,
              city: completeObject.city,
              country: completeObject.country
            },
            client: completeObject.clients,  
            chimneys: completeObject.chimneys || []
        };
    };

    async function fetchCompleteObject (objectId: string) {
        const { data: completeObject, error: fetchError } = await supabase
            .from('objects')
            .select(`
                *,
                clients (*),
                chimneys (
                    id,
                    object_id,
                    chimney_type_id,
                    placement,
                    appliance,
                    note,
                    chimney_types (
                        id,
                        type,
                        labelling
                    )
                )
            `)
            .eq('id', objectId)
            .single();
        
        if (fetchError) throw fetchError;
        return transforCompleteObject(completeObject);
    };

    async function saveChimneys(objectId: string, chimneys: ChimneyInput[]){
        if (chimneys.length === 0) return;

        const chimneyData = chimneys.map(chimney => ({
            object_id: objectId,
            chimney_type_id: chimney.chimney_type_id,
            placement: chimney.placement,
            appliance: chimney.appliance,
            note: chimney.note
        }));

        const { error } = await supabase
            .from("chimneys")
            .insert(chimneyData);

        if (error) throw error;
    };

    async function deleteChimneys(objectId: string){
        const { error: deleteError } = await supabase
            .from('chimneys')
            .delete()
            .eq('object_id', objectId);

        if (deleteError) throw deleteError;
    };

    async function  createObject (
        formData: Omit<ObjectType, "id">,
        chimneys: ChimneyInput[]
    ){
        const {data: objectData, error: objectError} = await supabase
            .from('objects')
            .insert([formData])
            .select()
            .single();
        
        if (objectError) throw objectError;
        await saveChimneys(objectData.id, chimneys);
        return await fetchCompleteObject(objectData.id);
    };

    async function updateObject (
        formData: Omit<ObjectType, "id">,
        chimneys: ChimneyInput[]
    ){
        const {data: objectData, error: objectError} = await supabase
           .from('objects')
           .update(formData)
           .eq('id', initialData?.object.id)
           .select()
           .single()

        if (objectError) throw objectError;
        await deleteChimneys(objectData.id);
        await saveChimneys(objectData.id, chimneys);
        return await fetchCompleteObject(objectData.id);
    };

    
    const handleSubmit = useCallback(async (
        formData: Omit<ObjectType, "id">,
        chimneys: ChimneyInput[]
    ) => {
   
        setLoading(true);
        try { 
            const completeObject = mode === "create"
                ? await createObject(formData, chimneys)
                : await updateObject(formData, chimneys);

           onSuccess?.(completeObject);

           useNotificationStore.getState().addNotification(
                mode === "create" 
                     ? 'Objekt bol úspešne vytvorený'
                     : 'Objekt bol úspešne upravený',
                'success',
                "objects",
                3000
            );
        }
   
        catch (error: any){
             console.error("Error saving object: ", error);
             useNotificationStore.getState().addNotification(
                 mode === "create" 
                      ? 'Nepodarilo sa vytvoriť objekt'
                      : 'Nepodarilo sa upraviť objekt',
                 'error',
                 "objects",
                 4000
             );
        }
        finally{
            setLoading(false);
        }
    }, [createObject, updateObject]);

    return {
        loading,
        handleSubmit
    }
}
