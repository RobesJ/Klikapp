import { supabase } from "@/lib/supabase";
import { Client, User } from "@/types/generics";
import { Chimney, ObjectWithRelations } from "@/types/objectSpecific";
import { ProjectWithRelations } from "@/types/projectSpecific";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface ClientCardDetailsProps{
    client: Client
}

export default function ClientDetails({client} : ClientCardDetailsProps) {
    const router = useRouter();
    const [objectsWithRelations, setObjectsWithRelations] = useState<ObjectWithRelations[]>([]);
    const [projectsWithRelations, setProjectsWithRelations] = useState<ProjectWithRelations[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
    }

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

    return (
        <ScrollView className="flex-1">
            {/* Client Info */}
            <View className="mb-2">
                {client.email && (
                    <View className="flex-row items-center mb-2">
                        <Text className="mr-2 text-base overflow-hidden">📧</Text>
                        <Text className="text-dark-text_color">{client.email}</Text>
                    </View>
                )}

                {client.phone && (
                    <View className="flex-row items-center mb-2">
                        <Text className="mr-2 text-lg">📱</Text>
                        <Text className="text-dark-text_color">{client.phone}</Text>
                    </View>
                )}

                {client.address && (
                    <View className="flex-row items-center mb-2">
                        <Text className="mr-2 text-lg">📍</Text>
                        <Text className="text-dark-text_color">{client.address}</Text>
                    </View>
                )}
                {client.type && (
                    <View className="flex-row items-center mb-2">
                        <Text className="mr-2 text-lg">{client.type === "Právnická osoba" ? "🏢" : "👤"}</Text>
                        <Text className="text-dark-text_color">{client.type}</Text>
                    </View>
                )}
                {client.note && (
                    <View className="flex-row items-center mb-2">
                        <Text className="mr-2 text-lg">📝</Text>
                        <Text className="text-dark-text_color w-80">{client.note}</Text>
                    </View>
                )}
            </View>

            {/* Objects Section */}
            <View className="mb-8">
                <View className="flex-row items-center justify-between mb-4">
                <Text className="text-lg font-bold text-dark-text_color">
                    Objekty ({objectsWithRelations.length})
                </Text>

                <TouchableOpacity
                    activeOpacity={0.8}
                    className="bg-blue-600 py-2 px-4 rounded-lg "
                    onPress={() => router.push({
                        pathname: "/addObjectScreen",
                        params: { mode: "create", preselectedClient: JSON.stringify(client) }
                    })}>
                    <Text className="text-white text-center font-semibold">Pridať objekt</Text>
                </TouchableOpacity>
                </View>

                {objectsWithRelations.length === 0 ? (
                    <Text className="text-gray-500">Žiadne objekty</Text>
                ) : (
                    objectsWithRelations.map((item) => (
                        <TouchableOpacity 
                            key={item.object.id} 
                            className="bg-dark-details-o_p_bg p-3 rounded-lg mb-2"
                            onPress={()=> {
                            router.push({
                                pathname: "/addObjectScreen",
                                params: { 
                                  object: JSON.stringify(item),
                                  mode: "edit", 
                                  preselectedClient: JSON.stringify(client)
                                }
                              });
                              
                            }}
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
                            <Text className="text-sm text-dark-text_color mt-1">
                                Komíny: {item.chimneys.length}
                            </Text>
                        </TouchableOpacity>
                    ))
                )}
            </View>

            {/* Projects Section */}
            <View className="mb-4 pb-4">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-lg font-bold text-dark-text_color">
                        Projekty ({projectsWithRelations.length})
                    </Text>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        className="bg-blue-600 py-2 px-4 rounded-lg"
                        onPress={() => router.push({
                            pathname: "/addProjectScreen",
                            params: { mode: "create", preselectedClient: JSON.stringify(client) }
                        })}>
                        <Text className="text-white text-center font-semibold">Pridať projekt</Text>
                    </TouchableOpacity>
                </View>
                {projectsWithRelations.length === 0 ? (
                    <Text className="text-gray-500">Žiadne projekty</Text>
                ) : (
                    projectsWithRelations.map((item) => (
                        <TouchableOpacity key={item.project.id} className="bg-dark-details-o_p_bg p-3 rounded-lg mb-2"
                        onPress={()=> {
                            router.push({
                                pathname: "/addProjectScreen",
                                params: { 
                                  project: JSON.stringify(item),
                                  mode: "edit", 
                                  preselectedClient: JSON.stringify(client)
                                }
                              });
                            }}
                            >
                            <Text className="font-semibold text-dark-text_color">{item.project.type}</Text>
                            <Text className="text-sm text-dark-text_color">{item.project.state}</Text>
                            {/*item.project.scheduled_date && (
                                <Text className="text-xs text-gray-500 mt-1">
                                    {new Date(item.project.scheduled_date).toLocaleDateString()}
                                </Text>
                            )*/}
                        </TouchableOpacity>
                    ))
                )}
            </View>
        </ScrollView>
    );
}