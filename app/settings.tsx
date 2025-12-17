
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, TouchableOpacity, View } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';


export default function Settings() {
  const router = useRouter();

  return (
    <SafeAreaView className= "flex-1 bg-dark-bg">
        <View className="mb-12 relative">                
            <TouchableOpacity
                onPress={() => router.back()}
                className="absolute top-3 left-6 w-10 h-10 items-center justify-center z-10"
            >
              <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
            </TouchableOpacity>
            <Text className="font-bold text-3xl text-dark-text_color top-4 text-center">
                Nastavenia
            </Text>        
        </View>
        <View>
            <Text className="text-dark-text_color"> Zmenit pouzivatelske meno</Text>
            <TextInput
            />
            <TouchableOpacity
                onPress={()=> router.back()}
            >
                <Text className="text-dark-text_color">Ulozit</Text>
            </TouchableOpacity>
        </View>
    </SafeAreaView>
  );
}