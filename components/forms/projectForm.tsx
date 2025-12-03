import { supabase } from "@/lib/supabase";
import { Client, Project, User } from "@/types/generics";
import { Chimney, ObjectWithRelations, ProjectWithRelations } from "@/types/projectSpecific";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { BadgeSelector, ModalSelector, STATE_OPTIONS, TYPE_OPTIONS } from "../badge";
import ModernDatePicker from "../modernDatePicker";


interface ProjectFormProps{
    mode: "create" | "edit";
    initialData?: ProjectWithRelations;
    onSuccess?: (project: ProjectWithRelations) => void;
    preselectedClient?: Client;
}

export default function ProjectForm({ mode, initialData, onSuccess, preselectedClient} : ProjectFormProps) {

    const [formData, setFormData] =  useState<Omit<Project, 'id'> & { id?: string }>({
        client_id: initialData?.client.id ?? "",
        type: initialData?.project.type ?? "Nový",
        state: initialData?.project.state ?? "",
        scheduled_date: initialData?.project.scheduled_date ?? null,
        start_date: initialData?.project.start_date ?? null,
        completion_date: initialData?.project.completion_date ?? null,
        note: initialData?.project.note ?? "",
      });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [clientSuggestions, setClientSuggestions] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClient, setSelectedClient] = useState<Client | null>(initialData?.client ?? null);
    const [timerId, setTimerId] = useState<number>();

    const [selectedType, setSelectedType] = useState(initialData?.project.type ?? "");
    const [selectedState, setSelectedState] = useState(initialData?.project.state ?? "");
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);

    const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQueryUser, setSearchQueryUser] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>(initialData?.users ?? [] );
    const [timerId2, setTimerId2] = useState<number>();
    const [showUserModal, setShowUserModal] = useState(false);

    const [assignedObjects, setAssignedObjects] = useState<ObjectWithRelations[]>([]);
    const [loadingObjects, setLoadingObjects] = useState(false);
    const [selectedObjects, setSelectedObjects] = useState<ObjectWithRelations[]>(initialData?.objects ?? [] );
    const [showObjectModal, setShowObjectModal] = useState(false);
    const router = useRouter();
    
    useEffect(() => {
        if (initialData){
            setFormData({
                client_id: initialData?.client.id ?? "",
                type: initialData?.project.type ?? "Nový",
                state: initialData?.project.state ?? "",
                scheduled_date: initialData?.project.scheduled_date ?? null,
                start_date: initialData?.project.start_date ?? null,
                completion_date: initialData?.project.completion_date ?? null,
                note: initialData?.project.note ?? "",
              });
          
            if (initialData.project.scheduled_date){
                const parsedDate = new Date(initialData.project.scheduled_date);
                setScheduledDate(parsedDate);
            }
            if (initialData.project.start_date){
                const parsedDate = new Date(initialData.project.start_date);
                setStartDate(parsedDate);
            }
            if (initialData.project.completion_date){
                const parsedDate = new Date(initialData.project.completion_date);
                setCompletionDate(parsedDate);
            }
            if (initialData.users && initialData.users.length > 0){
                setAssignedUsers(initialData.users);
            }
            if (initialData.objects && initialData.objects.length > 0){
                setAssignedObjects(initialData.objects);
            }
        }
        else if (preselectedClient){
            setSelectedClient(preselectedClient);
            setFormData(prev => ({...prev, client_id: preselectedClient.id}));
        }
        setSelectedState("Nový");
    }, [initialData, preselectedClient]);
    
    const handleChange = (field: keyof Omit<Project, 'id'>, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if(errors[field]){
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };
    
    const handleSearchClient = (text: string) => {
        setSearchQuery(text);
        
        if(timerId) {
            clearTimeout(timerId);
        }
        const timer = window.setTimeout(() => {
            searchClient(text);
        }, 300);

        setTimerId(timer);
    };

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
                .or(`name.ilike.%${query}%`)
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
        setFormData(prev => ({ ...prev, client_id: client.id}));

        if (errors.client_id){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.client_id;
                return newErrors;
            });
        }

        if (errors.objects){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.objects;
                return newErrors;
            });
        }
    };

    const clientIsPreselected = () : boolean => {
        if (preselectedClient)
            return true;
        return false;
    };

    const validate = () : boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.client_id?.trim()){
            newErrors.client = "Klient je povinny udaj!";
        }
        if (!formData.scheduled_date && !formData.start_date ){
            newErrors.dates = "Pre ulozenie je potrebne zadat planovany datum alebo datum zacatia projektu!";
        }
        
        if (!formData.type){
            newErrors.type = "Vyberte typ projektu";
        }

        if (!formData.state){
            newErrors.state = "Vyberte stav projektu";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };


    const handleSubmit = async () => {
        if(!validate()){
            return;
        }

        setLoading(true);
        try {

            const cleanedFormData = {
                ...formData,
                scheduled_date: formData.scheduled_date || null,
                start_date: formData.start_date || null,
                completion_date: formData.completion_date || null
            }
            let projectID : string; 
            if (mode === "create"){
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .insert([cleanedFormData])
                .select()
                .single();
                
                if (projectError) throw projectError;
                projectID = projectData.id;
                
                if(selectedUsers.length > 0){
                    const usersProjectRelations = selectedUsers.map(user => ({
                        project_id: projectID,
                        user_id: user.id,
                    }));

                    const {error: usersError } = await supabase
                    .from("project_assignments")
                    .insert(usersProjectRelations);

                    if (usersError) throw usersError;
                }
                
                if(selectedObjects.length > 0){
                    const objectProjectRelations = selectedObjects.map(object => ({
                        project_id: projectID,
                        object_id: object.object.id
                    }));

                    const {error: objectError } = await supabase
                        .from("project_objects")
                        .insert(objectProjectRelations);

                    if (objectError) throw objectError;
                }
                Alert.alert('Uspech', 'Projekt bol vytvoreny!');

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
                    .eq("id", projectID)
                    .single();
                
                if (fetchError) throw fetchError;
                onSuccess?.(completeProject);
            }
            else { 
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .update(cleanedFormData)
                .eq('id', initialData?.project.id)
                .select()
                .single()

                if (projectError) throw projectError;
                projectID = projectData.id;

                const { error: deleteError } = await supabase
                    .from("project_assignments")
                    .delete()
                    .eq("project_id", projectID);
                if (deleteError) throw deleteError;

                const { error: deleteObjectError } = await supabase
                    .from("project_objects")
                    .delete()
                    .eq("project_id", projectID);
                if (deleteObjectError ) throw deleteObjectError ;

                if(selectedUsers.length > 0){
                    const usersProjectRelations = selectedUsers.map(user => ({
                        project_id: projectID,
                        user_id: user.id,
                    }));
    
                    const {error: usersError } = await supabase
                        .from("project_assignments")
                        .insert(usersProjectRelations);
    
                    if (usersError) throw usersError;
                }
               
                if(selectedObjects.length > 0){
                    const objectsProjectRelations = selectedObjects.map(object => ({
                        project_id: projectID,
                        object_id: object.object.id,
                    }));
    
                    const {error: objectsError } = await supabase
                        .from("project_objects")
                        .insert(objectsProjectRelations);
    
                    if (objectsError) throw objectsError;
                }
                
                Alert.alert('Úspech', 'Projekt bol upravený!');

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
                    .eq("id", projectID)
                    .single();
                
                if (fetchError) throw fetchError;

                onSuccess?.(completeProject);
            }
        }
        catch (error: any){
            console.error("Chyba pri ukladaní projektu: ", error);
            Alert.alert('Chyba', error.message || "Nastal problém pri ukladaní projektu");
        }
        finally{
            setLoading(false);
        }
    };

    const handleSelectedType = (type: string) => {
        setSelectedType(type);
        setFormData(prev => ({...prev, type: type}));
    };

    const handleSelectedState = (state: string) => {
        setSelectedState(state);
        setFormData(prev => ({...prev, state: state}));
    };
    
    const handleScheduledDate = (date: Date) =>{
        setScheduledDate(date);
        const convertDate2String = date.toISOString().split('T')[0]
        setFormData(prev => ({...prev, scheduled_date: convertDate2String }));
    };

    const handleStartdDate = (date: Date) =>{
        setStartDate(date);
        const convertDate2String1 = date.toISOString().split('T')[0]
        setFormData(prev => ({...prev, start_date: convertDate2String1}));
    };

    const handleCompletionDate = (date: Date) =>{
        setCompletionDate(date);
        const convertDate2String2 = date.toISOString().split('T')[0]
        setFormData(prev => ({...prev, completion_date: convertDate2String2 }));
    };

    const handleSearchUsers = (text: string) => {
        setSearchQueryUser(text);
        
        if(timerId2) {
            clearTimeout(timerId2);
        }
        const timer = window.setTimeout(() => {
            searchUsers(text);
        }, 300);

        setTimerId2(timer);
    };

    async function searchUsers(query: string) {
        if (query.trim().length < 2){
            setAssignedUsers([]);
            return;
        }
        setLoadingUsers(true);
        try{
            const { data, error } = await supabase
                .from("user_profiles")
                .select("*")
                .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
                .limit(20);

            if (error) throw error;
            setAssignedUsers(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setAssignedUsers([]);
        }
        finally{
            setLoadingUsers(false);
        }
    }

    const handleToggleUser = (user: User) => {
        setSelectedUsers(prev => {
            const isSelected = prev.some(c => c.id === user.id);
            
            if (isSelected) {
                return prev.filter(c => c.id !== user.id);
            } else {
                return [...prev, user];
            }
        });
    };

    const isUserSelected = (userId: string): boolean => {
        return selectedUsers.some(c => c.id === userId);
    };

    const handleRemoveUser = (userId: string) => {
        setSelectedUsers(prev => prev.filter(c => c.id !== userId));
    };


    async function getAssignedObjects(): Promise<boolean> {
        if(!formData.client_id) {
            setErrors(prev => ({
                ...prev,
                objects: "Najprv vyberte klienta pred priradením objektov"
            }))
            setAssignedObjects([]);
            return false;
        }

        if (errors.objects){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.objects;
                return newErrors;
            });
        }

        setLoadingObjects(true);
        try{
            const { data, error } = await supabase
            .from("objects")
            .select(`
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
            `)
            .eq("client_id", formData.client_id)
            .limit(30);

        if (error) throw error;
        
        if(selectedClient){
            const transformedData = (data || []).map(obj => {
                const chimneys: Chimney[] = obj.chimneys
                  ?.map((c: any) => ({
                  id: c.id,
                  type: c.chimney_types?.type || null,
                  labelling: c.chimney_type?.labelling || null,
                  appliance: c.appliance,
                  placement: c.placement,
                  note: c.note
              }))
              .filter(Boolean) || [];
              
              return ({
                  object: obj,
                  chimneys: chimneys,
                  client: selectedClient
              })
          });
          setAssignedObjects(transformedData);
        }
        return true;
        
    } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setAssignedObjects([]);
            setErrors(prev => ({
                ...prev,
                objects: "Chyba pri načítaní objektov"
            }));
            return false;
        }
        finally{
            setLoadingObjects(false);
        }
    }

    const handleToggleObject = (object: ObjectWithRelations) => {
        setSelectedObjects(prev => {
            // Check if already selected
            const isSelected = prev.some(c => c.object.id === object.object.id);
            
            if (isSelected) {
                // Remove it
                return prev.filter(c => c.object.id !== object.object.id);
            } else {
                // Add it
                return [...prev, object];
            }
        });
    };

    const isObjectSelected = (objectId: string): boolean => {
        return selectedObjects.some(c => c.object.id === objectId);
    };

    const handleRemoveObject = (objectId: string) => {
        setSelectedObjects(prev => prev.filter(c => c.object.id !== objectId));
    };

    return (
        <View>
            {/* header */}
            <View className="mb-32 relative">
                <TouchableOpacity
                    onPress={() => router.back()}
                    className="absolute top-4 left-6 w-10 h-10 items-center justify-center"
                >
                  <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
                </TouchableOpacity>
                <View className="absolute top-4 left-0 right-0 items-center justify-center">
                    <Text className="font-bold text-4xl text-dark-text_color">
                    {mode === "create" ? "Vytvoriť projekt" : "Upraviť projekt"}
                    </Text>
                </View>
            </View>
            
            {/* form */}
            <ScrollView >
            <View className="flex-1 justify-center px-10">

                {/* Client field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium text-dark-text_color">Klient</Text>
                    <View>
                        
                        {clientIsPreselected() &&
                            <Text
                                className="border-2 bg-gray-800 rounded-xl px-4 py-4 border-gray-600 text-white">
                                {selectedClient?.name}
                            </Text>
                        }
                        {!clientIsPreselected() && (
                            <TextInput
                            placeholder="Začnite písať meno klienta..."
                            placeholderTextColor="#ABABAB"
                            value={searchQuery}
                            onChangeText={handleSearchClient}
                            cursorColor="#FFFFFF"
                            className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                                ${focusedField === 'client' ? 'border-blue-500' : 'border-gray-700'}
                            `}
                            onFocus={() => setFocusedField('client')}
                            onBlur={() => setFocusedField(null)}
                            />
                        )}
                        
                        {loadingClients && (!clientIsPreselected()) && (
                            <View className="absolute right-4 top-4">
                                <Text className="text-gray-400">🔍</Text>
                            </View>
                        )}

                        {clientSuggestions && (!clientIsPreselected()) && clientSuggestions.length > 0 && (
                            <View className="border-2 border-gray-300 rounded-xl mt-1 bg-gray-300 max-h-60">
                                <ScrollView className="border-b rounded-xl border-gray-300">
                                    {clientSuggestions.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            onPress={() => handleSelectedClient(item)}
                                            className="p-4 border-b border-gray-100"
                                        >
                                            <Text className="text-base">{item.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}
                        {errors.client && (
                            <Text className='text-red-500 font-semibold ml-2 mt-1'>
                                {errors.client}
                            </Text>
                        )}
                    </View>
                </View> 
                
                {/* Type field*/}
                <BadgeSelector
                  options={TYPE_OPTIONS}
                  selectedValue={selectedType}
                  onSelect={handleSelectedType}
                  label="Typ projektu"
                  error={errors.type}
                />

                {/* State field*/}
                <ModalSelector
                  options={STATE_OPTIONS}
                  selectedValue={selectedState}
                  onSelect={handleSelectedState}
                  label="Stav projektu"
                  error={errors.state}
                  placeholder="Vyberte stav projektu"
                />
             
                {/* Scheduled project start field */}
                <View className="mb-3 ">
                    <Text className="mb-1 ml-1 font-medium text-dark-text_color">Plánovaný deň začatia</Text>
                    <ModernDatePicker
                        value={scheduledDate}
                        onChange={handleScheduledDate}
                        error={errors.scheduledDate}
                    />
                    {errors.dates && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.dates}
                        </Text>
                    )}
                </View>

                {/* Project start field */}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium text-dark-text_color">Deň začatia</Text>
                    <ModernDatePicker
                        value={startDate}
                        onChange={handleStartdDate}
                        error={errors.startDate}
                    />
                    {errors.dates && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.dates}
                        </Text>
                    )}
                </View>

                {/* Project completion field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium text-dark-text_color">Deň ukončenia</Text>
                    <ModernDatePicker
                        value={completionDate}
                        onChange={handleCompletionDate}
                        error={errors.completionDate}
                    />
                    {errors.completionDate && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.completionDate}
                        </Text>
                    )}
                </View>

                {/* note input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium text-dark-text_color">Poznámka</Text>
                    <TextInput
                      placeholder="Ďalšie informácie..."
                      placeholderTextColor="#ABABAB"
                      value={formData.note || ''}
                      cursorColor="#FFFFFF"
                      className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
                          ${focusedField === "note" ? 'border-blue-500' : 'border-gray-700'}
                      `}
                      onFocus={() => setFocusedField("note")}
                      onBlur={() => setFocusedField(null)}
                      onChangeText={(value) => handleChange("note", value)}
                      multiline
                      numberOfLines={3}
                    />
                </View>

                {/* Users Field */}
                <View className="mb-3">
                    <Text className="mb-2 ml-1 font-semibold text-dark-text_color">
                        Priradený používatelia
                    </Text>
                    
                    {/* Selected Chimneys Display */}
                    {selectedUsers.length > 0 && (
                        <View className="mb-3">
                            {selectedUsers.map((user) => (
                                <View 
                                    key={user.id}
                                    className="flex-row items-center justify-between bg-slate-500 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Text className="font-semibold text-white">
                                            {user.name}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveUser(user.id)}
                                        className="w-8 h-8 bg-red-100 rounded-full items-center justify-center ml-2"
                                    >
                                        <Text className="text-red-600 font-bold">✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}
                    {/* Assign User Button */}
                    <TouchableOpacity
                        onPress={() => setShowUserModal(true)}
                        className={`border-2 ${errors.users ? 'border-red-400' : 'border-gray-300'} bg-neutral-700 rounded-xl p-4`}
                    >
                        <Text className="text-white font-semibold text-center">
                            + Priradiť používateľa
                        </Text>
                    </TouchableOpacity>
                    {errors.users && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.users}
                        </Text>
                    )}
                </View>


                {/* Objects Field */}
                <View className="mb-3">
                    <Text className="mb-2 ml-1 font-semibold text-dark-text_color">
                        Priradené objekty
                    </Text>
                    
                    {/* Selected Chimneys Display */}
                    {selectedObjects.length > 0 && (
                        <View className="mb-3">
                            {selectedObjects.map((object) => (
                                <View 
                                    key={object.object.id}
                                    className="flex-row items-center justify-between bg-slate-500 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Text className="font-semibold text-white">
                                            {object.object.address}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveObject(object.object.id)}
                                        className="w-8 h-8 bg-red-100 rounded-full items-center justify-center ml-2"
                                    >
                                        <Text className="text-red-600 font-bold">✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Assign Object Button */}
                    <TouchableOpacity
                        onPress={async () => {
                            const success = await getAssignedObjects();
                            if (success) {
                                setShowObjectModal(true);
                            }
                        }}
                        className={`border-2 ${errors.objects ? 'border-red-400' : 'border-gray-300'} bg-neutral-700 rounded-xl p-4`}
                    >
                        <Text className="text-white font-semibold text-center">
                            + Priradiť objekt
                        </Text>
                    </TouchableOpacity>
                    {errors.objects && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.objects}
                        </Text>
                    )}
                </View>
            </View>

            
            {/* submit button */}
            <View className="flex-1 mt-16 border bg-blue-600 rounded-2xl items-center py-5 mx-24">
                <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleSubmit}
                    disabled={loading}>
                    <Text className="color-primary font-bold">
                        {mode === "create" ? (loading ? "Vytvaram..." : "Vytvoriť projekt") : (loading ? "Upravujem..." : "Upraviť projekt")}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>

        
            {/* User Selection Modal */}
            <Modal
                visible={showUserModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUserModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-dark-bg rounded-t-3xl h-3/4">
                        <View className="p-6 border-b border-gray-200">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-dark-text_color">Vyhľadajte používateľa</Text>
                                    <Text className="text-sm text-gray-500">
                                        {selectedUsers.length} vybraných
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowUserModal(false)}
                                    className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                                >
                                    <Text className="text-white">✓</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                placeholder="Vyhľadať pouzivatela..."
                                value={searchQueryUser}
                                onChangeText={handleSearchUsers}
                                className="bg-gray-100 rounded-xl p-4"
                                autoFocus
                            />
                        </View>

                        {loadingUsers ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Vyhľadávám...</Text>
                            </View>
                        ) : searchQueryUser.length < 2 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-6xl mb-4">🔍</Text>
                                <Text className="text-gray-500">Zadajte aspoň 2 znaky</Text>
                            </View>
                        ) : assignedUsers.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Žiadny používatelia neboli nájdený</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={assignedUsers}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const selected = isUserSelected(item.id);
                                    return (
                                        <TouchableOpacity
                                            onPress={() => handleToggleUser(item)}
                                            className={`px-6 py-4 border-b border-gray-100 ${selected ? 'bg-blue-50' : ''}`}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1">
                                                    <Text className="text-base font-semibold text-gray-900">
                                                        {item.name}
                                                    </Text>
                                                    {item.email && (
                                                        <Text className="text-sm text-gray-500 mt-1">
                                                            {item.email}
                                                        </Text>
                                                    )}
                                                </View>
                                                {selected && (
                                                    <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                                                        <Text className="text-white text-xs">✓</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* Object Selection Modal */}
            <Modal
                visible={showObjectModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowObjectModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-dark-bg rounded-t-3xl h-3/4">
                        <View className="p-6 border-b border-gray-600">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text className="text-xl font-bold text-dark-text_color">Vyhľadajte objekty</Text>
                                    <Text className="text-sm text-gray-500">
                                        {selectedObjects.length} vybraných
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowObjectModal(false)}
                                    className="w-8 h-8 bg-gray-700 rounded-full items-center justify-center active:bg-gray-600"
                                >
                                    <Text className="text-white">✓</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {loadingObjects ? 
                        (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Vyhľadávám...</Text>
                            </View>
                        ) : assignedObjects.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Žiadne objekty neboli nájdene</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={assignedObjects}
                                keyExtractor={(item) => item.object.id}
                                renderItem={({ item }) => {
                                    const selected = isObjectSelected(item.object.id);
                                    return (
                                        <TouchableOpacity
                                            onPress={() => handleToggleObject(item)}
                                            className={`px-6 py-4 border-b border-gray-100 ${selected ? 'bg-blue-50' : ''}`}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1">
                                                    
                                                    {item.object.address && (
                                                        <Text className="text-sm text-gray-500 mt-1">
                                                            {item.object.address}
                                                        </Text>
                                                    )}
                                                </View>
                                                {selected && (
                                                    <View className="w-6 h-6 bg-blue-600 rounded-full items-center justify-center">
                                                        <Text className="text-white text-xs">✓</Text>
                                                    </View>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    );
                                }}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    )
}