import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  return (
    <SafeAreaView>
      <View className="flex-row items-start mt-4 ml-6">
          <Text className="font-bold text-4xl">Home</Text>
      </View>
    </SafeAreaView>
  );
}