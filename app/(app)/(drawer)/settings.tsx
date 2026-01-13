import { FormInput } from '@/components/formInput';
import { NotificationToast } from '@/components/notificationToast';
import { Body, BodyLarge, Heading1 } from '@/components/typography';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';
import { useNotificationStore } from '@/store/notificationStore';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Settings() {
    const router = useRouter();

    const { user, signOut } = useAuth();
  

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [userName, setUserName] = useState(user?.user_metadata.name || '');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [changePwdPressed, setChangePwdPressed] = useState(false);
    const [changeNamePressed, setChangeNamePressed] = useState(false);
    const [passwordData, setPasswordData] = useState({
        "password": '',
        "confirmPassword": '',
    });
  
    useFocusEffect(useCallback(() => {
      
        // Cleanup on unmount
        return () => {
           // backHandler.remove();
            cancelNameChange();
            cancelPasswordChange();
        };
    
    }, []));

    if (!user) {
        return null;
    }

    const handleChange = (field: string, value: string) => {
        if (field === "userName"){
            setUserName(value);
        }

        if (field === "password" || field === "confirmPassword"){
            setPasswordData(prev =>({...prev, [field]: value}));
        }

        if (errors[field]){
            setErrors( prev => {
                const newErrors = {...prev};
                delete newErrors[field];
                return newErrors;
            })
        }
    };

    function validate(): boolean {
        const newErrors: Record<string, string> = {};
    
        if (changeNamePressed){
            if(!userName.trim()){
                newErrors.userName = "Meno je povinné pole"
            }
            else{
                const normalizedName= userName.trim().replace(/\s+/g, ' ');
                if (normalizedName !==  userName){
                    setUserName(normalizedName);
                }
            }
        }
        if (changePwdPressed){
            if(!passwordData.password){
                newErrors.password = "Heslo je povinné pole";
            }
            else{
                const passwordErrors: string [] = [];
                if(passwordData.password.length < 8){
                    passwordErrors.push("- Heslo musí obsahovať aspoň 8 znakov");
                }
                if(passwordData.password.length > 126){
                    passwordErrors.push("- Heslo musí obsahovať menej ako 126 znakov");
                }
                const hasLetter = /[a-zA-Z]/.test(passwordData.password);
                const hasNumber = /[0-9]/.test(passwordData.password);
              
                if (!hasLetter || !hasNumber) {
                    passwordErrors.push('- Heslo musí obsahovať písmená aj číslice');

                }
                if (passwordErrors.length > 0){
                    newErrors.password = passwordErrors.join('\n');
                }
            }   

            if(passwordData.password != passwordData.confirmPassword){
                newErrors.confirmPassword = "Heslá sa nezhodujú!";
            }
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const submitData = async () => {
        if (!validate()){
            return;
        }

        setLoading(true);
        if (changeNamePressed){
            try {
                const { error } = await supabase
                    .from("user_profiles")
                    .update({name: userName})
                    .eq("id", user.id);
                if (error) throw error;

                const { error: authError } = await  supabase.auth.updateUser({ data: { name: userName} });
                if (authError) throw authError;

                useNotificationStore.getState().addNotification(
                    "Používateľské meno bolo úspešne zmenené",
                    "success",
                    "settings",
                    3000
                );
                setChangeNamePressed(false);
            }
            catch (error: any ){
                console.error("Error changing the user name:", error);
                useNotificationStore.getState().addNotification(
                    "Nepodarilo sa zmeniť používateľské meno",
                    "error",
                    "settings",
                    3000
                );
            }
            finally {
                setLoading(false);
            }
        }

        if (changePwdPressed){
            try {
                const { error } = await supabase.auth.updateUser({ password: passwordData.password});
                if (error) throw error;

                useNotificationStore.getState().addNotification(
                    "Heslo bolo úspešne zmenené",
                    "success",
                    "settings",
                    3000
                );
                setChangePwdPressed(false);
                setPasswordData({
                    "password": "",
                    "confirmPassword": ""
                });
            }
            catch (error: any){
                console.error("Error changing the password:", error);
                useNotificationStore.getState().addNotification(
                    "Nepodarilo sa zmeniť heslo",
                    "error",
                    "settings",
                    3000
                );
            }
            finally{
                setLoading(false);   
            }
        }
    };

    const deleteAccount = async () => {
        Alert.alert(
            "Potvrdiť vymazanie konta",
            "Vymazanie konta nie je možné vrátiť späť. Všetky vaše dáta budú natrvalo odstránené.",
            [
              { 
                text: "Zrušiť",
                style: "cancel",
              },
              { 
                text: "Vymazať konto",
                style: "destructive",
                onPress: async () => {
                    try {
                        setLoading(true);
                        // call supabase edge function do delete user account and signOut
                        const { error } = await supabase.functions.invoke("delete-user", {
                            body: {userId: user.id }
                        });
                        if (error) throw error;
                        await signOut();
                        router.replace("/(auth)/login");
                        useNotificationStore.getState().addNotification(
                            "Váš účet bol vymazaný",
                            "success",
                            "login",
                            3000  
                        );
                    }
                    catch (error: any){
                        console.log("Error deleting account: ", error);
                        useNotificationStore.getState().addNotification(
                            "Nepodarilo sa vymazať účet",
                            "error",
                            "settings",
                            4000  
                        );
                    }
                    finally {
                        setLoading(false);
                    }
                },
              },
            ]
        );
    };

    const cancelNameChange = () => {
        setErrors({});
        setFocusedField(null);
        setChangeNamePressed(false);
    };

    const cancelPasswordChange = () => {
        setErrors({});
        setChangePwdPressed(false);
        setFocusedField(null);
        setPasswordData({
            "password": "",
            "confirmPassword": ""
        });
    };


    return (
        <SafeAreaView className="flex-1 bg-dark-bg">
            {/*<Animated.View style={[animatedStyle, { flex: 1 }]}> */}
            <View>
                {/* Header */}
                <View className="mb-12 relative">                
                    <TouchableOpacity
                      onPress={() => router.back()}
                      className="absolute top-3 left-6 w-10 h-10 items-center justify-center z-10"
                    >
                        <MaterialIcons name="arrow-back" size={24} color="#d6d3d1" />
                    </TouchableOpacity>
                    <Heading1 className="text-dark-text_color top-4 text-center">
                        Nastavenia
                    </Heading1>       
                    <View className='mt-4'>
                        <NotificationToast screen="settings"/>
                    </View> 
                </View>

                <View className="flex-2 px-6">
                    {/* User name changing */}
                    <Body className="text-dark-text_color">Používateľské meno</Body>
                    {!changeNamePressed 
                        ? (
                            <View className="flex-row justify-between items-center">
                                <BodyLarge className="text-dark-text_color mt-4">{user.user_metadata.name}</BodyLarge> 
                                <TouchableOpacity
                                  onPress={() => setChangeNamePressed(true)}
                                  className="bg-blue-700 p-4 rounded-lg items-center justify-center"
                                  disabled={loading}
                                >
                                    <Body className="text-white font-semibold">Zmeniť</Body>
                                </TouchableOpacity>
                            </View>
                        ): (
                            <View className="flex-row justify-between items-center">
                                <View style={{width: "50%"}}>
                                    <FormInput
                                      value={userName}
                                      onChange={(value) => handleChange("userName", value)}
                                      fieldName="userName"
                                      focusedField={focusedField}
                                      setFocusedField={setFocusedField}
                                      editable={!loading}
                                      containerClassName=" "
                                      error={errors.userName}
                                    />
                                </View>
                                <View className="flex-row mt-5 gap-3">
                                    <TouchableOpacity
                                      onPress={() => submitData()}
                                      className="bg-green-700 p-4 rounded-lg items-center justify-center"
                                      disabled={loading}
                                    >
                                        <Body className="text-white font-semibold">Uložiť</Body>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      onPress={() => cancelNameChange()}
                                      className="bg-gray-700 p-4 rounded-lg items-center justify-center"
                                      disabled={loading}
                                    >
                                        <Body className="text-white font-semibold">Zrušiť</Body>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )
                    }

                    { /* Password changing */}    
                    <View className="mt-8">
                        <Body className="text-dark-text_color">Heslo</Body>
                        {changePwdPressed && (
                            <View>
                                <View className="mb-4">
                                    <FormInput
                                        placeholder="Nové heslo"
                                        value={passwordData.password}
                                        onChange={(value) => handleChange("password", value)}
                                        fieldName="password"
                                        focusedField={focusedField}
                                        setFocusedField={setFocusedField}
                                        secureTextEntry={true}
                                        error={errors.password}
                                        editable={!loading}
                                    />

                                    <FormInput
                                        placeholder="Potvrďte nové heslo"
                                        value={passwordData.confirmPassword}
                                        onChange={(value) => handleChange("confirmPassword", value)}
                                        fieldName="confirmPassword"
                                        focusedField={focusedField}
                                        setFocusedField={setFocusedField}
                                        secureTextEntry={true}
                                        error={errors.confirmPassword}
                                        editable={!loading}
                                    />
                                </View>
                                <View className="flex-row justify-end gap-3">
                                    <TouchableOpacity
                                        onPress={() => submitData()}
                                        className="bg-green-700 px-5 py-3 rounded-lg flex-row items-center"
                                        disabled={loading}
                                    >
                                        {loading && changePwdPressed 
                                            ? ( <ActivityIndicator size="small" color="#fff" /> ) 
                                            : ( <Body className="text-white font-semibold">Uložiť</Body> )
                                        }
                                      </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={cancelPasswordChange}
                                        className="bg-gray-700 px-5 py-3 rounded-lg"
                                        disabled={loading}
                                    >
                                        <Body className="text-white">Zrušiť</Body>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {!changePwdPressed && (
                            <View className="mt-4" style={{width: "30%"}}>    
                                <TouchableOpacity
                                  onPress={() => setChangePwdPressed(true)}
                                  className="bg-blue-600 px-5 py-3 rounded-lg flex-row items-center justify-center"
                                  disabled={loading}
                                >
                                    <Body className="text-white font-semibold">Zmeniť heslo</Body>
                                </TouchableOpacity>
                            </View>
                        )}              
                    </View>
                      
                    {/* Delete account button */}
                    <View className="mt-auto mb-6 pt-6">
                        <TouchableOpacity
                          onPress={deleteAccount}
                          className="bg-red-600 py-4 rounded-lg items-center"
                          disabled={loading}
                        >
                          <Body className="text-white font-semibold">Vymazať účet</Body>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
} 