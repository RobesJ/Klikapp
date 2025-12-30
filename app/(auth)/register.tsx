import { FormInput } from '@/components/formInput';
import { Body, Heading1 } from '@/components/typography';
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/store/notificationStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
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
    const [focusedField, setFocusedField] = useState<string | null>(null);

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
            newErrors.name = "Meno je povinné!"
        }
        
        if (!formData.email.trim()) {
            newErrors.email = 'Email je povinný!';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Neplatný formát emailu!';
        }

        if(!formData.password){
            newErrors.password = "Heslo je povinné pole!";
        }
        else if(formData.password.length < 8){
            newErrors.password = "Heslo musí obsahovať aspoň 8 znakov!";
        }

        if(formData.password != formData.confirmPassword){
            newErrors.confirmPassword = "Heslá sa nezhodujú!";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    async function signUpNewUser() { 

        if (!validate()) {
            //Alert.alert("Chyba:", "Prosim opravta chyby vo formulari")
            return;
        }

        setLoading(true);
        try{
            const { error: authError } = await supabase.auth.signUp({
                email: formData.email, 
                password: formData.password,
                options: {
                    data: {
                        name: formData.name
                    }
                }
            });

            if (authError) throw authError;

            useNotificationStore.getState().addNotification(
                "Účet bol vytvorený. Skontrolujte svoj email pre overenie",
                "success",
                10000
            );
            router.replace("/(auth)/login");

        } catch(error: any){
            console.error("Error signing up: ", error);
            Alert.alert("Chyba ", error.message || "Nepodarilo sa vytvoriť účet")
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
                <Heading1 className='mb-2 text-dark-text_color'>
                    Vytvoriť účet
                </Heading1>
                <Body className='text-base text-dark-text_color'>
                    Zadajte vaše údaje pre registráciu
                </Body>
            </View>

            {/*form*/}
            <View className='w-88 mb-6 p-6'>
                <FormInput
                  label="Meno"
                  placeholder="Zadajte vaše meno a priezvisko"
                  value={formData.name}
                  onChange={(value) => handleChange("name", value)}
                  fieldName="name"
                  setFocusedField={setFocusedField}
                  focusedField={focusedField}
                  editable={!loading}
                  autoCapitalize="words"
                  error={errors.name}
                />

                <FormInput
                  label="Email"
                  placeholder="Zadajte váš email"
                  value={formData.email}
                  onChange={(value) => handleChange("email", value)}
                  fieldName="email"
                  setFocusedField={setFocusedField}
                  focusedField={focusedField}
                  editable={!loading}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  error={errors.email}
                /> 

                <FormInput
                  label="Heslo"
                  placeholder="Zadajte heslo"
                  value={formData.password}
                  onChange={(value) => handleChange("password", value)}
                  fieldName="password"
                  setFocusedField={setFocusedField}
                  focusedField={focusedField}
                  editable={!loading}
                  secureTextEntry={true}
                  error={errors.password}
                /> 
                
                <FormInput
                  label="Potvrdiť heslo"
                  placeholder="Zadajte heslo"
                  value={formData.confirmPassword}
                  onChange={(value) => handleChange("confirmPassword", value)}
                  fieldName="confirmPassword"
                  setFocusedField={setFocusedField}
                  focusedField={focusedField}
                  editable={!loading}
                  secureTextEntry={true}
                  error={errors.confirmPassword}
                /> 
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
                            <Body className='font-bold text-white'>
                                Vytváram účet...
                            </Body>
                        ) : (
                            <Body className='text-white font-bold'>
                                Vytvoriť účet
                            </Body>
                        )
                    }
                </TouchableOpacity>
                <View className='flex-row justify-center items-center'>
                    <Body className='text-dark-text_color'>
                        Už máte účet?{'  '}
                    </Body>
                    <TouchableOpacity
                        onPress = {() => router.push("/(auth)/login")}
                        disabled = {loading}
                        activeOpacity={1}
                    >
                        <Body className='font-bold text-dark-text_color'>
                            Prihláste sa
                        </Body>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}