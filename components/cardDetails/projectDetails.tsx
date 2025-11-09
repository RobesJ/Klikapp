import { Text, View } from "react-native";

interface Project {
    id: string;
    client_id?: string;
    type: string | null;
    state: string | null;
    scheduled_date: string | null;
    start_date: string | null;
    completion_date: string | null;
    notes: string | null;
}

interface User {
    id: string;
    name: string;
    email: string | null;
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

interface Object {
    id: string;
    client_id?: string,
    address: string | null;
    placement: string | null,
    appliance: string | null,
    note: string | null;
}

interface Chimney {
    id: string;
    type: string | null;
    labelling: string | null;
}

interface ObjectWithRelations {
    object: Object;
    chimneys: Chimney[];
}

interface ProjectCardDetailsProps{
    project: Project;
    client: Client;
    assignedUsers: User[] | null;
    objects: ObjectWithRelations[] | null;
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
            {project.notes &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.notes}
                    </Text>
                </View>
            }
        </View>
    );
}