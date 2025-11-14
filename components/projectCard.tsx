import { Client, Project, User } from "@/types/generics";
import { ObjectWithRelations } from "@/types/projectSpecific";
import { Text, TouchableOpacity, View } from "react-native";

interface ProjectCardProps {
    project: Project;
    client: Client;
    users: User[];
    objects: ObjectWithRelations[];
    onPress? : () => void;
}

export default function ProjectCard({ project, client, users, objects, onPress } : ProjectCardProps) {
   
    const handlePress = () => {
        if (onPress){
            onPress();
        }
    };
   
    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePress}
            className="rounded-2xl mb-3 border border-gray-800 p-3"
        >
            <View className="flex-row items-center justify-between mb-2">   
                <Text className="text-2xl font-semibold">
                    {project.type}
                </Text>

                {project.state &&
                    <Text>
                        {project.state}
                    </Text>
                } 

            </View>

            {client?.name &&
                <View className="flex-row items-center mb-2">
                    <Text className="mr-2">
                        Klient:
                    </Text>
                    <Text>
                        {client?.name}
                    </Text>
                </View>
            }

            {project.scheduled_date && (
                 <View className="flex-row items-center mb-2">
                    <Text className="mr-2">
                        Planovany zaciatok:
                    </Text>
                    <Text>
                        {project.scheduled_date}
                    </Text>
                </View>
            )}

            {project.start_date &&
                <View className="flex-row items-center mb-2">
                    <Text className="mr-2">
                        Zaciatok projektu:
                    </Text>
                    <Text>
                        {project.start_date}
                    </Text>
                </View>
            }

            {project.completion_date &&
                <View className="flex-row items-center mb-2">
                    <Text className="mr-2">
                        Ukoncenie projektu:
                    </Text>
                    <Text>
                        {project.completion_date}
                    </Text>
                </View>
            }

            {users && users.length > 0 && (
                <View className="flex-row items-center mb-2">
                    <Text className="mr-2">
                        Priradeny pouzivatelia:
                    </Text>
                    {users.map((user) => (
                        <Text key={user.id}>
                            {user.name}
                        </Text>
                    ))}
                </View>
            )}
            
            {objects && objects.length > 0 && (
                <View className="flex-row justify-end mb-2">
                        <Text>
                            {(objects.length == 1) ? 
                                (
                                    `${objects.length} priradeny objekt`
                                ):(
                                    (objects.length >= 2 &&  objects.length <= 4) ?
                                    (
                                        `${objects.length} priradene objekty`
                                    ):(
                                        `${objects.length} priradenych objektov`
                                    )
                                )
                            }
                        </Text>
                </View>
            )}
            
            {project.note &&
                <View className="flex-row items-center">
                     <Text className="mr-2">
                        Poznamka:
                    </Text>
                    <Text>
                        {project.note}
                    </Text>
                </View>
            }
        </TouchableOpacity>
    )
}