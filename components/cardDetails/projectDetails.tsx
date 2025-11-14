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

          {project.type &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.type}
                    </Text>
                </View>
            }

            {project.state &&
                 <View className="mt-2 text-xs">
                    <Text>
                        {project.state}
                    </Text>
                </View>
            }

            {client?.name && 
                <View className="mt-2 text-xs">
                    <Text>
                        {client.name}
                    </Text>
                </View>
            }

            {project.scheduled_date &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.scheduled_date}
                    </Text>
                </View>
            }

            {project.start_date &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.start_date}
                    </Text>
                </View>
            }

            {project.completion_date &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.completion_date}
                    </Text>
                </View>
            }
            {assignedUsers &&
                <View className=" mb-2">                    
                    {assignedUsers.map(user => (
                        <Text key={user.id}>
                            {user.name}
                            </Text>
                        ))
                    }
                </View>
            }
            {project.note &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.note}
                    </Text>
                </View>
            }
        </View>
    );
}