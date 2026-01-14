import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { Client } from "@/types/generics";
import { ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { NotificationToast } from "../notificationToast";
import { Body, BodyLarge, BodySmall, Heading3 } from "../typography";

interface ClientCardDetailsProps{
    client: Client;
    visible: boolean;
    onClose: () => void;
    onCloseWithUnlocking: () => void;
}

export default function ClientDetails({client, visible, onClose, onCloseWithUnlocking} : ClientCardDetailsProps) {
    const router = useRouter();
    const { user } = useAuth();
    const { deleteClient, lockClient }= useClientStore();

    const [objectsWithRelations, setObjectsWithRelations] = useState<ObjectWithRelations[]>([]);
    const [projectsWithRelations, setProjectsWithRelations] = useState<ProjectWithRelations[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [checkingLock, setCheckingLock] = useState(true);
    const [lockedByName, setLockedByName] = useState<string | null>(null);

    const lockHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // const isMountedRef = useRef(true);

    // fetch relations when modal opens or clear data when closes
    useEffect(() => {
        if (visible){
            fetchRelations(client);
        }
        else{
            setObjectsWithRelations([]);
            setProjectsWithRelations([]);
            setError(null);
        }
    }, [visible, client.id]);

    // acquire lock when modal opens
    useEffect(() => {
        if(!visible || !client || !user) return;
        let active = true;

        setCheckingLock(true);

        (async () => {
            const result = await lockClient(client.id, user.id ,user.user_metadata.name);
            if (!active) return;

            if(result.success){
                setCanEdit(true);  
                setLockedByName(null);
                console.log("Client lock aquired");
            }
            else{
                setCanEdit(false);
                setLockedByName(result.lockedByName);
                console.log("Client lock not aquired");
            }

            setCheckingLock(false);
        })();
        return () => {
            active = false;
          };

    }, [visible, client?.id, user?.id]);

    // lock heartbeat (adding 5 mins every 2 minutes to expires_at value) 
    useEffect(() => {
        if(!canEdit || !visible || !user) return;
        
        const heartbeat = setInterval( async() => {
            try{
                await supabase
                    .from('clients')
                    .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
                    .eq('id', client.id)
                    .eq('locked_by', user.id);
            }
            catch (error: any){
                console.error("Failed to send lock heartbeat:", error);
            }
          }, 120_000);

          lockHeartbeatRef.current = heartbeat;
          return () => {
            if (lockHeartbeatRef.current) {
              clearInterval(lockHeartbeatRef.current);
              lockHeartbeatRef.current = null;
            }
          };
                
    }, [visible, canEdit, user?.id, client.id]);

    async function fetchRelations(client: Client) {
        setLoading(true);
        setError(null);
        
        try {
          // Fetch objects in parallel with projects
          const [objectsResult, projectsResult] = await Promise.all([
            supabase
              .from("objects")
              .select(`
                *,
                chimneys (
                  id,
                  object_id,
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
              `)
              .eq("client_id", client.id),
            
            supabase
              .from("projects")
              .select(`
                *,
                project_assignments (
                  user_profiles (id, name, email)
                ),
                project_objects (
                  objects (
                    id,
                    client_id,
                    address,
                    city, 
                    streetNumber,
                    country,
                    chimneys (
                      id,
                      chimney_types (id, type, labelling),
                      placement,
                      appliance,
                      note
                    )
                  )
                )
              `)
              .eq("client_id", client.id)
              .order('created_at', { ascending: false })
          ]);
    
          if (objectsResult.error) throw objectsResult.error;
          if (projectsResult.error) throw projectsResult.error;
    
          // Process objects
          if (objectsResult.data) {
            const processedObjects: ObjectWithRelations[] = objectsResult.data.map((objectItem: any) => ({
              object: objectItem,
              client: client,
              chimneys: objectItem.chimneys || [],
            }));
            setObjectsWithRelations(processedObjects);
          }
    
          // Process projects
          if (projectsResult.data) {
            const processedProjects: ProjectWithRelations[] = projectsResult.data.map((projectItem: any) => {
              const users = projectItem.project_assignments
                ?.map((pa: any) => pa.user_profiles)
                .filter(Boolean) || [];
    
              const objects = projectItem.project_objects
                ?.map((po: any) => {
                  if (!po.objects) return null;
    
                  const chimneys = po.objects.chimneys
                    ?.map((c: any) => ({
                      id: c.id,
                      type: c.chimney_types?.type || null,
                      labelling: c.chimney_types?.labelling || null,
                      appliance: c.appliance,
                      placement: c.placement,
                      note: c.note
                    }))
                    .filter(Boolean) || [];
    
                  return {
                    object: po.objects,
                    chimneys: chimneys
                  };
                })
                .filter(Boolean) || [];
    
              return {
                project: projectItem,
                client: client,
                users: users,
                objects: objects,
              };
            });
    
            setProjectsWithRelations(processedProjects);
          }
        } 
        catch (err: any) {
          console.error('Error fetching relations:', err);
          setError(err.message || 'Nepodarilo sa načítať dáta');
        } 
        finally {
          setLoading(false);
        }
    }

    const handleNavigateAndRefresh = useCallback(async (pathname: any, params: any) => {
        onClose(); 
        router.push({ pathname, params });
    },[router, onClose]);

    // handler for editing client
    const handleEditClient = useCallback(() => {
        if(!canEdit) return;

        onClose();
        router.push({
        pathname: "/addClientScreen",
        params: { 
            client: JSON.stringify(client),
            mode: "edit" 
            }
        });
    }, [router, onClose, canEdit, client]);

    // handler for deleting client
    const handleDeleteClient = useCallback(() => {
        if(!canEdit) return;

        try{
            deleteClient(client.id);
            onClose();
          }
          catch (error){
            console.error("Delete failed:", error);
          }
    }, [deleteClient, onClose, canEdit, client.id]);

    if (error) {
        return (
            <View className="flex-1 items-center justify-center">
                <Body className="text-red-500">{error}</Body>
            </View>
        );
    }
    
    return (
        <Modal
          visible={visible}
          transparent={true}
          animationType="slide"
          onRequestClose={onClose}
        >
          <View className="flex-1 bg-black/50 justify-center items-center">
            <View className="w-10/12 h-fit bg-dark-bg border-2 border-gray-300 rounded-2xl overflow-hidden">
              
                {/* header */}
                <View className="px-4 py-6 border-b border-gray-400">
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Heading3 selectable className="text-xl font-bold text-dark-text_color mb-1">{client.name}</Heading3>   
                      <BodySmall className="text-sm text-dark-text_color">{client.type}</BodySmall>
                    </View>
                    {/* Close details modal */}
                    <TouchableOpacity
                        onPress={onCloseWithUnlocking}
                        className="items-center justify-center"
                    >
                        <EvilIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Client Info */}
                <ScrollView className="max-h-screen-safe-offset-12 p-4">

                    <View className="flex-1">
                        {!canEdit && !checkingLock && <Body style={{color: "#F59E0B"}}>Tohto klienta upravuje používateľ {lockedByName}</Body>}
                        <NotificationToast
                          screen="clientDetails"
                        />
                        <View className="mb-3">
                            {client.unformatted_email && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="email" size={20} color={"white"}/>
                                    <Body selectable className="text-dark-text_color ml-2">{client.unformatted_email}</Body>
                                </View>
                            )}

                            {client.phone && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="phone" size={20} color={"white"}/>
                                    <BodyLarge selectable className="text-dark-text_color ml-2 text-lg">{client.phone}</BodyLarge>
                                </View>
                            )}

                            {client.address && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="location-pin" size={20} color={"white"}/>
                                    <Body selectable className="text-dark-text_color ml-2">{client.address}</Body>
                                </View>
                            )}

                            {client.note && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="notes" size={20} color={"white"}/>
                                    <Body selectable className="text-dark-text_color w-80 ml-2">{client.note}</Body>
                                </View>
                            )}
                        </View>
                        
                        {/* Objects Section */}
                        <View className="mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                            <Body className="text-gray-400 mt-2">OBJEKTY ({objectsWithRelations.length})</Body>
                        
                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg "
                                onPress={() => handleNavigateAndRefresh("/addObjectScreen", {
                                    mode: "create", 
                                    preselectedClientID: client.id
                                })}
                                >
                                <Body className="text-white text-center font-semibold">+</Body>
                                <Body className="text-white text-center font-semibold">Pridať</Body>
                            </TouchableOpacity>
                            </View>
                            
                            {objectsWithRelations.length === 0 ? (
                                <Body className="text-gray-500">Žiadne objekty</Body>
                            ) : (
                                objectsWithRelations.map((item) => (
                                    <TouchableOpacity 
                                        key={item.object.id} 
                                        className="bg-dark-details-o_p_bg p-3 rounded-lg mb-2"
                                        onPress={() => handleNavigateAndRefresh("/addObjectScreen", {
                                            object: JSON.stringify(item),
                                            mode: "edit"
                                        })}
                                    >
                                        {!item.object.streetNumber 
                                        ? (
                                            <Body className="font-semibold text-dark-text_color mb-1">
                                                {item.object.address}
                                            </Body> 
                                        ):(
                                            <Body className="font-semibold text-dark-text_color mb-1">
                                                {item.object.streetNumber}, {item.object.city}
                                            </Body> 
                                        )}
                                        <BodySmall className="text-sm text-dark-text_color">
                                            Komíny: {item.chimneys.length}
                                        </BodySmall>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                        
                        {/* Projects Section */}
                        <View className="mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <Body className="text-gray-400 mt-2">PROJEKTY ({projectsWithRelations.length})</Body>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg"
                                    onPress={() => handleNavigateAndRefresh("/addProjectScreen", {
                                        mode: "create", 
                                        preselectedClientID: client.id
                                    })}
                                >
                                    <Body className="text-white text-center font-semibold">+</Body>
                                    <Body className="text-white text-center font-semibold">Pridať</Body>
                                </TouchableOpacity>
                            </View>
                            {projectsWithRelations.length === 0 ? (
                                <Body className="text-gray-500">Žiadne projekty</Body>
                            ) : (
                                projectsWithRelations.map((item) => (
                                    <TouchableOpacity 
                                        key={item.project.id} 
                                        className="bg-dark-details-o_p_bg p-3 rounded-lg mb-2"
                                        onPress={() => handleNavigateAndRefresh("/addProjectScreen", {
                                            project: JSON.stringify(item),
                                            mode: "edit", 
                                        })}
                                    >
                                        <Body className="font-semibold text-dark-text_color mb-1">{item.project.type}</Body>
                                        <BodySmall className="text-sm text-dark-text_color">{item.project.state}</BodySmall>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* FOOTER */}  
                <View className="flex-row justify-between px-4 py-6 border-t border-gray-400">
                    {/* Delete selected client */}
                    <TouchableOpacity
                      onPress={handleDeleteClient}
                      activeOpacity={0.8}
                      className="flex-row gap-1 bg-red-700 rounded-full items-center justify-center pl-3 py-2 pr-4"
                      disabled={!canEdit}
                    >
                      <EvilIcons name="trash" size={24} color="white" />
                      <Body className='text-white'>Odstrániť</Body>
                    </TouchableOpacity>

                    {/* Edit selected client */}     
                    <TouchableOpacity
                        onPress={handleEditClient}
                        activeOpacity={0.8}
                        className="flex-row gap-1 bg-green-700 rounded-full items-center justify-center px-4 py-2"
                        disabled={!canEdit}
                    >
                        <Feather name="edit-2" size={16} color="white" />
                        <Body className='text-white'>Upraviť</Body>
                      </TouchableOpacity>   
                    </View>
                </View>
            </View> 
      </Modal>
    );
}