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
            className="rounded-2xl mb-3 border border-gray-800 px-4 py-2"
        >
            <View className="flex-row items-start justify-between" >   
                <View className="flex-1">
                    <Text className="text-2xl font-semibold mb-1">
                        {project.type}
                    </Text>

                    {client?.name &&
                        <View className="flex-row items-center mb-1">
                            <Text className="mr-2">
                                Klient:
                            </Text>
                            <Text className="font-semibold">
                                {client?.name}
                            </Text>
                        </View>
                    }

                    {project.state !== "Ukončený" && project.start_date &&
                        <View className="flex-row items-center mb-1">
                            <Text className="mr-2">
                                Zaciatok projektu:
                            </Text>
                            <Text className="font-semibold">
                                {project.start_date}
                            </Text>
                        </View>
                    }

                    {project.state === "Ukončený" && project.completion_date &&
                        <View className="flex-row items-center mb-1">
                            <Text className="mr-2">
                                Ukoncenie projektu:
                            </Text>
                            <Text className="font-semibold">
                                {project.completion_date}
                            </Text>
                        </View>
                    }

                    {users && users.length > 0 && (
                        <View className="flex-1 items-start mb-1">
                            <Text className="mr-2">
                                Priradeny pouzivatelia:
                            </Text>
                            <View className="flex-row">
                            {users.map((user) => (
                                <View 
                                    className="rounded-full border-blue-300 px-2 py-1 border-2 mr-1 mt-1"
                                    key={user.id}>
                                    <Text 
                                    className="font-semibold">
                                        {user.name}
                                    </Text>
                                </View>
                            ))}
                            </View>
                        </View>
                    )}
                </View>
                

                <View className="justify-between items-end ml-4"> 
                    {project.state &&
                        <Text className="font-semibold">
                            {project.state}
                        </Text>
                    } 
                    
                    <View className="items-end">
                    {objects && objects.length > 0 && (
                        <View>
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
                    </View>
                </View>
            </View>

        </TouchableOpacity>
    )
}