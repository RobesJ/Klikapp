import { FormInput } from '@/components/formInput';
import { NotificationToast } from '@/components/notificationToast';
import { Body, Heading1 } from '@/components/typography';
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/store/notificationStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';

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
        const updates: Partial<typeof formData> = {};

        if(!formData.name.trim()){
            newErrors.name = "Meno je povinné pole"
        }
        else{
            const normalizedName= formData.name.trim().replace(/\s+/g, ' ');
            if (normalizedName !== formData.name){
                updates.name = normalizedName;
            }
        }
        
        if(formData.email && formData.email.trim() !== ''){
            const normalizedEmail = formData.email.trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                newErrors.email = 'Neplatný formát emailu';
            }
            else if (normalizedEmail !== formData.email){
                updates.email = normalizedEmail;
            }
        }

        if(!formData.password){
            newErrors.password = "Heslo je povinné pole";
        }

        else{
            const passwordErrors: string [] = [];
            if(formData.password.length < 8){
                passwordErrors.push("- Heslo musí obsahovať aspoň 8 znakov");
            }
            if(formData.password.length > 126){
                passwordErrors.push("- Heslo musí obsahovať menej ako 126 znakov");
            }
            const hasLetter = /[a-zA-Z]/.test(formData.password);
            const hasNumber = /[0-9]/.test(formData.password);

            if (!hasLetter || !hasNumber) {
                passwordErrors.push('- Heslo musí obsahovať písmená aj číslice');
              
            }
            if (passwordErrors.length > 0){
                newErrors.password = passwordErrors.join('\n');
            }
        }   

        if(formData.password != formData.confirmPassword){
            newErrors.confirmPassword = "Heslá sa nezhodujú!";
        }

        if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, updates }));
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    async function signUpNewUser() { 
        if (!validate()) {
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
                "login",
                10000
            );
            router.replace("/(auth)/login");

        } catch(error: any){
            console.error("Error signing up: ", error);
            useNotificationStore.getState().addNotification(
                `Nepodarilo sa vytvoriť účet: ${error.message}`,
                "error",
                "register",
                10000
            );
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
                <NotificationToast screen="register"/>
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