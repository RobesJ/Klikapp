import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Login() {
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [errors, setErrors]   = useState<Record<string, string>>({});
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    
    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({  ...prev, [field]: value}));
        if (errors[field]){
            setErrors( prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            })
        }
    }
    const validate = () : boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.email){
            newErrors.email = "Email je povinny!";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Neplatný formát emailu';
        }

        if (!formData.password){
            newErrors.password = "Heslo je povinne!";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }

    async function SignIn() {

        if(!validate()){
            return;
        }

        setLoading(true);

        try{
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            if (error) throw error;

            router.replace("/(tabs)/home");

        } catch(error: any){
            console.log("Error signing in: ", error);
            Alert.alert("Chyba pri prihlasovani: ",
                error.message === "Invalid login credentials"
                ? "Nespravny email alebo heslo!"
                : error.message || "Nepodarilo sa prihlasit"
            )
        }finally{
            setLoading(false);
        }
        
    }
    
    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            className='flex-1'
        >
            <ScrollView
                className='flex-1'
                contentContainerClassName='flex-grow'
                keyboardShouldPersistTaps='handled'
            >
                <View className="flex-1 px-28 justify-center">
                    {/* header */}
                    <View className='items-center mb-8'>
                        <Text className='text-4xl font-bold mb-2'>
                            Vitajte spat
                        </Text>
                        <Text className='text-base'>
                            Prihlaste sa do vasho uctu
                        </Text>
                    </View>

                    {/* form */}
                    <View className='mb-6 rounded-3xl p-6 items-start'>
                        <View>
                            <TextInput
                                className='border-2 rounded-2xl w-64 pl-3 mb-3'
                                placeholder='Email'
                                value={formData.email}
                                onChangeText={(value) => handleChange("email", value)}
                                keyboardType='email-address'
                                autoCapitalize='none'
                                editable={!loading}
                            />
                            {errors.email &&
                            (
                                <Text className='text-red-500'>
                                    {errors.email}
                                </Text>
                            )}
                        </View>
                        <View>                                                
                            <TextInput
                                className='border-2 rounded-2xl w-64 pl-3'
                                placeholder='Heslo'
                                value={formData.password}
                                onChangeText={(value) => handleChange("password", value)}
                                secureTextEntry
                                editable={!loading}
                            />
                            {errors.password &&
                            (
                                <Text className='text-red-500'>
                                    {errors.password}
                                </Text>
                            )}
                        </View>
                    </View>
                        
                    <TouchableOpacity
                        onPress={SignIn}
                        disabled={loading}
                        activeOpacity={0.8}
                        className={`${loading ? 'bg-blue-400' : 'bg-blue-600'} rounded-2xl py-5 items-center justify-center shadow-lg mb-6`}
                    >
                        {loading ? 
                        (
                            <View className='flex-row items-center'>
                                <Text className='font-bold'>
                                    Prihlasovanie
                                </Text>
                            </View>
                        ):
                        (
                            <Text className='font-bold'>
                                Prihlasit sa
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View className='flex-row justify-center items-center'>
                        <Text className='text-base'>
                            Nemate ucet?{' '}
                        </Text>
                        <TouchableOpacity
                            onPress={() => router.push("/(auth)/register")}
                            disabled={loading}
                        >
                            <Text className='font-semibold'>
                                Zaregistrujte sa
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}