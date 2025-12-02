import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    // Validation
    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Chyba', 'Vyplňte všetky polia');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Chyba', 'Heslo musí obsahovať aspoň 8 znakov');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Chyba', 'Heslá sa nezhodujú');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      Alert.alert(
        'Úspech',
        'Heslo bolo úspešne zmenené',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert('Chyba', error.message || 'Nepodarilo sa zmeniť heslo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-dark-text_color mb-2">
              Nové heslo
            </Text>
            <Text className="text-gray-400 text-base">
              Zadajte svoje nové heslo
            </Text>
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-dark-text_color mb-2 font-semibold">
              Nové heslo
            </Text>
            <View className="relative">
              <TextInput
                placeholder="Aspoň 8 znakov"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                className="bg-gray-700 text-white rounded-xl p-4 pr-12 text-base"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-4"
              >
                <MaterialIcons
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View className="mb-6">
            <Text className="text-dark-text_color mb-2 font-semibold">
              Potvrďte heslo
            </Text>
            <View className="relative">
              <TextInput
                placeholder="Zopakujte heslo"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                className="bg-gray-700 text-white rounded-xl p-4 pr-12 text-base"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-4"
              >
                <MaterialIcons
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#9CA3AF"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleResetPassword}
            disabled={loading}
            className={`${
              loading ? 'bg-blue-400' : 'bg-blue-600'
            } rounded-xl py-4 items-center`}
          >
            {loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">
                Zmeniť heslo
              </Text>
            )}
          </TouchableOpacity>

          {/* Password Requirements */}
          <View className="mt-6 bg-gray-800 rounded-xl p-4">
            <Text className="text-gray-400 text-sm mb-2 font-semibold">
              Požiadavky na heslo:
            </Text>
            <Text className="text-gray-400 text-sm">
              • Minimálne 8 znakov{'\n'}
              • Odporúčame použiť kombináciu písmen, čísiel a symbolov
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}