import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { Project, User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useState } from "react";

interface UseProjectSubmitProps {
    mode: "create" | "edit";
    oldState? : string;
    initialData?: ProjectWithRelations;
    onSuccess?: (project: ProjectWithRelations) => void;
}

export function useProjectSubmit({ mode, oldState, initialData, onSuccess }: UseProjectSubmitProps) {
    const [loading, setLoading]= useState(false);

    const cleanFormData = (formData: Omit<Project, "id">): Omit<Project, "id"> => {
        const cleanedFormData = {
            ...formData,
            scheduled_date: formData.scheduled_date || null,
            start_date: formData.start_date || null,
            completion_date: formData.completion_date || null
        };
        
        // check the oldState and check/change date values
        if(oldState && oldState !== cleanedFormData.state){
            if (cleanedFormData.state === "Nový"){
                cleanedFormData.start_date = null;
                cleanedFormData.completion_date = null;
            }
            else if (["Prebieha", "Pozastavený", "Naplánovaný"].includes(cleanedFormData.state)){
                if (oldState === "Nový"){
                    cleanedFormData.start_date = cleanedFormData.start_date || new Date().toISOString().split('T')[0]; 
                }
                else if (["Ukončený","Zrušený"].includes(oldState)){
                  cleanedFormData.completion_date = null;
                }
            }
            else if (["Ukončený","Zrušený"].includes(cleanedFormData.state)){
              if (!["Ukončený","Zrušený"].includes(oldState)){
                  cleanedFormData.completion_date = cleanedFormData.completion_date || new Date().toISOString().split('T')[0]; 
              }
            }
        }   

        return (
            cleanedFormData
        );
    };

    const transformCompleteProject = (completeProject: any) : ProjectWithRelations => {
    
        const assignedUsers: User[] = completeProject.project_assignments
            ?.map((pa: any) => pa.user_profiles)
            .filter(Boolean) || [];

        const assignedObjects: ObjectWithRelations[] = completeProject.project_objects
            ?.map((po: any) => {
              if (!po.objects) return null;
              
              const chimneys: Chimney[] = po.objects.chimneys
                ?.map((c: any) => ({
                  id: c.id,
                  chimney_type_id: c.chimney_types?.id || null,
                  type: c.chimney_types?.type || null,
                  labelling: c.chimney_types?.labelling || null,
                  appliance: c.appliance,
                  placement: c.placement,
                  note: c.note
                }))
                .filter(Boolean) || [];
              
              return {
                object: po.objects,
                chimneys: chimneys,
                client: completeProject.clients
              };
            })
            .filter(Boolean) || [];
    

        return {
            project: {
                id: completeProject.id,
                client_id: completeProject.client_id,
                type: completeProject.type,
                state: completeProject.state,
                scheduled_date: completeProject.scheduled_date,
                start_date: completeProject.start_date,
                completion_date: completeProject.completion_date,
                note: completeProject.note
            },
            client: completeProject.clients,
            users: assignedUsers,
            objects: assignedObjects
        };
    };

    const fetchCompleteProject = async (projectId: string) => {
        const { data: completeProject, error: fetchError } = await supabase
            .from("projects")
            .select(`
                *,
                clients(*),
                project_assignments (
                    user_profiles (id, name, email)
                ),
                project_objects(
                    objects(
                        id,
                        client_id,
                        address,
                        city,
                        streetNumber,
                        country,
                        chimneys(
                            id,
                            chimney_types (id, type, labelling),
                            placement,
                            appliance,
                            note
                        )
                    )
                )
            `)
            .eq("id", projectId)
            .single();
            
        if (fetchError) throw fetchError;
        return transformCompleteProject(completeProject);
    };
    
    const saveUserRelations = async (projectId: string, users: User[]) => {
        if (users.length === 0) return;

        const usersProjectRelations = users.map(user => ({
            project_id: projectId,
            user_id: user.id,
        }));

        const {error: usersError } = await supabase
            .from("project_assignments")
            .insert(usersProjectRelations);

        if (usersError) throw usersError;       
    };

    const deleteUserRelations =  async (projectId: string) => {
        const { error: deleteError } = await supabase
            .from("project_assignments")
            .delete()
            .eq("project_id", projectId);

        if (deleteError) throw deleteError;
    };

    const saveObjectRelations = async (projectId: string, objects: ObjectWithRelations[]) => {
        if (objects.length === 0) return;

        const objectsProjectRelations = objects.map(object => ({
            project_id: projectId,
            object_id: object.object.id,
        }));

        const {error: objectsError } = await supabase
            .from("project_objects")
            .insert(objectsProjectRelations);

        if (objectsError) throw objectsError;
    };

    const deleteObjectRelations =  async (projectId: string) => {
        const { error: deleteObjectRelationsError } = await supabase
            .from("project_objects")
            .delete()
            .eq("project_id", projectId);

        if ( deleteObjectRelationsError ) throw deleteObjectRelationsError ;
    };

    const createProject = async (
        formData: Omit<Project, "id">,
        users: User[],
        objects: ObjectWithRelations[]
    ) => {
        const {data: projectData, error: projectError} = await supabase
            .from('projects')
            .insert(formData)
            .select()
            .single();

        if (projectError) throw projectError;
        await saveUserRelations(projectData.id, users);
        await saveObjectRelations(projectData.id, objects);
        return await fetchCompleteProject(projectData.id);
    };


    const updateProject = async (
        formData: Omit<Project, "id">,
        users: User[],
        objects: ObjectWithRelations[]
    ) => {
        const {data: projectData, error: projectError} = await supabase
            .from('projects')
            .update(formData)
            .eq('id', initialData?.project.id)
            .select()
            .single();

        if (projectError) throw projectError;
        await deleteUserRelations(projectData.id);
        await deleteObjectRelations(projectData.id);
        await saveUserRelations(projectData.id, users);
        await saveObjectRelations(projectData.id, objects);
        return await fetchCompleteProject(projectData.id);
    };

    const submitProject = async (
        formData: Omit<Project, "id">,
        users: User[],
        objects: ObjectWithRelations[]
    ) => {
        setLoading(true);
        try{
            const cleanedFormData = cleanFormData(formData);
            const completeProject = mode === "create"
                ? await createProject(cleanedFormData, users, objects)
                : await updateProject(cleanedFormData, users, objects);

            onSuccess?.(completeProject);

            useNotificationStore.getState().addNotification(
                mode === "create" 
                     ? 'Projekt bol úspešne vytvorený'
                     : 'Projekt bol úspešne upravený',
                'success',
                3000
            );
        }
        catch (error: any){
            console.error("Chyba pri ukladaní projektu: ", error);    
            useNotificationStore.getState().addNotification(
                mode === "create"
                    ? "Nepodarilo sa vytvoriť projekt"
                    : "Nepodarilo sa upraviť projekt",
                "error",
                4000
            );
        }
        finally{
            setLoading(false);
        }
    };

    return {
        loading,
        submitProject
    }
}