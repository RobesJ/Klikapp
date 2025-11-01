import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function Register() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string,string>>({});

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({...prev, [field]: value}));
        if (errors[field]){
            setErrors(prev => {
                const newErrors = { ...prev};
                delete newErrors[field];
                return newErrors
            });
        }
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if(!formData.name.trim()){
            newErrors.name = "Meno je povinne!"
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email je povinný!';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Neplatný formát emailu!';
        }

        if(!formData.password){
            newErrors.password = "Heslo je povinn0 pole!";
        }
        else if(formData.password.length < 8){
            newErrors.password = "Heslo musi obsahovat aspon 8 znakov!";
        }

        if(formData.password != formData.confirmPassword){
            newErrors.confirmPassword = "Hesla sa nezhoduju!";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    async function signUpNewUser() { 

        if (!validate()) {
            Alert.alert("Chyba:", "Prosim opravta chyby vo formulari")
            return;
        }

        setLoading(true);
        try{
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email, 
                password: formData.password,
                options: {
                    data: {
                        name: formData.name
                    }
                }
            });

            if (authError) throw authError;

            Alert.alert(
                "Uspech!",
                "Ucet bol vytvoreny. Skontrolujte svoj email pre overenie.",
                [
                    {
                        text: "OK",
                        onPress: () => router.replace("/(auth)/login")
                    }
                ]
            );

        } catch(error: any){
            console.error("Error signing up: ", error);
            Alert.alert("Chyba ", error.message || "Nepodarilo sa vytvorit ucet")
        } finally{
            setLoading(false);
        }
    };

  return (
    <KeyboardAvoidingView
        behavior={Platform.OS === "android" ? "padding" : "height"}
        className='flex-1'
    >
    <ScrollView
        className='flex-1'
        contentContainerClassName='flex-grow'
        keyboardShouldPersistTaps="handled"
    >   
        <View className='flex-1 px-10 justify-center'>
            {/*header*/}
            <View className='items-center mb-8'>
                <Text className='text-4xl font-bold mb-2'>
                    Vytvorit ucet
                </Text>
                <Text className='text-base'>
                    Zadajte vase udaje pre registraciu
                </Text>
            </View>

            {/*form*/}
            <View className='items-center mb-6 p-6'>
                <View className='mb-4'>
                    <Text className='ml-2 mb-1'>Meno</Text>
                    <TextInput
                        className='border-2 rounded-2xl w-96 pl-3'
                        placeholder='Zadajte vase meno a priezvisko'
                        value={formData.name}
                        onChangeText={(value) => handleChange("name", value)}
                        editable={!loading}
                        autoCapitalize="words"
                    >
                    </TextInput>
                    {errors.name && (
                        <Text className='text-red-500'>
                            {errors.name}
                        </Text>
                    )}
                </View>
                <View className='mb-4'>
                    <Text className='ml-2 mb-1'>Email</Text>
                    <TextInput
                        className='border-2 rounded-2xl w-96 pl-3'
                        placeholder='Zadajte vas email'
                        value={formData.email}
                        onChangeText={(value) => handleChange("email", value)}
                        editable={!loading}
                        autoCapitalize="none"
                        keyboardType='email-address'
                    >
                    </TextInput>
                    {errors.email && (
                        <Text className='text-red-500'>
                            {errors.email}
                        </Text>
                    )}
                </View>
                <View className='mb-4'>
                    <Text className='ml-2 mb-1'>Heslo</Text>
                    <TextInput
                        className='border-2 rounded-2xl w-96 pl-3'
                        placeholder='Zadajte heslo'
                        value={formData.password}
                        onChangeText={(value) => handleChange("password", value)}
                        editable={!loading}
                        secureTextEntry
                        >
                    </TextInput>
                    {errors.password && (
                        <Text className='text-red-500'>
                            {errors.password}
                        </Text>
                    )}
                </View>
                <View className='mb-4'>
                <Text className='ml-2 mb-1'>Potvrdit heslo</Text>
                    <TextInput
                        className='border-2 rounded-2xl w-96 pl-3'
                        placeholder='Zadajte heslo'
                        value={formData.confirmPassword}
                        onChangeText={(value) => handleChange("confirmPassword", value)}
                        editable={!loading}
                        secureTextEntry
                        >
                    </TextInput>
                    {errors.confirmPassword && (
                        <Text className='text-red-500'>
                            {errors.confirmPassword}
                        </Text>
                    )}
                </View>
            </View>
            <View className='items-center'>
            <TouchableOpacity
                    onPress={signUpNewUser}
                    disabled={loading}
                    activeOpacity={0.8}
                    className={`${loading ? 'bg-blue-400' : 'bg-blue-600'} rounded-2xl py-5 items-center mb-8  min-w-80`}
                >
                    {loading ? 
                        (
                            <View>
                                <Text>
                                    Vytvaram ucet...
                                </Text>
                            </View>
                        ) : (
                            <Text>
                                Vytvorit ucet
                            </Text>
                        )
                    }
                </TouchableOpacity>
                <View className='flex-row justify-center items-center'>
                    <Text>
                        Uz mate ucet?{' '}
                    </Text>
                    <TouchableOpacity
                        onPress = {() => router.push("/(auth)/login")}
                        disabled = {loading}
                    >
                        <Text className='font-bold'>
                            Prihlasit sa
                        </Text>
                    </TouchableOpacity>
                </View>
                </View>
        </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}