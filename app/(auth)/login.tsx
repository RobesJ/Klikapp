import { FormInput } from "@/components/formInput";
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Body, BodyLarge, BodySmall, Caption, Heading1 } from "../../components/typography";

export default function Login() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors]   = useState<Record<string, string>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);
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
        <SafeAreaView className='flex-1 bg-dark-bg'>

        <KeyboardAvoidingView
            behavior={Platform.OS === "android" ? "padding" : "height"}
            className='flex-1'
        >
            <ScrollView
                className='flex-1'
                contentContainerClassName='flex-grow'
                keyboardShouldPersistTaps='handled'
            >
                <View className="flex-1 items-center justify-center">
                    {/* header */}
                    <View className='flex-2 items-center justify-center mb-6'>
                        <Heading1 className='font-bold mb-2 text-dark-text_color'>
                            Vitajte
                        </Heading1>
                        <BodyLarge className='text-dark-text_color'>
                            Prihláste sa do vášho účtu
                        </BodyLarge>
                    </View>

                    {/* form */}
                    <View className='w-64 mb-6 rounded-3xl py-6'>
                        <FormInput
                            placeholder="Email"
                            value={formData.email}
                            onChange={(value) => handleChange("email", value)}
                            fieldName="email"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            keyboardType='email-address'
                            autoCapitalize='none'
                            editable={!loading}
                            error={errors.email}
                            containerClassName=" "
                        />
                        <FormInput
                            placeholder="Heslo"
                            value={formData.password}
                            onChange={(value) => handleChange("password", value)}
                            fieldName="password"
                            focusedField={focusedField}
                            setFocusedField={setFocusedField}
                            secureTextEntry={true}
                            editable={!loading}
                            error={errors.password}
                            containerClassName="mb-1"
                        />
                        <View className='flex-row mt-2 ml-3'>
                            <TouchableOpacity
                                onPress={() => router.push("/(auth)/forgot-pwd")} // TODO create password renewing page
                                disabled={loading}
                                activeOpacity={1}
                            >
                                <Caption className='font-medium text-dark-text_color'>
                                    Zabudli ste heslo?
                                </Caption>
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
                                <Body className="font-bold text-white">
                                    Prihlásiť sa
                                </Body>
                            </View>
                        )}
                    </TouchableOpacity>

                    <View className='flex-row justify-center items-center'>
                        <BodySmall className='text-dark-text_color mr-2'>
                            Nemáte účet?
                        </BodySmall>
                        <TouchableOpacity
                            onPress={() => router.push("/(auth)/register")}
                            disabled={loading}
                            activeOpacity={1}
                        >
                            <BodySmall className='font-semibold text-dark-text_color'>
                                Zaregistrujte sa
                            </BodySmall>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
        </SafeAreaView>
    );
}