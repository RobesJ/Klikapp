import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Projects() {
  return (
    <SafeAreaView className="flex-1">
      <View className="flex-row items-start mt-4 ml-6">
        <Text className="font-bold text-4xl">Projekty</Text>
      </View>
      <ScrollView className="p-5">

      </ScrollView>
    </SafeAreaView>
  );
}