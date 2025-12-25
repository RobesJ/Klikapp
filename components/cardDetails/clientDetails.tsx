import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { Client, User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { NotificationToast } from "../notificationToast";

interface ClientCardDetailsProps{
    client: Client;
    visible: boolean;
    onClose: () => void;
    onCloseWithUnlocking: () => void;
}

export default function ClientDetails({client, visible, onClose, onCloseWithUnlocking} : ClientCardDetailsProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [objectsWithRelations, setObjectsWithRelations] = useState<ObjectWithRelations[]>([]);
    const [projectsWithRelations, setProjectsWithRelations] = useState<ProjectWithRelations[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [lockedBy, setLockedBy] = useState<string | null>(null);
    const { deleteClient, lockClient }= useClientStore();

    useEffect(() => {
        fetchRelations(client);
    }, [client.id]);


    async function fetchRelations(client: Client) {
        try{
            const { data: objectsData, error: objectError} = await supabase
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
                .eq("client_id", client.id);
                
            if (objectError) throw objectError;
            if(objectsData){
                const objectWithRelations: ObjectWithRelations[] = objectsData.map((objectItem: any) => {
                    const chimneys: Chimney[] = objectItem.chimneys || [];
                
                    return {
                      object: objectItem,
                      client: client,
                      chimneys: chimneys,
                    };
                });

                setObjectsWithRelations(objectWithRelations);
            }

            const { data: projectsData, error: projectError } = await supabase
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
                .order('created_at', { ascending: false });
                
            if (projectError) throw projectError;
                
            const projectWithRelations: ProjectWithRelations[] = projectsData.map((projectItem: any) => {
                const users: User[] = projectItem.project_assignments
                    ?.map((pa: any) => pa.user_profiles)
                    .filter(Boolean) || [];
            
                const objects = projectItem.project_objects
                    ?.map((po: any) => {
                        if (!po.objects) return null;
                    
                        const chimneys: Chimney[] = po.objects.chimneys
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
        
            setProjectsWithRelations(projectWithRelations);
        } catch (err: any) {
            console.error('Error fetching relations:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if(!visible || !client || !user) return;
        let active = true;

        (async () => {
            const result = await lockClient(client.id, user.id ,user.user_metadata.name);
            if (!active) return;

            if(result.success){
                setCanEdit(true);  
                console.log("Client lock aquired");
            }
            else{
                setCanEdit(false);
                setLockedBy(result.lockedByName);
                console.log("Client lock not aquired");
            }
        })();

    }, [visible, client?.id, user?.id]);

    // locks heartbeat (adding 5 mins every 2 minutes to expires_at value) 
    useEffect(() => {
        if(!canEdit || !visible || !user) return;
        
        const interval = setInterval(() => {
            supabase
              .from('clients')
              .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
              .eq('id', client.id)
              .eq('locked_by', user.id);
          }, 120_000);

        return () => clearInterval(interval);
                
    }, [visible, canEdit, user?.id]);

    if (loading) {
        return (
            <View className="flex-1 items-center justify-center">
                <ActivityIndicator size="large" color="#3b82f6" />
            </View>
        );
    }

    if (error) {
        return (
            <View className="flex-1 items-center justify-center">
                <Text className="text-red-500">{error}</Text>
            </View>
        );
    }

    const handleNavigateAndRefresh = async (pathname: any, params: any) => {
        onClose(); // Close modal first
        router.push({ pathname, params });
        // Refetch clients to update counts
        //setTimeout(() => fetchClients(100), 500); // Small delay to ensure DB is updated
    };

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
                      <Text className="text-xl font-bold text-dark-text_color">{client.name}</Text>   
                      <Text className="text-sm text-dark-text_color">{client.type}</Text>
                    </View>
                    {/* Close details modal */}
                    <TouchableOpacity
                        onPress={onCloseWithUnlocking}
                        className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                    >
                        <EvilIcons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Client Info */}
                <ScrollView className="max-h-screen-safe-offset-12 p-4">

                    <ScrollView className="flex-1">
                        {!canEdit && (
                            <NotificationToast/>
                        )}
                        <View className="mb-3">
                            {client.email && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="email" size={20} color={"white"}/>
                                    <Text className="text-dark-text_color ml-2">{client.email}</Text>
                                </View>
                            )}

                            {client.phone && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="phone" size={20} color={"white"}/>
                                    <Text className="text-dark-text_color ml-2 text-lg">{client.phone}</Text>
                                </View>
                            )}

                            {client.address && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="location-pin" size={20} color={"white"}/>
                                    <Text className="text-dark-text_color ml-2">{client.address}</Text>
                                </View>
                            )}

                            {client.note && (
                                <View className="flex-row items-center mb-2">
                                    <MaterialIcons name="notes" size={20} color={"white"}/>
                                    <Text className="text-dark-text_color w-80 ml-2">{client.note}</Text>
                                </View>
                            )}
                        </View>
                        
                        {/* Objects Section */}
                        <View className="mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-gray-400 mt-2">OBJEKTY ({objectsWithRelations.length})</Text>
                        
                            <TouchableOpacity
                                activeOpacity={0.8}
                                className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg "
                                onPress={() => handleNavigateAndRefresh("/addObjectScreen", {
                                    mode: "create", 
                                    preselectedClient: JSON.stringify(client)
                                })}
                                >
                                <Text className="text-white text-center font-semibold">+</Text>
                                <Text className="text-white text-center font-semibold">Pridať</Text>
                            </TouchableOpacity>
                            </View>
                            
                            {objectsWithRelations.length === 0 ? (
                                <Text className="text-gray-500">Žiadne objekty</Text>
                            ) : (
                                objectsWithRelations.map((item) => (
                                    <TouchableOpacity 
                                        key={item.object.id} 
                                        className="bg-dark-details-o_p_bg p-3 rounded-lg mb-2"
                                        onPress={() => handleNavigateAndRefresh("/addObjectScreen", {
                                            object: JSON.stringify(item),
                                            mode: "edit", 
                                            preselectedClient: JSON.stringify(client)
                                        })}
                                    >
                                        {!item.object.streetNumber 
                                        ? (
                                            <Text className="font-semibold text-dark-text_color">
                                                {item.object.address}
                                            </Text> 
                                        ):(
                                            <Text className="font-semibold text-dark-text_color">
                                                {item.object.streetNumber}, {item.object.city}
                                            </Text> 
                                        )}
                                        <Text className="text-sm text-dark-text_color">
                                            Komíny: {item.chimneys.length}
                                        </Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                        
                        {/* Projects Section */}
                        <View className="mb-3">
                            <View className="flex-row items-center justify-between mb-2">
                                <Text className="text-gray-400 mt-2">PROJEKTY ({projectsWithRelations.length})</Text>

                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg"
                                    onPress={() => handleNavigateAndRefresh("/addProjectScreen", {
                                        mode: "create", 
                                        preselectedClient: JSON.stringify(client)
                                    })}
                                >
                                    <Text className="text-white text-center font-semibold">+</Text>
                                    <Text className="text-white text-center font-semibold">Pridať</Text>
                                </TouchableOpacity>
                            </View>
                            {projectsWithRelations.length === 0 ? (
                                <Text className="text-gray-500">Žiadne projekty</Text>
                            ) : (
                                projectsWithRelations.map((item) => (
                                    <TouchableOpacity 
                                        key={item.project.id} 
                                        className="bg-dark-details-o_p_bg p-3 rounded-lg mb-2"
                                        onPress={() => handleNavigateAndRefresh("/addProjectScreen", {
                                            project: JSON.stringify(item),
                                            mode: "edit", 
                                            preselectedClient: JSON.stringify(client)
                                        })}
                                    >
                                        <Text className="font-semibold text-dark-text_color">{item.project.type}</Text>
                                        <Text className="text-sm text-dark-text_color">{item.project.state}</Text>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </ScrollView>
                </ScrollView>

                {/* FOOTER */}  
                <View className="flex-row justify-between px-4 py-6 border-t border-gray-400">
                    {/* Delete selected client */}
                    <TouchableOpacity
                      onPress={() => {
                          try{
                            deleteClient(client.id);
                            onClose();
                          }
                          catch (error){
                            console.error("Delete failed:", error);
                          }
                      }}
                      activeOpacity={0.8}
                      className="flex-row gap-1 bg-red-700 rounded-full items-center justify-center pl-3 py-2 pr-4"
                      disabled={!canEdit}
                    >
                      <EvilIcons name="trash" size={24} color="white" />
                      <Text className='text-white'>Odstrániť</Text>
                    </TouchableOpacity>

                    {/* Edit selected client */}     
                    <TouchableOpacity
                        onPress={() => {
                          onClose();
                          router.push({
                          pathname: "/addClientScreen",
                          params: { 
                            client: JSON.stringify(client),
                            mode: "edit" 
                            }
                          });
                        }}
                        activeOpacity={0.8}
                        className="flex-row gap-1 bg-green-700 rounded-full items-center justify-center px-4 py-2"
                        disabled={!canEdit}
                    >
                        <Feather name="edit-2" size={16} color="white" />
                        <Text className='text-white'>Upraviť</Text>
                      </TouchableOpacity>   
                    </View>
                </View>
            </View> 
      </Modal>
    );
}