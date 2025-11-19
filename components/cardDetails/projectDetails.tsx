import { Client, Project, User } from "@/types/generics";
import { ObjectWithRelations } from "@/types/projectSpecific";
import { Text, View } from "react-native";

interface ProjectCardDetailsProps{
    project: Project;
    client: Client;
    assignedUsers: User[];
    objects: ObjectWithRelations[];
}

export default function ProjectDetails({ project, client, assignedUsers, objects } : ProjectCardDetailsProps) {
    return (
        <View className="flex-1">
            {project.state &&
                  <View className="flex-row mt-1">
                    <Text className="mr-2">
                        Stav: 
                    </Text>
                    <Text className="font-semibold">
                        {project.state}
                    </Text>
                </View>
            }

            {client?.name && 
                 <View className="flex-row mt-1">
                    <Text className="mr-2">
                        Klient: 
                    </Text>
                    <Text className="font-semibold">
                        {client.name}
                    </Text>
                </View>
            }

            {project.scheduled_date &&
                <View className="flex-row mt-1">
                    <Text className="mr-2">
                        Planovane na:
                    </Text>
                    <Text className="font-semibold">
                    {project.scheduled_date}
                    </Text>
                </View>
            }

            {project.start_date &&
                <View className="flex-row mt-1">
                    <Text className="mr-2">
                        Zaciatok:
                    </Text>
                    <Text className="font-semibold">
                        {project.start_date}
                    </Text>
                </View>
            }

            {project.completion_date &&
                <View className="flex-row mt-1">
                    <Text className="mr-2">
                        Ukoncenie: 
                    </Text>
                    <Text className="font-semibold">
                        {project.completion_date}
                    </Text>
                </View>
            }

            {assignedUsers &&
                <View className="mt-1">   
                    <Text>
                        Priradene pre:
                    </Text>                 
                    {assignedUsers.map(user => (
                        <Text key={user.id}>
                            {user.name}
                            </Text>
                        ))
                    }
                </View>
            }

            {project.note &&
                <View className="flex-row mt-1">
                    <Text className="mr-2">
                        Poznamka:
                    </Text>
                    <Text className="font-semibold">
                        {project.note}
                    </Text>
                </View>
            }
            

            {objects.length > 0 &&
                <View className="mt-2 text-xs">
                    <Text>
                        Objekty: {objects.length}
                    </Text>
                    {objects.map(o => (
                        <View key={o.object.id}>
                            <Text>{o.object.address}</Text>

                            <Text>
                                {o.chimneys.length} kominov
                            </Text>
                            {o.chimneys.map(ch =>(
                                <View
                                    key={ch.id}>
                                        <Text>
                                            {ch.placement}
                                        </Text>
                                        <Text>
                                            {ch.appliance}
                                        </Text>
                                        <Text>
                                            {ch.labelling}
                                        </Text>
                                        <Text>
                                            {ch.type}
                                        </Text>
                                </View>
                            ))}
                        </View>
                    ))}
                </View>
            }
        </View>
    );
}