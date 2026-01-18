import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { useProjectStore } from "@/store/projectScreenStore";
import { Project, User } from "@/types/generics";
import { Chimney, ChimneyType, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseProjectSubmitProps {
    mode: "create" | "edit";
    oldState? : string;
    initialData?: ProjectWithRelations;
    onSuccess?: (project: ProjectWithRelations) => void;
}

export function useProjectSubmit({ mode, oldState, initialData, onSuccess }: UseProjectSubmitProps) {
    const initialDataRef = useRef(initialData);
    const oldStateRef = useRef(oldState);

    const [loading, setLoading]= useState(false);
    const [updatingState, setUpdatingState] = useState(false);
    const { addProject, updateProject } = useProjectStore();

    useEffect(() => {
        initialDataRef.current = initialData;
        oldStateRef.current = oldState;
    }, [initialData, oldState]);

    const calculateDatesForstateChange = (
        newState: string,
        oldState: string,
        currentStartDate: string | null,
        currentCompletionDate: string | null
    ) => {
        let startDate =  currentStartDate;
        let completionDate =  currentCompletionDate;

        if (newState === "Nový"){
            startDate = null;
            completionDate = null;
        }

        else if (["Prebieha", "Pozastavený", "Naplánovaný"].includes(newState)){
            if (oldState === "Nový"){
              startDate = startDate ||  new Date().toISOString().split('T')[0]; 
            }
            else if (["Ukončený","Zrušený"].includes(oldState)){
              completionDate = null;
            }
        }

        else if (["Ukončený","Zrušený"].includes(newState)){
            if (!["Ukončený","Zrušený"].includes(oldState)){
                completionDate = completionDate || new Date().toISOString().split('T')[0];
            }
        }

        return { startDate, completionDate };
    }

    const handleStateChange = useCallback(async (newState: string, projectOldState: string) => {
        if (updatingState || !initialDataRef.current) return;
        setUpdatingState(true);

        const { startDate, completionDate } = calculateDatesForstateChange(
            newState,
            projectOldState,
            initialDataRef.current.project.start_date,
            initialDataRef.current.project.completion_date
        );

        try {
            const updateData: Omit<Project, "id"> ={
                state: newState,
                client_id: initialDataRef.current.client.id,
                type: initialDataRef.current.project.type,
                scheduled_date: initialDataRef.current.project.scheduled_date,
                start_date: startDate,
                completion_date: completionDate, 
                note: initialDataRef.current.project.note     
            }
        
            await updateProjectInDBS(
                updateData, 
                initialDataRef.current.users, 
                initialDataRef.current.objects
            );


            if(newState === "Ukončený"){
                let newType;
                const completion = new Date(completionDate!);
                let scheduledDate: string;
          
                if (initialDataRef.current.project.type === "Obhliadka") {
                    newType = "Montáž";
                    const nextWeek = new Date(completion);
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    scheduledDate = nextWeek.toISOString().split("T")[0];
                } else {
                    newType = "Čistenie";
                    const nextYear = new Date(completion);
                    nextYear.setFullYear(nextYear.getFullYear() + 1);
                    scheduledDate = nextYear.toISOString().split("T")[0];
                }

                const insertData: Omit<Project, "id"> ={
                    state: "Nový",
                    client_id: initialDataRef.current.client.id,
                    type: newType,
                    scheduled_date: scheduledDate,
                    start_date: null,
                    completion_date: null,
                    note: ''     
                }
                await createProject(insertData, [], []);
                useNotificationStore.getState().addNotification(
                    `Bol vytvorený nový projekt typu: ${newType}`,
                    "success",
                    "projectDetails",
                    3000
                );
            }
        }
        catch (error: any) {
            console.error('Error updating project state:', error);
            useNotificationStore.getState().addNotification(
              "Nepodarilo sa upraviť stav projektu",
              "error",
              "projectDetails",
              4000
            );
        } 
        finally {
            setUpdatingState(false);
        }
    }, [updatingState, addProject, updateProject]);

    const cleanFormData = (
        formData: Omit<Project, "id">,
        currentOldState?: string
    ): Omit<Project, "id"> => {
        const cleanedFormData = {
            ...formData,
            scheduled_date: formData.scheduled_date || null,
            start_date: formData.start_date || null,
            completion_date: formData.completion_date || null
        };
        
        // check the oldState and check/change date values
        if(currentOldState && currentOldState !== cleanedFormData.state){
            const { startDate, completionDate } = calculateDatesForstateChange(
                cleanedFormData.state,
                currentOldState,
                cleanedFormData.start_date,
                cleanedFormData.completion_date
            );
            cleanedFormData.start_date = startDate;
            cleanedFormData.completion_date = completionDate;
        }   

        return cleanedFormData;
    };

    const transformCompleteProject = (completeProject: any) : ProjectWithRelations => {
        const assignedUsers: User[] = completeProject.project_assignments
            ?.map((pa: any) => pa.user_profiles)
            .filter(Boolean) || [];

        const assignedObjects: ObjectWithRelations[] = completeProject.project_objects
            ?.map((po: any) => {
                if (!po.objects) return null;

                const chimneys: Chimney[] = po.objects.chimneys
                    ?.map((c: any) => {
                        const chimneyType: ChimneyType | undefined = c.chimney_type
                            ? {
                                id: c.chimney_type.id,
                                type: c.chimney_type.type,
                                labelling: c.chimney_type.labelling,
                            }
                            : undefined;

                        return {
                            id: c.id,
                            chimney_type_id: c.chimney_type_id,
                            chimney_type: chimneyType,
                            appliance: c.appliance,
                            placement: c.placement,
                            note: c.note,
                        } as Chimney;
                    })
                    .filter(Boolean) || [];

                return {
                    object: po.objects,
                    chimneys,
                    client: completeProject.clients,
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
                note: completeProject.note,
            },
            client: completeProject.clients,
            users: assignedUsers,
            objects: assignedObjects,
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
                        chimneys (
                            id,
                            chimney_type_id,
                            placement,
                            appliance,
                            note,
                            chimney_type:chimney_types (
                              id,
                              type, 
                              labelling
                            )
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
        const newProject = await fetchCompleteProject(projectData.id);
        addProject(newProject);
        return newProject;
    };

    const updateProjectInDBS = async (
        formData: Omit<Project, "id">,
        users: User[],
        objects: ObjectWithRelations[]
    ) => {
        if (!initialDataRef.current?.project.id) {
            throw new Error("Project ID is required for update");
        }

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
        const updatedProject =  await fetchCompleteProject(projectData.id);
        updateProject(initialDataRef.current.project.id, updatedProject, true);
        return updatedProject;
    };

    const submitProject = useCallback(async (
        formData: Omit<Project, "id">,
        users: User[],
        objects: ObjectWithRelations[]
    ) => {
        setLoading(true);
        try{
            const cleanedFormData = cleanFormData(formData, oldState);
            const completeProject = mode === "create"
                ? await createProject(cleanedFormData, users, objects)
                : await updateProjectInDBS(cleanedFormData, users, objects);

            onSuccess?.(completeProject);

            useNotificationStore.getState().addNotification(
                mode === "create" 
                     ? 'Projekt bol úspešne vytvorený'
                     : 'Projekt bol úspešne upravený',
                'success',
                "projects",
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
                "projects",
                4000
            );
        }
        finally{
            setLoading(false);
        }
    }, [mode, createProject, updateProjectInDBS, onSuccess]);

    return {
        loading,
        submitProject,
        handleStateChange,
        updatingState
    };
}