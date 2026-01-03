import { supabase } from "@/lib/supabase";
import { useNotificationStore } from "@/store/notificationStore";
import { Photo, ProjectWithRelations } from "@/types/projectSpecific";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert } from "react-native";

interface UseHandlePhotosProps {
    projectWithRelations: ProjectWithRelations;
    photos?: Photo[];
    selectedPhoto?: Photo;
}

export function useHandlePhotos({projectWithRelations, photos, selectedPhoto}: UseHandlePhotosProps) {
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [photosLocal, setPhotosLocal ] = useState<Photo[] | null>(photos || null);
    const [selectedPhotoLocal, setSelectedPhoto ] = useState<Photo | null>(selectedPhoto || null);

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

    const takePhoto = async () => {
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
                4000
            );
        }
    };

    const uploadPhoto = async (uri: string) => {
        setUploadingPhotos(true);
        try {
          // Create unique filename
          const timestamp = Date.now();
          const filename = `${projectWithRelations.project.id}/${timestamp}.jpg`;
        
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
              project_id: projectWithRelations.project.id,
              file_name: `${timestamp}.jpg`,
              file_size: blob.size,
              file_type: blob.type.toString(),
              storage_path: urlData.publicUrl,
            })
            .select()
            .single();
        
          if (dbError) throw dbError;
        
          // Update local state
          //setPhotos([photoData, ...photos]);
          useNotificationStore.getState().addNotification(
              'Fotografia bola pridaná',
              "success",
              3000
          );
        } catch (error: any) {
          console.error('Error uploading photo:', error);
          useNotificationStore.getState().addNotification(
            'Nepodarilo sa nahrať fotografiu',
            "error",
            4000
        );
        } finally {
          setUploadingPhotos(false);
        }
    };

    const deletePhoto = async (photo: Photo) => {
      const parts = photo.storage_path.split("project-photos/");
      const filename = parts[1];

      Alert.alert(
        'Odstrániť fotografiu',
        'Naozaj chcete odstrániť túto fotografiu?',
        [
          { text: 'Zrušiť', style: 'cancel' },
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
                if(photosLocal){
                    setPhotosLocal(photosLocal.filter(p => p.id !== photo.id));
                }
                setSelectedPhoto(null);
                
                useNotificationStore.getState().addNotification(
                  "Fotografia bola odstránená",
                  "success",
                  3000
                );
              } catch (error: any) {
                console.error('Error deleting photo:', error);
                useNotificationStore.getState().addNotification(
                  "Nepodarilo sa odstrániť fotografiu",
                  "error",
                  4000
                );
              }
            }
          }
        ]
      );
    };

    return {
        takePhoto,
        uploadPhoto,
        deletePhoto
    }
}