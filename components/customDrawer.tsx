import { supabase } from '@/lib/supabase';
import { EvilIcons, Feather } from '@expo/vector-icons';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { Body, BodyLarge, BodySmall, Caption } from './typografy';

export default function CustomDrawerContent(props: any) {
  const router = useRouter();

  const handleLogout = async () => {
    // TODO: Implement logout logic
    console.log("Logout");
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.replace('/login');
  };

  const handleSettings = () => {
    // TODO: Navigate to settings
    props.navigation.closeDrawer()
    router.push('/settings');
  };

  return (
    <DrawerContentScrollView {...props} className="bg-dark-bg">

        <TouchableOpacity
          onPress={() => props.navigation.closeDrawer()}
          className="pb-4"
          activeOpacity={0.7}
        >
          <EvilIcons name="navicon" size={36} color="white" />
        </TouchableOpacity>
      {/* User Profile Section */}

      <View className="px-6 py-8 border-b border-gray-700">
        <BodyLarge className="text-lg font-semibold text-dark-text_color">
          User Name
        </BodyLarge>
        <BodySmall className="text-sm text-gray-400 mt-1">
          user@example.com
        </BodySmall>
      </View>

      {/* Drawer Items */}
      <DrawerItemList {...props} />

      {/* Custom Menu Items */}
      <View className="px-4 py-4 border-t border-gray-700 mt-auto">
        <TouchableOpacity
          onPress={handleSettings}
          className="flex-row items-center px-4 py-3 rounded-lg mb-2"
          activeOpacity={0.7}
        >
          <Feather name="settings" size={20} color="white" />
          <Body className="text-dark-text_color text-base ml-4">
            Nastavenia
          </Body>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center px-4 py-3 rounded-lg"
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={20} color="#EF4444" />
          <Body className="text-red-500 text-base ml-4">
            Odhlásiť sa
          </Body>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View className="px-6 py-4">
        <Caption className="text-gray-500 text-xs text-center">
          Verzia 1.0.0
        </Caption>
      </View>
    </DrawerContentScrollView>
  );
}