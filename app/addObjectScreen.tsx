import ObjectForm from '@/components/forms/objectForm';
import { useAuth } from '@/context/authContext';
import { supabase } from '@/lib/supabase';
import { useObjectStore } from '@/store/objectStore';
import { ObjectWithRelations } from '@/types/objectSpecific';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddObjectScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { mode, object, preselectedClient } = useLocalSearchParams();
  const { addObject, updateObject,  unlockObject } = useObjectStore();
  const parsedObject = object ? (JSON.parse(object as string)) as ObjectWithRelations : undefined;
  //console.log(parsedObject);
  const parsedClient = preselectedClient ? JSON.parse(preselectedClient as string) : undefined;
  
  useEffect(() => {
    return () => {
      if (mode === "edit" && user){
        unlockObject(parsedClient?.id, user?.id);
      }
    }
  }, [parsedClient?.id, user?.id]);

  useEffect(() => {
    if(!user) return;
    
    const interval = setInterval(() => {
        supabase
          .from('objects')
          .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
          .eq('id', parsedObject?.object.id)
          .eq('locked_by', user.id);
      }, 120_000);

    return () => clearInterval(interval);
            
  }, [ parsedClient?.id, user?.id]);
  
  const handleSuccess = (objectData: any) => {
    if (mode === "create"){
      if(objectData.object){
        addObject(objectData);
      }
    }
    else{
      updateObject(objectData.object.id, objectData);
      if (user && parsedObject?.object) {
          unlockObject(parsedObject.object.id, user.id);
      }
    }
    router.back();
  };
  
  return (
    <SafeAreaView className='flex-1 bg-dark-bg'>
        <ObjectForm
          mode={(mode as "create" | "edit") || "create"}
          initialData={parsedObject}
          onSuccess={handleSuccess}
          preselectedClient={parsedClient}
        />  
    </SafeAreaView>
  );
}