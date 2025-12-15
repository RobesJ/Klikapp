import { useAuth } from "@/context/authContext"
import { Redirect, Tabs } from "expo-router"
import { ActivityIndicator, Image, Text, View } from "react-native"
import { icons } from "../../../constants/icons"


const TabIcon = ({focused, icon, title} : any) => {
    if (focused){
        return (
            //<View className="w-full overflow-hidden flex-1 min-w-[124px] min-h-16 mt-3 justify-center items-center rounded-full">
            <View className="flex-1 w-full overflow-hidden min-w-[124px] min-h-16 mt-8 justify-center items-center rounded-full">
                <Image
                    source={icon}
                    tintColor="#ABABAB"
                    className="size-6"/>
                <Text className="text-base"
                    style={{color: "#ABABAB"}}>{title}</Text>
            </View>
        )
    }
    return (
        <View className="size-full justify-center items-center mt-4 rounded-full">
            <Image
                source={icon}
                tintColor="#ABABAB"
                className="size-8"/>
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
                    backgroundColor: "#13122B",
                    borderRadius: 50,
                    height:72,
                    position: 'absolute',
                    overflow: "hidden",
                    borderWidth: 1, 
                    borderColor: "#0c1022"
                    //"#0c1026f0",
                },
                animation: 'shift' // Built-in directional animation!
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
                    ),
                    //animation: "shift"
                }}
            />
            <Tabs.Screen
                name="clients"
                options={{
                    title: "Klienti",
                    // lazy: true,
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.clientsIcon}
                            title="KLIENTI"
                        />   
                    ),
                    //animation: "shift"
                }}
            />
            <Tabs.Screen
                name="objects"
                options={{
                    title: "Objekty",
                    // lazy: true,
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.chimneyIcon}
                            title="OBJEKTY"
                        />   
                    ),
                    //animation: "shift"
                }}
            />
            <Tabs.Screen
                name="projects"
                options={{
                    title: "Projekty",
                    // lazy: true,
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.projectsIcon}
                            title="PROJEKTY"
                        />   
                    ),
                    //animation: "shift"
                }}
            />

            <Tabs.Screen
                name="planning"
                options={{
                    title: "Planovanie",
                    // lazy: true,
                    headerShown: false,
                    tabBarIcon: ({focused}) => (
                        <TabIcon 
                            focused ={focused}
                            icon={icons.planningIcon}
                            title="PLÁNOVANIE"
                        />   
                    ),
                    //animation: "shift"
                }}
            />
        </Tabs>
    )
}

export default _Layout