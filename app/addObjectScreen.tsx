import ObjectForm from '@/components/forms/objectForm';
import { useObjectStore } from '@/store/objectStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddObjectScreen() {
  const router = useRouter();
  const { mode, object, preselectedClient } = useLocalSearchParams();
  const { addObject, updateObject } = useObjectStore();
  const parsedObject = object ? JSON.parse(object as string) : undefined;
  const parsedClient = preselectedClient ? JSON.parse(preselectedClient as string) : undefined;

  const handleSuccess = (objectData: any) => {

    if (mode === "create"){
      addObject(objectData);
    }
    else{
      updateObject(objectData.object.id, objectData);
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