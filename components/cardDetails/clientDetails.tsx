import { Client } from "@/types/generics";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

interface ClientCardDetailsProps{
    client: Client
}

export default function ClientDetails({client} : ClientCardDetailsProps) {
    const router = useRouter();

    return (
        <View className="flex-1">

          {client.email &&
                <View className="flex-row items-center mb-2">
                    <Text className="mr-2 text-sm">📧</Text>
                    <Text>
                        {client.email}
                    </Text>
                </View>
            }

            {client.phone &&
                 <View className="flex-row items-center mb-2">
                    <Text className="mr-2 text-sm">📱</Text>
                    <Text>
                        {client.phone}
                    </Text>
                </View>
            }

            {client.address &&
                <View className="flex-row items-center">
                    <Text className="mr-2">📍</Text>
                    <Text>
                        {client.address}
                    </Text>
                </View>
            }

            {client.note &&
                <View className="mt-2 text-xs">
                    <Text>
                        {client.note}
                    </Text>
                </View>
            }

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push({
                    pathname: "/addObjectScreen",
                    params: { mode: "create", preselectedClient: JSON.stringify(client)}
                  })}>
                    <Text>Pridat objekt</Text>
            </TouchableOpacity>

            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push({
                    pathname: "/addProjectScreen",
                    params: { mode: "create", preselectedClient: JSON.stringify(client)}
                  })}>
                    <Text>Pridat projekt</Text>
            </TouchableOpacity>

        </View>
    );
}