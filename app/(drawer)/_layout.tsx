import CustomDrawerContent from "@/components/customDrawer";
import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
    return (
      <Drawer
        drawerContent={(props) => <CustomDrawerContent {...props} />}
        screenOptions={() => ({
          headerShown: false,
          drawerPosition: 'left',
          drawerType: 'front',
          drawerStyle: {
            backgroundColor: '#1a1a1a', // dark-bg color
            width: 280,
          }
        })}
      >
            <Drawer.Screen
               name="(tabs)"
               options={{
                  drawerLabel: ()=> null,
                  drawerItemStyle: { display: 'none' },
                  headerShown: false
               }}
             />
        </Drawer>
    )
}