import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";


interface Client {
    id?: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    type: string | null;
    notes: string | null;
}

interface Project {
    id?: string;
    client_id?: string;
    type: string | null;
    state: string | null;
    scheduletd_date: string | null;
    start_date: string | null;
    completion_date: string | null;
    notes: string | null;
}

interface ProjectCardProps {
    project: Project,
    onPress? : () => void
}

export default function ProjectCard({ project, onPress } : ProjectCardProps) {
    const router = useRouter();

    const [client, setClient] = useState<Client>();

    useEffect(() => {
        fetchClient();
      }, []);

    async function fetchClient() {
        try{
            const {data,  error} = await supabase
                .from("clients")
                .select("*")
                .eq("id", project.client_id)
                .single();

            if (error) throw error;
            
            setClient(data);
        }
        catch (error : any) {
            console.error("Chyba:", error.message);
        }
    }

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
                <View className="flex-1">
                <Text className="text-lg font-bold">
                    {project.type}
                </Text> 
                </View>

            </View>

            {client?.name &&
                <View className="flex-row items-center mb-2">
                    <Text>
                        {client?.name}
                    </Text>
                </View>
            }
            {project.state &&
                <View className="flex-row items-center mb-2">
                    <Text>
                        {project.state}
                    </Text>
                </View>
            }

            {project.scheduletd_date &&
                 <View className="flex-row items-center mb-2">
                    <Text>
                        {project.scheduletd_date}
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

            {project.notes &&
                <View className="mt-2 text-xs">
                    <Text>
                        {project.notes}
                    </Text>
                </View>
            }
        </TouchableOpacity>
    )
}