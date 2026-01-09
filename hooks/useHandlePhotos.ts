import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { Photo, ProjectWithRelations } from "@/types/projectSpecific";
import * as ImagePicker from "expo-image-picker";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";


interface UseHandlePhotosProps {
    projectWithRelations: ProjectWithRelations;
    //photos?: Photo[];
    //selectedPhoto?: Photo;
}

export function useHandlePhotos({projectWithRelations }: UseHandlePhotosProps) {

    //const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const projectRef = useRef(projectWithRelations);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [photos, setPhotos ] = useState<Photo[]>([]);
    const [selectedPhoto, setSelectedPhoto ] = useState<Photo | null>(null);

    useEffect(() => {
        projectRef.current = projectWithRelations;
    }, [projectWithRelations]);

    const fetchPhotos = useCallback(async () => {
        setLoadingPhotos(true);
        try {
            const {data, error} = await supabase
                .from("photos")
                .select('*')
                .eq("project_id", projectRef.current.project.id)
                .order("uploaded_at", {ascending: false});

            if (error) throw error;
            setPhotos(data || []);
        }
        catch (error: any) {
            console.log("Error fetching photos:", error);
        }
        finally{
            setLoadingPhotos(false);
        }
    }, []);

    const requestCameraPermission = async () => {
        const {status} = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted"){
            Alert.alert(
                "Povolenie potrebné",
                "Na použitie fotoaparátu je potrebné udeliť povolenie."
            );
            return false;
        }
        return true;
    };
    

    const takePhoto = useCallback(async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        try{
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ["images"],
                quality: 0.7
            });

            if (!result.canceled && result.assets[0]){
                await uploadPhoto(result.assets[0].uri);
            }
        }
        catch(error: any){
            console.log("Error taking photos:", error);
            useNotificationStore.getState().addNotification(
                'Nepodarilo sa otvorit fotoaparát',
                'error',
                "projectDetails",
                4000
            );
        }
    }, []);

    const pickFromGallery = useCallback(async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"],
                allowsMultipleSelection: true,
                quality: 0.7,
                selectionLimit: 10
            });

            if (!result.canceled){
                for ( const asset of result.assets){
                    await uploadPhoto(asset.uri);
                }
            }
        }
        catch (error: any){
          useNotificationStore.getState().addNotification(
              "Nepodarilo sa otvoriť galériu",
              "error",
              "projectDetails",
              4000
          )
        }
    },[]);

    const uploadPhoto = useCallback(async (uri: string) => {
        setUploadingPhotos(true);
        try {
            // Create unique filename
            const timestamp = Date.now();
            const filename = `${projectRef.current.project.id}/${timestamp}.jpg`;
          
            const response = await fetch(uri);
            const blob = await response.blob();
            const arrayBuffer = await new Response(blob).arrayBuffer();
        
            // Upload to Supabase Storage
            const { error: uploadError } = await supabase
                .storage
                .from("project-photos")
                .upload(filename, arrayBuffer, {
                    contentType: 'image/jpeg',
                    upsert: false,
                });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: urlData } = supabase.storage
                .from("project-photos")
                .getPublicUrl(filename);

            // Save to database
            const { data: photoData, error: dbError } = await supabase
                .from("photos")
                .insert({
                    project_id: projectRef.current.project.id,
                    file_name: `${timestamp}.jpg`,
                    file_size: blob.size,
                    file_type: blob.type.toString(),
                    storage_path: urlData.publicUrl,
                })
                .select()
                .single();
            
            if (dbError) throw dbError;
            
            // Update local state
            setPhotos(prev => [photoData, ...prev]);
            useNotificationStore.getState().addNotification(
                'Fotografia bola pridaná',
                "success",
                "projectDetails",
                3000
            );
        } 
        catch (error: any) {
            console.error('Error uploading photo:', error);
            useNotificationStore.getState().addNotification(
                'Nepodarilo sa nahrať fotografiu',
                "error",
                "projectDetails",
                4000
            );
        } 
        finally {
          setUploadingPhotos(false);
        }
    }, []);

    const deletePhoto = async (photo: Photo) => {
      const parts = photo.storage_path.split("project-photos/");
      const filename = parts[1];

      Alert.alert(
          'Odstrániť fotografiu',
          'Naozaj chcete odstrániť túto fotografiu?',
          [
              { 
                  text: 'Zrušiť', 
                  style: 'cancel' 
              },
              {
                  text: 'Odstrániť',
                  style: 'destructive',
                  onPress: async () => {
                      try {
                          // Delete from storage
                          const { error: storageError } = await supabase.storage
                              .from("project-photos")
                              .remove([filename]);
                        
                          if (storageError) throw storageError;
                        
                          // Delete from database
                          const { error: dbError } = await supabase
                              .from("photos")
                              .delete()
                              .eq('id', photo.id);
                        
                          if (dbError) throw dbError;
                        
                          // Update local state
                          setPhotos(prev => prev.filter(p => p.id !== photo.id));
                          setSelectedPhoto(null);

                          useNotificationStore.getState().addNotification(
                              "Fotografia bola odstránená",
                              "success",
                              "projectDetails",
                              3000
                          );
                      } 
                      catch (error: any) {
                        console.error('Error deleting photo:', error);
                        useNotificationStore.getState().addNotification(
                            "Nepodarilo sa odstrániť fotografiu",
                            "error",
                            "projectDetails",
                            4000
                        );
                      }
                  }
              }
          ]
      );
    };

    return {
        fetchPhotos,
        takePhoto,
        uploadPhoto,
        deletePhoto,
        uploadingPhotos,
        loadingPhotos,
        photos,
        selectedPhoto,
        setUploadingPhotos,
        setLoadingPhotos,
        setPhotos,
        setSelectedPhoto,
        pickFromGallery
    };
}