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
    const typeColorMap: Record<string, string[]> = {
        "Obhliadka": ["text-dark-project-type-obhliadka", "border-dark-project-type-obhliadka"],
        "Montáž": ["text-dark-project-type-montaz", "border-dark-project-type-montaz"],
        "Revízia": ["text-dark-project-type-revizia", "border-dark-project-type-revizia"],
        "Čistenie": ["text-dark-project-type-cistenie", "border-dark-project-type-cistenie"]
      };
      
      const stateColorMap: Record<string, string[]> = {
        "Nový": ["text-dark-project-state-novy", "border-2 border-dark-project-state-novy"],
        "Naplánovaný": ["text-dark-project-state-novy", "border-2 border-dark-project-state-novy"],
        "Aktívny": ["text-dark-project-state-aktivny","border-2 border-dark-project-state-aktivny"],
        "Prebieha": ["text-dark-project-state-prebieha","border-2 border-dark-project-state-prebieha"],
        "Pozastavený": ["text-dark-project-state-pozastaveny","border-2 border-dark-project-state-pozastaveny"],
        "Ukončený": ["text-dark-project-state-ukonceny","border-2 border-dark-project-state-ukonceny"]
      };

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            className="rounded-2xl mb-3 border border-dark-card-border_color px-4 py-2 bg-dark-card-bg"
        >
                <View className="flex-row items-start justify-between mb-2" >   
                    <View className="flex-2">
                        <Text className="text-2xl font-semibold mb-1 text-dark-text_color">
                            {project.type}
                        </Text>

                        {client?.name &&
                            <View className="flex-row items-center mb-1  text-dark-text_color">
                                <Text className="mr-2 text-dark-text_color">
                                    Klient:
                                </Text>
                                <Text className="font-semibold  text-dark-text_color">
                                    {client?.name}
                                </Text>
                            </View>
                        }

                        {project.state !== "Ukončený" && project.start_date &&
                            <View className="flex-row items-center mb-1  text-dark-text_color">
                                <Text className="mr-2 text-dark-text_color">
                                    Zaciatok projektu:
                                </Text>
                                <Text className="font-semibold  text-dark-text_color">
                                    {project.start_date}
                                </Text>
                            </View>
                        }

                        {project.state === "Ukončený" && project.completion_date &&
                            <View className="flex-row items-center mb-1  text-dark-text_color">
                                <Text className="mr-2 text-dark-text_color">
                                    Ukoncenie projektu:
                                </Text>
                                <Text className="font-semibold  text-dark-text_color">
                                    {project.completion_date}
                                </Text>
                            </View>
                        }

                        {users && users.length > 0 && (
                            <View className="flex-1 items-start mb-1  text-dark-text_color">
                                <Text className="mr-2 text-dark-text_color">
                                    Priradeny pouzivatelia:
                                </Text>
                                <View className="flex-row">
                                {users.map((user) => (
                                    <View 
                                        className="rounded-full border-blue-300 px-2 py-1 border-2 mr-1 mt-1"
                                        key={user.id}>
                                        <Text 
                                        className="font-semibold  text-dark-text_color">
                                            {user.name}
                                        </Text>
                                    </View>
                                ))}
                                </View>
                            </View>
                        )}
                    </View>
                    

                    <View className="flex-2 justify-between items-end ml-4"> 
                        {project.state &&
                            <View className={`px-4 ${stateColorMap[project.state][1]} rounded-full pt-1 items-center`}>
                                <Text className={`font-semibold mb-1 ${stateColorMap[project.state][0]}`}>
                                    {project.state}
                                </Text>
                            </View>
                        } 

                        <View className="flex-1">
                        {objects && objects.length > 0 && (
                            <View >
                                    <Text className=" text-dark-text_color">
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