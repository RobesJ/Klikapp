import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import ModernDatePicker from "../modernDatePicker";

interface Project {
    id?: string;
    client_id?: string;
    type: string | null;
    state: string | null;
    scheduled_date: string | null;
    start_date: string | null;
    completion_date: string | null;
    notes: string | null;
}

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    type: string | null;
    notes: string | null;
}

interface User {
    id: string;
    name: string;
    email: string;
}

interface Object {
    id: string;
    client_id?: string,
    address: string | null;
    placement: string | null;
    appliance: string | null;
    note: string | null;
  }

interface ProjectWithRelations {
    project: Project;
    client: Client;
    users: User[];
    objects: Object[];
}

interface ProjectFormProps{
    mode: "create" | "edit";
    initialData?: ProjectWithRelations;
    onSuccess?: (project: Project) => void;
    preselectedClient?: Client;
}

export default function ProjectForm({ mode, initialData, onSuccess, preselectedClient} : ProjectFormProps) {

    const [formData, setFormData] = useState<Project>({
        client_id: initialData?.client.id || '',
        type: initialData?.project.type || '',
        state: initialData?.project.state || '',
        scheduled_date: initialData?.project.scheduled_date || '',
        start_date: initialData?.project.start_date || '',
        completion_date: initialData?.project.completion_date || '',
        notes: initialData?.project.notes || '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [clients, setClients] = useState<Client[]>([]);
    const [loadingClients, setLoadingClients] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showClientModal, setShowClientModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [timerId, setTimerId] = useState<number>();

    const [selectedType, setSelectedType] = useState("");
    const [selectedState, setSelectedState] = useState("");
    const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [completionDate, setCompletionDate] = useState<Date | null>(null);

    const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [searchQueryUser, setSearchQueryUser] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [timerId2, setTimerId2] = useState<number>();
    const [showUserModal, setShowUserModal] = useState(false);

    const [assignedObjects, setAssignedObjects] = useState<Object[]>([]);
    const [loadingObjects, setLoadingObjects] = useState(false);
    const [searchQueryObject, setSearchQueryObject] = useState('');
    const [selectedObjects, setSelectedObjects] = useState<Object[]>([]);
    const [timerId3, setTimerId3] = useState<number>();
    const [showObjectModal, setShowObjectModal] = useState(false);

    useEffect(() => {
        if (initialData){
            setFormData({
                client_id: initialData?.client.id || '',
                type: initialData?.project.type || '',
                state: initialData?.project.state || '',
                scheduled_date: initialData?.project.scheduled_date || '',
                start_date: initialData?.project.start_date || '',
                completion_date: initialData?.project.completion_date || '',
                notes: initialData?.project.notes || '',
            });

            if (initialData.client){
                setSelectedClient(initialData.client);
            }
            if (initialData.project.type){
                setSelectedType(initialData.project.type);
            }

            if (initialData.project.state){
                setSelectedState(initialData.project.state);
            }
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
                setSelectedUsers(initialData.users)
            }
            if (initialData.objects && initialData.objects.length > 0){
                setAssignedObjects(initialData.objects);
                setSelectedObjects(initialData.objects)
            }
        }
        else if (preselectedClient){
            setSelectedClient(preselectedClient);
            setFormData(prev => ({...prev, client_id: preselectedClient.id}));
        }
    }, [initialData, preselectedClient]);
    
    const handleChange = (field: keyof Project, value: string) => {
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
            setClients([]);
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
            setClients(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setClients([]);
        }
        finally{
            setLoadingClients(false);
        }
    }

    const handleSelectedClient = (client: Client) => {
        setSelectedClient(client);
        setSearchQuery(client.name);
        setShowClientModal(false);
        setFormData(prev => ({ ...prev, client_id: client.id}));

        if (errors.client_id){
            setErrors(prev => {
                const newErrors = {...prev};
                delete newErrors.client_id;
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

        if (!formData.client_id){
            newErrors.client_id = "Klient je povinny udaj!";
        }
        if (!formData.scheduled_date || !formData.start_date ){
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
            let projectID : string; 
            if (mode === "create"){
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .insert([formData])
                .select()
                .single();
                
                if (projectError) throw projectError;
                projectID = projectData.id;

                const usersProjectRelations = selectedUsers.map(user => ({
                    project_id: projectID,
                    user_id: user.id,
                }));

                const {error: usersError } = await supabase
                    .from("project_assignments")
                    .insert(usersProjectRelations);

                if (usersError) throw usersError;

                const objectProjectRelations = selectedObjects.map(object => ({
                    project_id: projectID,
                    object_id: object.id,
                }));

                const {error: objectError } = await supabase
                    .from("project_objects")
                    .insert(objectProjectRelations);

                if (objectError) throw objectError;
                Alert.alert('Uspech', 'Projekt bol vytvoreny!');
                onSuccess?.(projectData);
            }
            else { 
                const {data: projectData, error: projectError} = await supabase
                .from('projects')
                .update(formData)
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

                const usersProjectRelations = selectedUsers.map(user => ({
                    project_id: projectID,
                    user_id: user.id,
                }));

                const {error: usersError } = await supabase
                    .from("project_assignments")
                    .insert(usersProjectRelations);

                if (usersError) throw usersError;

                const objectsProjectRelations = selectedObjects.map(object => ({
                    project_id: projectID,
                    object_id: object.id,
                }));

                const {error: objectsError } = await supabase
                    .from("project_objects")
                    .insert(objectsProjectRelations);

                if (objectsError) throw objectsError;

                Alert.alert('Úspech', 'Projekt bol upravený!');
                onSuccess?.(projectData);
            }
        }
        catch (error: any){
            console.error("Chyba pri ukladani projektu: ", error);
            Alert.alert('Chyba', error.message || "Nastal problem pri ukladani projektu");
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

    const handleSearchObject = (text: string) => {
        setSearchQueryObject(text);
        
        if(timerId3) {
            clearTimeout(timerId3);
        }
        const timer = window.setTimeout(() => {
            searchObject(text);
        }, 300);

        setTimerId3(timer);
    };

    async function searchObject(query: string) {
        if (query.trim().length < 2){
            setAssignedObjects([]);
            return;
        }

        if(!formData.client_id) {
            Alert.alert("Upozernenie", "Najprv vyberte klienta");
            setAssignedObjects([]);
            return;
        }

        setLoadingObjects(true);
        try{
            const { data, error } = await supabase
                .from("objects")
                .select("*")
                .eq("client_id", formData.client_id)
                .or(`address.ilike.%${query}%,appliance.ilike.%${query}%`)
                .limit(20);

            if (error) throw error;
            setAssignedObjects(data || []);
        } 
        catch(error: any){
            console.error("Chyba: ", error.message);
            setAssignedObjects([]);
        }
        finally{
            setLoadingObjects(false);
        }
    }

    const handleToggleObject = (object: Object) => {
        setSelectedObjects(prev => {
            // Check if already selected
            const isSelected = prev.some(c => c.id === object.id);
            
            if (isSelected) {
                // Remove it
                return prev.filter(c => c.id !== object.id);
            } else {
                // Add it
                return [...prev, object];
            }
        });
    };

    const isObjectSelected = (objectId: string): boolean => {
        return selectedObjects.some(c => c.id === objectId);
    };

    const handleRemoveObject = (objectId: string) => {
        setSelectedObjects(prev => prev.filter(c => c.id !== objectId));
    };

    return (
        <KeyboardAvoidingView>
        <ScrollView>
            {/* header */}
            <View className="flex-1 items-center p-20">
                <Text className="font-bold text-4xl">
                    {mode === "create" ? "Vytvoriť projekt" : "Upraviť projekt"}
                </Text>
            </View>
            {/* form */}
            <View className="flex-1 justify-center px-10">
                {/* Client field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Klient</Text>
                    <View className="border-2 border-gray-300 rounded-xl p-4 bg-white">
                        <TouchableOpacity
                            onPress={() => setShowClientModal(true)}
                            activeOpacity={0.8}
                            disabled={clientIsPreselected()}
                            >
                            <Text className={`${selectedClient ? "color-slate-800": "color-slate-500"}`}>
                                {selectedClient ? selectedClient.name : "Vyberte klienta..."}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {errors.client_id && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.client_id}
                        </Text>
                    )}
                </View>

                {/* State field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Stav projektu</Text>
                    <View className="flex-row">
                    <TouchableOpacity
                        className={`border-2 ${selectedState === "Aktívny" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4 w-24 items-center mr-2`}
                        onPress={()=> handleSelectedState("Aktívny")}
                    >
                        <Text>Aktívny</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`border-2 ${selectedState === "Ukončený" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4 w-24 items-center mr-2`}
                        onPress={()=> handleSelectedState("Ukončený")}
                    >
                        <Text>Ukončený</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className={`border-2 ${selectedState === "Prebieha" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4 w-24 items-center`}
                        onPress={()=> handleSelectedState("Prebieha")}
                    >
                        <Text>Prebieha</Text>
                    </TouchableOpacity>
                    </View>
                    {errors.state && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.state}
                        </Text>
                    )}
                </View>

                {/* Type field*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Typ projektu</Text>
                    <View className="flex-row">
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "Čistenie" ? "border-gray-900 bg-yellow-400" : "border-gray-300 bg-white"} rounded-xl p-4 w-1/4 items-center`}
                            onPress={() => handleSelectedType("Čistenie")}
                        >
                            <Text
                                className={`${selectedType === "Čistenie" ? "font-semibold" : "font-normal"}`}
                            >
                                Čistenie
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "Revízia" ? "border-gray-900 bg-amber-500" : "border-gray-300 bg-white"} rounded-xl p-4 w-1/4 items-center`}
                            onPress={() => handleSelectedType("Revízia")}
                        >
                            <Text
                                className={`${selectedType === "Revízia" ? "font-semibold" : "font-normal"}`}
                            >
                                Revízia
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`border-2 ${selectedType === "Obhliadka" ? "border-gray-900 bg-green-500" : "border-gray-300 bg-white"} rounded-xl p-4 w-1/4 items-center`}
                            onPress={() => handleSelectedType("Obhliadka")}
                        >
                            <Text
                                className={`${selectedType === "Obhliadka" ? "font-semibold" : "font-normal"}`}
                            >
                                Obhliadka
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            className={`border-2 ${selectedType === "Montáž" ? "border-gray-900 bg-blue-400" : "border-gray-300 bg-white"} rounded-xl p-4 w-1/4 items-center`}
                            onPress={() => handleSelectedType("Montáž")}
                        >
                            <Text
                                className={`${selectedType === "Montáž" ? "font-semibold" : "font-normal"}`}
                            >
                                    Montáž
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {errors.type && (
                        <Text className='text-red-500 font-semibold ml-2 mt-1'>
                            {errors.type}
                        </Text>
                    )}
                </View>

                {/* Scheduled project start field */}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Plánovaný deň začatia projektu</Text>
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
                    <Text className="mb-1 ml-1 font-medium">Deň začatia projektu</Text>
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
                    <Text className="mb-1 ml-1 font-medium">Deň ukončenia projektu</Text>
                    <ModernDatePicker
                        value={completionDate}
                        onChange={handleCompletionDate}
                        error={errors.completionDate}
                    />
                </View>

                {/* note input*/}
                <View className="mb-3">
                    <Text className="mb-1 ml-1 font-medium">Poznámka</Text>
                    <TextInput
                    placeholder="Poznamka"
                    value={formData.notes || ''}
                    className="border-2 border-gray-300 rounded-xl p-4 bg-white"
                    onChangeText={(value) => handleChange("notes", value)}
                    ></TextInput>
                </View>

                {/* Users Field */}
                <View className="mb-3">
                    <Text className="mb-2 ml-1 font-semibold text-gray-700">
                        Priradený používatelia <Text className="text-red-500">*</Text>
                    </Text>
                    
                    {/* Selected Chimneys Display */}
                    {selectedUsers.length > 0 && (
                        <View className="mb-3">
                            {selectedUsers.map((user) => (
                                <View 
                                    key={user.id}
                                    className="flex-row items-center justify-between bg-blue-50 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Text className="font-semibold text-blue-900">
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
                        className={`border-2 ${errors.users ? 'border-red-400' : 'border-gray-300'} bg-white rounded-xl p-4`}
                    >
                        <Text className="text-blue-600 font-semibold text-center">
                            + Priradiť používateľa
                        </Text>
                    </TouchableOpacity>
                    {errors.users && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                            {errors.users}
                        </Text>
                    )}
                </View>


                {/* Objects Field */}
                <View className="mb-3">
                    <Text className="mb-2 ml-1 font-semibold text-gray-700">
                        Priradene objekty <Text className="text-red-500">*</Text>
                    </Text>
                    
                    {/* Selected Chimneys Display */}
                    {selectedObjects.length > 0 && (
                        <View className="mb-3">
                            {selectedObjects.map((object) => (
                                <View 
                                    key={object.id}
                                    className="flex-row items-center justify-between bg-blue-50 rounded-xl p-3 mb-2"
                                >
                                    <View className="flex-1">
                                        <Text className="font-semibold text-blue-900">
                                            {object.address}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleRemoveObject(object.id)}
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
                        onPress={() => setShowObjectModal(true)}
                        className={`border-2 ${errors.objects ? 'border-red-400' : 'border-gray-300'} bg-white rounded-xl p-4`}
                    >
                        <Text className="text-blue-600 font-semibold text-center">
                            + Priradiť objekt
                        </Text>
                    </TouchableOpacity>
                    {errors.objects && (
                        <Text className="text-red-500 text-xs mt-1 ml-1">
                            {errors.objects}
                        </Text>
                    )}
                </View>
            </View>

            
            {/* submit button */}
            <View className="flex-1 mt-16 border bg-slate-600 rounded-2xl items-center py-5 mx-24">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={loading}>
                    <Text className="color-primary font-bold">
                        {mode === "create" ? "Vytvoriť projekt" : "Upraviť projekt"}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>

        {/* client modal window, searchbar for clients */}
        <Modal
                visible={showClientModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowClientModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl h-3/4">
                        {/* Header */}
                        <View className="p-6 border-b border-gray-200">
                            <View className="flex-row items-center justify-between mb-4">
                                <Text className="text-xl font-bold">Vyberte klienta</Text>
                                <TouchableOpacity
                                    onPress={() => setShowClientModal(false)}
                                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                                >
                                    <Text className="text-gray-600">✕</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Search Input */}
                            <TextInput
                                placeholder="Hľadať klienta..."
                                value={searchQuery}
                                onChangeText={handleSearchClient}
                                className="bg-gray-100 rounded-xl p-4"
                                autoFocus
                            />
                        </View>

                        {/* Results List */}
                        {loadingClients ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Vyhľadávám...</Text>
                            </View>
                        ) : searchQuery.length < 2 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-6xl mb-4">🔍</Text>
                                <Text className="text-gray-500">
                                    Zadajte aspoň 2 znaky
                                </Text>
                            </View>
                        ) : clients.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">
                                    Žiadni klienti nenájdení
                                </Text>
                            </View>
                        ) : (
                            <FlatList
                                data={clients}
                                keyExtractor={(item) => item.id ?? Math.random().toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => handleSelectedClient(item)}
                                        className="px-6 py-4 border-b border-gray-100"
                                    >
                                        <Text className="text-base font-semibold text-gray-900">
                                            {item.name}
                                        </Text>
                                        {item.phone && (
                                            <Text className="text-sm text-gray-500 mt-1">
                                                📱 {item.phone}
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* User Selection Modal */}
            <Modal
                visible={showUserModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowUserModal(false)}
            >
                <View className="flex-1 bg-black/50 justify-end">
                    <View className="bg-white rounded-t-3xl h-3/4">
                        <View className="p-6 border-b border-gray-200">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text className="text-xl font-bold">Vyhľadajte používateľa</Text>
                                    <Text className="text-sm text-gray-500">
                                        {selectedUsers.length} vybraných
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowUserModal(false)}
                                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                                >
                                    <Text className="text-gray-600">✓</Text>
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
                    <View className="bg-white rounded-t-3xl h-3/4">
                        <View className="p-6 border-b border-gray-200">
                            <View className="flex-row items-center justify-between mb-4">
                                <View className="flex-1">
                                    <Text className="text-xl font-bold">Vyhľadajte objekty</Text>
                                    <Text className="text-sm text-gray-500">
                                        {selectedObjects.length} vybraných
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setShowObjectModal(false)}
                                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                                >
                                    <Text className="text-gray-600">✓</Text>
                                </TouchableOpacity>
                            </View>
                            <TextInput
                                placeholder="Vyhľadať objekt..."
                                value={searchQueryObject}
                                onChangeText={handleSearchObject}
                                className="bg-gray-100 rounded-xl p-4"
                                autoFocus
                            />
                        </View>

                        {loadingObjects ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Vyhľadávám...</Text>
                            </View>
                        ) : searchQueryObject.length < 2 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-6xl mb-4">🔍</Text>
                                <Text className="text-gray-500">Zadajte aspoň 2 znaky</Text>
                            </View>
                        ) : assignedObjects.length === 0 ? (
                            <View className="flex-1 items-center justify-center">
                                <Text className="text-gray-500">Žiadne objekty neboli nájdene</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={assignedObjects}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => {
                                    const selected = isObjectSelected(item.id);
                                    return (
                                        <TouchableOpacity
                                            onPress={() => handleToggleObject(item)}
                                            className={`px-6 py-4 border-b border-gray-100 ${selected ? 'bg-blue-50' : ''}`}
                                        >
                                            <View className="flex-row items-center justify-between">
                                                <View className="flex-1">
                                                    <Text className="text-base font-semibold text-gray-900">
                                                        {item.appliance}
                                                    </Text>
                                                    {item.address && (
                                                        <Text className="text-sm text-gray-500 mt-1">
                                                            {item.address}
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
        </KeyboardAvoidingView>
    )
}