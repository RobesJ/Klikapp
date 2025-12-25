import {
    Body,
    BodyLarge,
    Caption,
    Heading1
} from "../../components/typografy";

import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
            newErrors.email = "Email je povinný!";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Neplatný formát emailu';
        }

        if (!formData.password){
            newErrors.password = "Heslo je povinné!";
        }
        else if (formData.password.length < 8 ){
            newErrors.password = "Heslo musí obsahovať aspoň 8 znakov!";
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
            const { error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            if (error) throw error;

            router.replace("/(drawer)/(tabs)/home");
        } 
        catch(error: any){
            console.log("Error signing in: ", error);
            Alert.alert("Chyba pri prihlasovaní: ",
                error.message === "Invalid login credentials"
                ? "Nesprávny email alebo heslo!"
                : error.message || "Nepodarilo sa príhlasiť"
            )
        }
        finally{
            setLoading(false);
        }
    }
    
    return (
        <SafeAreaView className='flex-1'>

        <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            className='flex-1'
        >
            <ScrollView
                className='flex-1'
                contentContainerClassName='flex-grow'
                keyboardShouldPersistTaps='handled'
            >
                <View className="flex-1 items-center justify-center bg-white">
                    {/* header */}
                    <View className='mb-8'>
                        <Heading1 className='text-4xl font-bold mb-2'>
                            Vitajte späť
                        </Heading1>
                        <BodyLarge className='text-base'>
                            Prihláste sa do vášho účtu
                        </BodyLarge>
                    </View>

                    {/* form */}
                    <View className='mb-6 rounded-3xl py-6'>
                        <View className='mb-3'>
                            <TextInput
                                className='border-2 rounded-2xl w-64 pl-3 py-3'
                                placeholderTextColor="#9CA3AF"
                                placeholder='Email'                
                                value={formData.email}
                                onChangeText={(value) => handleChange("email", value)}
                                keyboardType='email-address'
                                autoCapitalize='none'
                                editable={!loading}
                            />
                            {errors.email &&
                            (
                                <Text className='text-red-500 font-semibold ml-2 mt-1'>
                                    {errors.email}
                                </Text>
                            )}
                        </View>
                        <View>                                                
                            <TextInput
                                className='border-2 rounded-2xl w-64 pl-3 py-3'
                                placeholderTextColor="#9CA3AF"
                                placeholder='Heslo'
                                value={formData.password}
                                onChangeText={(value) => handleChange("password", value)}
                                secureTextEntry
                                editable={!loading}
                               
                            />
                            {errors.password &&
                            (
                                <Text className='text-red-500 font-semibold ml-2 mt-1'>
                                    {errors.password}
                                </Text>
                            )}
                        </View>
                        <View className='flex-row mt-2'>
                        
                        <TouchableOpacity
                            onPress={() => router.push("/(auth)/forgot-pwd")} // TODO create password renewing page
                            disabled={loading}
                            activeOpacity={0.8}
                        >
                            <Text className='text-xs font-medium'>
                                Zabudli ste heslo?
                            </Text>
                        </TouchableOpacity>
                    </View>
                    </View>
                        
                    <TouchableOpacity
                        onPress={SignIn}
                        disabled={loading}
                        activeOpacity={0.8}
                        className={Platform.OS ==="android" ? 'bg-blue-600 rounded-2xl py-5 items-center justify-center px-20 shadow-lg mb-6' : 'bg-blue-600 text-sm rounded-2xl py-5 items-center justify-center px-10 shadow-lg mb-6' }
                        //className={`${loading ? 'bg-blue-400' : 'bg-blue-600'} rounded-2xl py-5 items-center justify-center px-20 shadow-lg mb-6`}
                    >
                        {loading ? 
                        (
                            <View className='flex-row items-center'>
                                <Body className='font-bold text-white'>
                                    Prihlasovanie
                                </Body>
                            </View>
                        ):
                        (   
                            <View className='flex-row items-center'>
                                <Body 
                                    className="font-bold text-white"
                                >
                                    Prihlásiť sa
                                </Body>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View className='flex-row justify-center items-center'>
                        <Caption className='text-base'>
                            Nemáte účet?{'  '}
                        </Caption>
                        <TouchableOpacity
                            onPress={() => router.push("/(auth)/register")}
                            disabled={loading}
                        >
                            <Caption className='font-semibold'>
                                Zaregistrujte sa
                            </Caption>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
        </SafeAreaView>
    );
}