import { Client, Project, User } from "@/types/generics";
import { ObjectWithRelations } from "@/types/objectSpecific";
import { format } from "date-fns";
import { TouchableOpacity, View } from "react-native";
import { STATE_OPTIONS } from "../badge";
import { Body, BodySmall, Caption, Heading3 } from "../typography";

interface ProjectCardProps {
    project: Project;
    client: Client;
    users: User[];
    objects: ObjectWithRelations[];
    onPress? : () => void;
}

export default function ProjectCard({ project, client, users, objects, onPress } : ProjectCardProps) {
    
    if(!project || !client){
        return null;
    }
    
    const pillColor = STATE_OPTIONS.find(s => s.value === project.state)?.colors[1] ?? "border-gray-500 bg-yellow-100";
    const textColor = STATE_OPTIONS.find(s => s.value === project.state)?.colors[0] ?? "border-gray-500 bg-yellow-100";
    const chimneySum = objects.reduce((sum, obj) => (sum + obj.chimneys?.length || 0),0);

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPress={onPress}
            className="rounded-2xl mb-3 border-2 border-dark-card-border_color p-4 bg-dark-card-bg"
        >
            
            <View className="flex-row items-center justify-between mb-3">
                <Heading3 className="font-bold text-dark-text_color flex-1">
                    {project.type}
                </Heading3>
                <View className={`px-3 py-1 ${pillColor} rounded-full`}>
                    <BodySmall className={`font-semibold text-sm ${textColor}`}>
                        {project.state}
                    </BodySmall>
                </View>
            </View>

            <View className="flex-row items-center mb-2">
                <BodySmall className="text-gray-400 text-sm">Klient: </BodySmall>
                <Body className="text-dark-text_color font-medium">
                    {client.name}
                </Body>
            </View>
            
            {(project.state === "Nový" || project.state === "Naplánovaný") && project.scheduled_date && (
                <View className="flex-row items-center mb-2">
                    <BodySmall className="text-gray-400 text-sm">Plánované na: </BodySmall>
                    <Body className="text-dark-text_color font-medium">
                        {format(project.scheduled_date, "dd.MM.yyyy")}
                    </Body>
                </View>
            )}
    
            {(project.state === "Naplánovaný" || project.state === "Prebieha" || project.state === "Pozastavený") && project.start_date && (
                <View className="flex-row items-center mb-2">
                    <BodySmall className="text-gray-400 text-sm">Začiatok: </BodySmall>
                    <Body className="text-dark-text_color font-medium">
                        {format(project.start_date, "dd.MM.yyyy")}
                    </Body>
                </View>
            )}
    
            {(project.state === "Ukončený" || project.state === "Zrušený") && project.completion_date && (
                <View className="flex-row items-center mb-2">
                    <BodySmall className="text-gray-400 text-sm">Ukončenie: </BodySmall>
                    <Body className="text-dark-text_color font-medium">
                        {format(project.completion_date, "dd.MM.yyyy")}
                    </Body>
                </View>
            )}
    
            
            {objects && objects.length > 0 && (
                <View className="mt-2 pt-2 border-t border-dark-card-border_color">
                    <View className="flex-row items-center justify-between mb-2">
                        <BodySmall className="text-gray-400 text-sm">
                            {objects.length === 1 
                                ? '1 objekt' 
                                : objects.length >= 2 && objects.length <= 4 
                                ? `${objects.length} objekty` 
                                : `${objects.length} objektov`}
                        </BodySmall>
                            
                        <BodySmall className="text-gray-400 text-sm">
                           {chimneySum} {chimneySum === 1 ? "komín" : (chimneySum > 4 ? "komínov" : "komíny")}
                        </BodySmall>
                        
                    </View>
                    {objects.slice(0, 2).map(o => (
                        <BodySmall 
                            key={o.object.id}
                            className="text-dark-text_color text-sm"
                        >
                            📍 {(o.object.city) || o.object.address}
                            {o.chimneys && o.chimneys.length > 0 && 
                                ` • ${o.chimneys.length} ${o.chimneys.length === 1 ? 'komín' : 'komíny'}`
                            }
                        </BodySmall>
                    ))}
                    {objects.length > 2 && (
                        <Caption className="text-gray-500 text-xs mt-1">
                            +{objects.length - 2} ďalší
                        </Caption>
                    )}
                </View>
            )}
    
            
            {users && users.length > 0 && (
                <View className="flex-row mt-2 pt-2 border-t border-dark-card-border_color items-center">
                    <Caption className="text-gray-400 text-xs mr-4">
                        Priradení používatelia:
                    </Caption>
                    <View className="flex-row flex-wrap gap-2">
                        {users.map((user) => (
                            <View 
                                className=" border border-blue-400 rounded-full px-3 py-1"
                                key={user.id}
                            >
                                <Caption className="text-white text-xs font-medium ml-1">
                                    {user.name}
                                </Caption>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </TouchableOpacity>
    ); 
}