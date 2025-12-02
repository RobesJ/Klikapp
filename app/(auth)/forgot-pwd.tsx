import { supabase } from '@/lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
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

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  const getRedirectUrl = () => {
    // For Expo Go, create the proper exp:// URL
    if (__DEV__ && Constants.AppOwnership === 'expo') {
      // This automatically gets the correct URL for Expo Go
      return Linking.createURL('(auth)/reset-pwd');
    }
    // For production builds
    return 'klikoncrm://reset-pwd';
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Chyba', 'Zadajte emailovú adresu');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Chyba', 'Neplatný formát emailu');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = getRedirectUrl();
      console.log('Using redirect URL:', redirectUrl);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setEmailSent(true);
      Alert.alert(
        'Email odoslaný',
        'Ak účet s touto emailovou adresou existuje, poslali sme vám odkaz na obnovenie hesla. Odkaz otvorí túto aplikáciu.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      Alert.alert(
        'Chyba', 
        error.message || 'Nepodarilo sa odoslať email na obnovenie hesla'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-4 left-6 w-10 h-10 items-center justify-center"
          >
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>

          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-black mb-2">
              Zabudnuté heslo
            </Text>
            <Text className="text-gray-600 text-base">
              Zadajte svoju emailovú adresu a pošleme vám odkaz na obnovenie hesla
            </Text>
          </View>

          {!emailSent ? (
            <>
              {/* Email Input */}
              <View className="mb-6">
                <Text className="text-black mb-2 font-semibold">
                  Emailová adresa
                </Text>
                <TextInput
                  placeholder="vas@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  className="bg-gray-100 text-black rounded-xl p-4 text-base border border-gray-300"
                />
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
                    Odoslať odkaz
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View className="bg-green-100 border border-green-500 rounded-xl p-4">
              <View className="flex-row items-center mb-2">
                <MaterialIcons name="check-circle" size={24} color="#10b981" />
                <Text className="text-green-700 font-bold text-lg ml-2">
                  Email odoslaný
                </Text>
              </View>
              <Text className="text-green-700 mb-2">
                Skontrolujte svoju emailovú schránku a kliknite na odkaz na obnovenie hesla.
              </Text>
              <Text className="text-green-600 text-sm mb-3">
                📱 Odkaz otvorí túto aplikáciu priamo na stránku obnovenia hesla.
              </Text>
              <TouchableOpacity
                onPress={() => router.back()}
                className="mt-2 bg-green-600 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-semibold">
                  Späť na prihlásenie
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Info */}
          <View className="mt-6 bg-gray-100 rounded-xl p-4">
            <Text className="text-gray-600 text-sm mb-2">
              💡 Tip: Skontrolujte aj spam priečinok, ak email nevidíte v doručenej pošte.
            </Text>
            {__DEV__ && Constants.appOwnership === 'expo' && (
              <Text className="text-blue-600 text-xs mt-2">
                🔧 Dev Mode: Používa Expo Go deep linking
              </Text>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}