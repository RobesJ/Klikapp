import { useAuth } from "@/context/authContext"
import { Redirect, Tabs } from "expo-router"
import { ActivityIndicator, Image, Text, View } from "react-native"
import { icons } from "../../constants/icons"


const TabIcon = ({focused, icon, title} : any) => {
    if (focused){
        return (
            <View className="w-full overflow-hidden flex-1 min-w-[124px] min-h-16 mt-3 justify-center items-center rounded-full bg-accent color-secondary">
                <Image
                    source={icon}
                    tintColor="#000000"
                    className="size-5"/>
                <Text className="font-semibold text-base">{title}</Text>
            </View>
        )
    }
    return (
        <View className="size-full justify-center items-center mt-4 rounded-full">
            <Image
                source={icon}
                tintColor="#DBEAFE"
                className="size-5"/>
        </View>
    )
}

const _Layout = () => {
    const {user, loading} = useAuth();

    if (loading){
        <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" />
        </View>
    }

    if(!user) {
        return <Redirect href ="/(auth)/login" />
    }

    return (
        <Tabs
            screenOptions={{
                tabBarShowLabel:false,
                tabBarItemStyle: {
                    width:  '100%',
                    height: '100%',
                    justifyContent: 'center',
                    alignItems: 'center'
                },
                tabBarStyle: {
                    backgroundColor: "#223042",
                    borderRadius: 50,
                    marginBottom: 36,
                    height:52,
                    position: 'absolute',
                    overflow: "hidden",
                    borderWidth: 1, 
                    borderColor: '#223042"'
                }
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: "Domov",
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.homeIcon}
                            title="DOMOV"
                        />   
                    )
                }}
            />
            <Tabs.Screen
                name="clients"
                options={{
                    title: "Klienti",
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.clientsIcon}
                            title="KLIENTI"
                        />   
                    )
                }}
            />
            <Tabs.Screen
                name="objects"
                options={{
                    title: "Objekty",
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.chimneyIcon}
                            title="OBJEKTY"
                        />   
                    )
                }}
            />
            <Tabs.Screen
                name="projects"
                options={{
                    title: "Projekty",
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.projectsIcon}
                            title="PROJEKTY"
                        />   
                    )
                }}
            />

            <Tabs.Screen
                name="planning"
                options={{
                    title: "Planovanie",
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.planningIcon}
                            title="PLANOVANIE"
                        />   
                    )
                }}
            />
        </Tabs>
    )
}

export default _Layout