import { getFooterImageBase64, getWatermarkBase64 } from '@/constants/icons';
import { supabase } from "@/lib/supabase";
import { generateRecord } from "@/services/pdfService";
import { useProjectStore } from "@/store/projectStore";
import { Client, PDF, Project, User } from "@/types/generics";
import { Chimney, ObjectWithRelations, Photo } from "@/types/projectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from 'date-fns';
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { WebView } from 'react-native-webview';
import { ModalSelector, STATE_OPTIONS } from "../badge";
import { FormInput } from "../formInput";
import UserPickerModal from '../userPickerModal';

interface ProjectCardDetailsProps {
  project: Project;
  client: Client;
  assignedUsers: User[];
  objects: ObjectWithRelations[];
}

export default function ProjectDetails({ 
  project, 
  client, 
  assignedUsers, 
  objects 
}: ProjectCardDetailsProps) {
  const { updateProject, availableUsers } = useProjectStore();
  const [currentState, setCurrentState] = useState(project.state);
  const [users, setUsers] = useState<User[]>(assignedUsers);
  const [showUserModal, setShowUserModal] = useState(false);
  const [updatingState, setUpdatingState] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const [PDFs, setPDFs] = useState<PDF[]>([]);
  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [uploadingPDFs, setUploadingPDFs] = useState(false);
  const [showPDFReports, setShowPDFReports] = useState(false);
  const [selectedPDF, setSelectedPDF] = useState<PDF | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfGenModalVisible, setpdfGenModalVisible] = useState(false);
  const [sumInputModalVisible, setsumInputModalVisible] = useState(false);
  const [chimneySums, setChimneySums] = useState<Record<string, string[]>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
    fetchPDFs();
  }, [project.id]);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try{
        const {data, error} = await supabase
            .from("photos")
            .select('*')
            .eq("project_id", project.id)
            .order("uploaded_at", {ascending: false});
        
        if (error) throw error;
        setPhotos(data || []);
    }
    catch(error: any){
        console.log("Error fetching photos:", error);
    }
    finally{
        setLoadingPhotos(false);
    }
  };

  const fetchPDFs = async () => {
    setLoadingPDFs(true);
    try{
        const {data, error} = await supabase
            .from("pdfs")
            .select('*')
            .eq("project_id", project.id)
            .order("generated_at", {ascending: false});
        
        if (error) throw error;
        setPDFs(data || []);
    }
    catch(error: any){
        console.log("Error fetching pdfs:", error);
    }
    finally{
        setLoadingPDFs(false);
    }
  };

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
        Alert.alert("Chyba", "Nepodarilo sa otvotiť fotoaparát");
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploadingPhotos(true);
    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `${project.id}/${timestamp}.jpg`;
      
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
          project_id: project.id,
          file_name: `${timestamp}.jpg`,
          file_size: blob.size,
          file_type: blob.type.toString(),
          storage_path: urlData.publicUrl,
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      // Update local state
      setPhotos([photoData, ...photos]);
      Alert.alert('Úspech', 'Fotografia bola pridaná');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Chyba', 'Nepodarilo sa nahrať fotografiu');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const deletePhoto = async (photo: Photo) => {
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
              // Use storage_path from database
              const filename = photo.storage_path;

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
              setPhotos(photos.filter(p => p.id !== photo.id));
              setSelectedPhoto(null);
              Alert.alert('Úspech', 'Fotografia bola odstránená');
            } catch (error: any) {
              console.error('Error deleting photo:', error);
              Alert.alert('Chyba', 'Nepodarilo sa odstrániť fotografiu');
            }
          }
        }
      ]
    );
  };

  // Inside your button handler
  const handleGeneratePDF = async (type: "cleaning" | "inspection" | "cleaningWithPaymentReceipt") => {
    try {
      setIsGenerating(true);
      console.log('Starting PDF generation...');
      
      const watermarkBase64 = await getWatermarkBase64();
      const footerBase64 = await getFooterImageBase64();
      
      console.log('Generating records for project:', project.id);
      console.log('Number of objects:', objects.length);
      
      for (const object of objects){
        console.log('Number of chimneys in object:', object.chimneys.length);
        for (const chimney of object.chimneys){
          try{
            console.log(`Generating PDF for chimney ${chimney.id}...`);
            let uri;
            if (type === "cleaningWithPaymentReceipt"){
              let sums = chimneySums[chimney.id];
              uri = await generateRecord(
                project,
                users[0],
                client,
                object,
                chimney,
                watermarkBase64,
                footerBase64,
                type,
                sums
              );
            }
            else{
               uri = await generateRecord(
                project,
                users[0],
                client,
                object,
                chimney,
                watermarkBase64,
                footerBase64,
                type
              );
            }
            
            if (uri) {
              console.log(`PDF generated, uploading for chimney ${chimney.id}...`);
              await uploadPDF(
                uri, 
                type, 
                object.object.id, 
                chimney)
            } else {
              console.error(`Failed to generate PDF for chimney ${chimney.id}`);
              Alert.alert('Chyba', `Nepodarilo sa vygenerovať PDF pre komín ${chimney.labelling || chimney.id}`);
            }
          }
          catch (error: any){
            console.error(error.message);
          }
        }
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert(`PDF generation failed: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadPDF = async (uri: string | null, report_type: string, object_id: string, chimney: Chimney) => {
    if (uri === null){
      return;
    }
              
    setUploadingPDFs(true);
    try {
      // Create unique filename
      //const timestamp = Date.now();
      let filename;
      if(report_type === "cleaning"){
        filename =`cleaning_${chimney.type}_${chimney.labelling}_${chimney.id}.pdf`;
      }
      else{
        filename =`inspection_${chimney.type}_${chimney.labelling}_${chimney.id}.pdf`;
      }
      
      const response = await fetch(uri);
      const blob = await response.blob();
      const arrayBuffer = await new Response(blob).arrayBuffer();
  
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase
        .storage
        .from("pdf-reports")
        .upload(filename, arrayBuffer, {
          contentType: 'application/pdf',
          upsert: false,
        });

      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from("pdf-reports")
        .getPublicUrl(filename);
      
      console.log(`PDF for chimney ${chimney.id} uploaded`);
      // Save to database
      const { data: pdfData, error: dbError } = await supabase
        .from("pdfs")
        .insert({
          project_id: project.id,
          object_id: object_id,
          chimney_id: chimney.id,
          report_type: report_type,
          file_name: filename,
          file_size: blob.size,
          file_type: blob.type.toString(),
          storage_path: urlData.publicUrl,
        })
        .select()
        .single();
      
      if (dbError) throw dbError;
      
      // Update local state
      setPDFs([pdfData, ...PDFs]);

      await fetchPDFs();
      Alert.alert('Úspech', 'PDF záznam bol pridaný');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      Alert.alert('Chyba', 'Nepodarilo sa nahrať PDF');
    } finally {
      setUploadingPDFs(false);
    }
  };

  const deletePdf = async (pdf: PDF) => {
    Alert.alert(
      'Odstrániť PDF',
      'Naozaj chcete odstrániť tento PDF záznam?',
      [
        { text: 'Zrušiť', style: 'cancel' },
        {
          text: 'Odstrániť',
          style: 'destructive',
          onPress: async () => {
            try {
              // Use storage_path from database
              const filename = pdf.storage_path;

              // Delete from storage
              const { error: storageError } = await supabase.storage
                .from("pdf-reports")
                .remove([filename]);

              if (storageError) throw storageError;

              // Delete from database
              const { error: dbError } = await supabase
                .from("pdfs")
                .delete()
                .eq('id', pdf.id);

              if (dbError) throw dbError;

              // Update local state
              setPDFs(PDFs.filter(p => p.id !== pdf.id));
              setSelectedPDF(null);
              Alert.alert('Úspech', 'PDF záznam bol odstránený');
            } catch (error: any) {
              console.error('Error deleting pdf:', error);
              Alert.alert('Chyba', 'Nepodarilo sa odstrániť PDF dokument');
            }
          }
        }
      ]
    );
  };

  // Handle state change with auto-completion
  const handleStateChange = async (newState: string) => {
    if (updatingState) return;
    
    setUpdatingState(true);
    const completionDate = newState === "Ukončený" || "Zrušený" 
      ? new Date().toISOString().split('T')[0] 
      : null;

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          state: newState,
          //completion_date: completionDate 
        })
        .eq('id', project.id);

      if (error) throw error;

      // Update local state
      setCurrentState(newState);
      
      if(newState === "Ukončený"){
        let newType;

        const completion = new Date(completionDate!);
        let scheduledDate: string;
  
        if (project.type === "Obhliadka") {
            newType = "Montáž";
            // + 7 days
            const nextWeek = new Date(completion);
            nextWeek.setDate(nextWeek.getDate() + 7);
            scheduledDate = nextWeek.toISOString().split("T")[0];
        } else {
            newType = "Čistenie";
            // + 1 year
            const nextYear = new Date(completion);
            nextYear.setFullYear(nextYear.getFullYear() + 1);
            scheduledDate = nextYear.toISOString().split("T")[0];
        }
  
        const {data: autoProject , error: autoProjectError} = await supabase
          .from("projects")
          .insert({
              state: "Nový",
              client_id: client.id,
              type: newType,
              scheduled_date: scheduledDate
          })
          .single();
    
        if (autoProjectError) throw autoProjectError;
        if (autoProject){
          Alert.alert("Uspech", "Bol vytvoreny novy projekt");
        }
      }
      // Update store
      updateProject(project.id, {
        project: { ...project, state: newState}, //completion_date: completionDate },
        client,
        users,
        objects
      });

      Alert.alert('Úspech', `Stav projektu bol zmenený na: ${newState}`);
    } catch (error: any) {
      console.error('Error updating project state:', error);
      Alert.alert('Chyba', 'Nepodarilo sa aktualizovať stav projektu');
    } finally {
      setUpdatingState(false);
    }
  };

  // Add user to project
  const handleAddUser = async (user: User) => {
    // Check if already assigned
    if (users.some(u => u.id === user.id)) {
      Alert.alert('Upozornenie', 'Tento používateľ je už priradený');
      return;
    }

    try {
      const { error } = await supabase
        .from("project_assignments")
        .insert({
          project_id: project.id,
          user_id: user.id,
        });

      if (error) throw error;

      // Update local state
      const updatedUsers = [...users, user];
      setUsers(updatedUsers);

      // Update store
      updateProject(project.id, {
        project,
        client,
        users: updatedUsers,
        objects
      });

      setShowUserModal(false);
      Alert.alert('Úspech', `${user.name} bol priradený k projektu`);
    } catch (error: any) {
      console.error('Error adding user:', error);
      Alert.alert('Chyba', 'Nepodarilo sa priradiť používateľa');
    }
  };

  // Remove user from project
  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("project_assignments")
        .delete()
        .eq("project_id", project.id)
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);

      // Update store
      updateProject(project.id, {
        project,
        client,
        users: updatedUsers,
        objects
      });

      Alert.alert('Úspech', 'Používateľ bol odstránený z projektu');
    } catch (error: any) {
      console.error('Error removing user:', error);
      Alert.alert('Chyba', 'Nepodarilo sa odstrániť používateľa');
    }
  };
  
  const toggleUserAssign = async (userId: string) => {
    const exists = users.some(u => u.id === userId);
  
    if (!exists) {
      await handleAddUser(availableUsers.find((u) => u.id === userId)!);
    } else {
      await handleRemoveUser(userId);
    }
  };

  const goToNextPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % photos.length;
    setSelectedPhoto(photos[nextIndex]);
  };
  
  const goToPreviousPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const previousIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
    setSelectedPhoto(photos[previousIndex]);
  };

  const handleChimneySumChange = (chimneyId: string, index: number, value: string) => {
    setChimneySums((prev) => {
      const currentArray = prev[chimneyId] || ['', ''];
      const updatedArray = [...currentArray];
      updatedArray[index] = value;
      return {
        ...prev,
        [chimneyId]: updatedArray,
      };
    });
  };

  const closePdfSumModal = () => {
    setsumInputModalVisible(false);
    setpdfGenModalVisible(false);
    setFocusedField(null);
  };

  const handleGenerateWithReceipt = () => {
    closePdfSumModal();
    handleGeneratePDF("cleaningWithPaymentReceipt");
  };

  return (

    
    <ScrollView className="flex-1">
      
      <View className='flex-row justify-between'>
        {/* Client Info */}
        <View className="flex-2 mb-3">
        <Text className="text-gray-400 mb-1">KLIENT</Text>
          <Text className="font-semibold text-lg text-white">{client.name}</Text>
          <View className="flex-row items-center">
            <MaterialIcons name="phone" size={16} color="#9ca3af"/>
            <Text className="font-medium text-gray-300 ml-2">{client.phone}</Text>
          </View>
        </View>
    
        {/* State field*/}
        <View className="flex-2">
        <ModalSelector
          options={STATE_OPTIONS}
          selectedValue={currentState}
          onSelect={handleStateChange}
          label="Stav: "
          inDetailsModal={true}
        />
        </View>
      </View>

      {/* Dates */}
      <View className='flex-2 mb-3'>
      <Text className="text-gray-400 mb-1">TERMÍN</Text>
      {project.scheduled_date && (currentState === "Nový") && (
        <View className="flex-row">
          <Text className="mr-2 text-dark-text_color">Plánované na:</Text>
          <Text className="font-semibold text-dark-text_color">
            {format(project.scheduled_date, "dd.MM.yyyy")}
          </Text>
        </View>
      )}

      {project.start_date && (currentState !== "Nový") && (currentState !== "Ukončený") && (currentState !== "Zrušený") && (
        <View className="flex-row">
          <Text className="mr-2 text-dark-text_color">Začiatok:</Text>
          <Text className="font-semibold text-dark-text_color">
            {format(project.start_date, "dd.MM.yyyy")}
          </Text>
        </View>
      )}

      {project.completion_date && ((currentState === "Ukončený") || (currentState === "Zrušený")) &&(
        <View className="flex-row">
          <Text className="mr-2 text-dark-text_color">Ukončenie:</Text>
          <Text className="font-semibold text-dark-text_color">
            {format(project.completion_date, "dd.MM.yyyy")}
          </Text>
        </View>
      )}
      </View>

      {/* Note */}
      {project.note && (
        <View className="mb-3">
          <Text className="text-dark-text_color">Poznámka:</Text>
          <Text className="font-semibold text-dark-text_color mt-1">
            {project.note}
          </Text>
        </View>
      )}

      {/* Assigned Users */}
      <View className="mb-3">
        <View className="flex-row items-center justify-between mb-2">
        <Text className="text-gray-400 mt-2">PRIRADENǏ POUŽÍVATELIA</Text>
          <TouchableOpacity
            onPress={() => setShowUserModal(true)}
            className="bg-blue-600  rounded-full w-8 h-8 items-center justify-center"
          >
            <Text className="text-white font-bold text-lg">+</Text>
          </TouchableOpacity>
        </View>

        {users.length > 0 ? (
          <View className="gap-2">
            {users.map((user) => (
              <View
                key={user.id}
                className="flex-row items-center justify-between bg-dark-details-o_p_bg rounded-xl p-3"
              >
                <View>
                  <Text className="text-white font-semibold">{user.name}</Text>
                  {user.email && (
                    <Text className="text-gray-400 text-sm">{user.email}</Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveUser(user.id)}
                  className="w-8 h-8 bg-red-600 rounded-full items-center justify-center"
                >
                  <Text className="text-white font-bold">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <Text className="text-gray-400 italic">Žiadni priradení používatelia</Text>
        )}
      </View>

      {/* Objects */}
      {objects.length > 0 && (
        <View className="mb-3">
          <Text className="text-gray-400 mb-2">OBJEKTY ({objects.length}) </Text>
          {objects.map((o) => (
            <View key={o.object.id} className="bg-dark-details-o_p_bg rounded-xl p-3 mb-2">
              <Text className="text-white font-semibold">{o.object.address}</Text>
              <Text className="text-gray-400 text-sm">
                {o.chimneys.length} komínov
              </Text>
            </View>
          ))}
        </View>
      )}
    
      {/* Photos Section */}
      <View className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-400 mb-2"> FOTOGRAFIE ({photos.length})</Text>
            
            <TouchableOpacity
                onPress={takePhoto}
                disabled={uploadingPhotos}
                className="bg-blue-600 rounded-full px-4 py-2 flex-row items-center"
            >
                {uploadingPhotos ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="camera" size={16} color="white" />
                    <Text className="text-white font-semibold ml-2">Pridať</Text>
                  </>
                )}
                </TouchableOpacity>
          </View>
          
          {loadingPhotos && (
            <ActivityIndicator size="small" color="#3b82f6" />
          )}

          {/* Photo Thumbnails */}
          {photos.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {photos.slice(0, 6).map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  onPress={() => {
                    setSelectedPhoto(photo);
                    setShowGallery(true);
                  }}
                  className="w-20 h-20 rounded-lg overflow-hidden"
                >
                  <Image
                    source={{ uri: photo.storage_path }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              ))}
              {photos.length > 6 && (
                <TouchableOpacity
                  onPress={() => setShowGallery(true)}
                  className="w-20 h-20 rounded-lg bg-gray-700 items-center justify-center"
                >
                  <Text className="text-white font-bold">+{photos.length - 6}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
  
      </View>
      
      {/* PDFs Section */}
      {project.type !== "Obhliadka" && objects.length > 0 && users.length > 0 && (
      <View className="mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-gray-400 mb-2"> PDF ZÁZNAMY ({PDFs.length})</Text>
            <TouchableOpacity
                onPress={() => {
                  if(project.type === "Čistenie"){
                    setpdfGenModalVisible(true);
                  }
                  else{
                    handleGeneratePDF("inspection");
                  }
                }}
                disabled={isGenerating}
                className="bg-blue-600 rounded-full px-4 py-2 flex-row items-center"
            >
                {uploadingPDFs ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <View className='flex-row'>
                    <MaterialIcons name="picture-as-pdf" size={16} color={"#FFFFFF"}/>
                    <Text className="text-white font-semibold ml-2">{isGenerating ? 'Generujem...' : 'Generovať'}</Text>
                  </View>
                )}
                </TouchableOpacity>
          </View>
          
          {loadingPDFs && (
            <ActivityIndicator size="small" color="#3b82f6" />
          )}

          {/* PDF Thumbnails */}
          {PDFs.length > 0 && (
            <View className="flex-row gap-2">
              {PDFs.slice(0, 6).map((pdf) => (   
                <View key={pdf.id}>  
                <View 
                  className="flex-1 h-16 w-16 ">  
                <TouchableOpacity
                  onPress={() => {
                    setSelectedPDF(pdf);
                    setShowPDFReports(true);
                  }}
                  className="overflow-hidden items-center"
                >
                  
                  <MaterialIcons name="picture-as-pdf" size={32} color="#ef4444" />
                  <Text className="text-white font-semibold text-xs">{pdf.report_type === "inspection" ? "Revízia" : "Čistenie"}</Text>
                  <Text className="text-white font-semibold text-xs">{parseISO(pdf.generated_at).toLocaleDateString('sk-SK')} </Text>
                </TouchableOpacity>
                </View>
                </View>
              ))}

              {PDFs.length > 6 && (
                <TouchableOpacity
                  onPress={() => setShowPDFReports(true)}
                  className="w-20 h-20 rounded-lg bg-gray-700 items-center justify-center"
                >
                  <Text className="text-white font-bold">+{PDFs.length - 6}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
  
      </View>
     )}

      <UserPickerModal
        visible={showUserModal}
        onClose={() => setShowUserModal(false)}
        selectedUsers={users.map(u => u.id)}
        onToggle={toggleUserAssign}
      />

      {selectedPhoto && (
        <Modal
          visible={showGallery}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowGallery(false);
            setSelectedPhoto(null);
          }}
        >
          <View 
            className="pt-12 pb-4 px-6 border-b border-gray-700 bg-dark-bg"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">
                Fotografie ({photos.length})
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowGallery(false);
                  setSelectedPhoto(null);
                }}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#334155' }}
              >
                <EvilIcons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
      
          <View className="flex-1">
            <Image
              source={{ uri: selectedPhoto.storage_path }}
              className="w-full h-full bg-dark-bg"
              resizeMode="contain"
            />

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={goToPreviousPhoto}
                  className="absolute left-4 top-1/2 bg-black/50 rounded-full p-3"
                  style={{ transform: [{ translateY: -20 }] }}
                >
                  <MaterialIcons name="chevron-left" size={32} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goToNextPhoto}
                  className="absolute right-4 top-1/2 bg-black/50 rounded-full p-3"
                  style={{ transform: [{ translateY: -20 }] }}
                >
                  <MaterialIcons name="chevron-right" size={32} color="white" />
                </TouchableOpacity>
              </>
            )}

            <View className="absolute bottom-0 left-0 right-0 p-6 bg-dark-bg">
              <View className="flex-row justify-around">
                <TouchableOpacity
                  onPress={() => deletePhoto(selectedPhoto)}
                  className="bg-red-600 rounded-xl px-6 py-3 flex-row items-center"
                >
                  <MaterialIcons name="delete" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Odstrániť</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* PDF Viewer Modal */}
      {selectedPDF && (
        <Modal
          visible={showPDFReports}
          transparent={false}
          animationType="slide"
          onRequestClose={() => {
            setShowPDFReports(false);
            setSelectedPDF(null);
          }}
        >
          <View className="flex-1 bg-dark-bg">
            {/* Header */}
            <View 
              className="pt-12 pb-4 px-6 border-b border-gray-700 bg-dark-bg"
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white">
                    {selectedPDF.report_type === "cleaning" ? "Čistenie" : "Revízna správa"}
                  </Text>
                  <Text className="text-gray-400 text-sm">
                    {new Date(selectedPDF.generated_at).toLocaleDateString('sk-SK')}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowPDFReports(false);
                    setSelectedPDF(null);
                  }}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#334155' }}
                >
                  <EvilIcons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
                
            {/* PDF Viewer using WebView with Google Docs Viewer */}
            <View className="flex-1">
              <WebView
                source={{ 
                  uri: `https://docs.google.com/viewer?url=${encodeURIComponent(selectedPDF.storage_path)}&embedded=true`
                }}
                style={{ 
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center'      
                 }}
                startInLoadingState={true}
                renderLoading={() => (
                  <View className="flex-1 items-center justify-center bg-dark-bg">
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text className="text-gray-400 mt-4">Načítavam PDF...</Text>
                  </View>
                )}
              />
            </View>
              
            {/* Navigation Arrows for multiple PDFs */}
            {PDFs.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    const currentIndex = PDFs.findIndex(p => p.id === selectedPDF.id);
                    const previousIndex = currentIndex === 0 ? PDFs.length - 1 : currentIndex - 1;
                    setSelectedPDF(PDFs[previousIndex]);
                  }}
                  className="absolute left-4 top-1/2 bg-black/70 rounded-full p-3"
                  style={{ transform: [{ translateY: -20 }] }}
                >
                  <MaterialIcons name="chevron-left" size={32} color="white" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={() => {
                    const currentIndex = PDFs.findIndex(p => p.id === selectedPDF.id);
                    const nextIndex = (currentIndex + 1) % PDFs.length;
                    setSelectedPDF(PDFs[nextIndex]);
                  }}
                  className="absolute right-4 top-1/2 bg-black/70 rounded-full p-3"
                  style={{ transform: [{ translateY: -20 }] }}
                >
                  <MaterialIcons name="chevron-right" size={32} color="white" />
                </TouchableOpacity>
              </>
            )}
  
            {/* Bottom Actions */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-dark-bg border-t border-gray-700">
              <View className="flex-row justify-around">
                <TouchableOpacity
                  onPress={() => Linking.openURL(selectedPDF.storage_path)}
                  className="bg-blue-600 rounded-xl px-6 py-3 flex-row items-center flex-1 mr-2"
                >
                  <MaterialIcons name="open-in-new" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Otvoriť</Text>
                </TouchableOpacity>
          
                <TouchableOpacity
                  onPress={() => deletePdf(selectedPDF)}
                  className="bg-red-600 rounded-xl px-6 py-3 flex-row items-center flex-1 ml-2"
                >
                  <MaterialIcons name="delete" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">Odstrániť</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}


      {/* PDF Generation Cleaning Modal */}
      <Modal
          visible={pdfGenModalVisible}
          transparent={false}
          animationType="slide"
          onRequestClose={() => setpdfGenModalVisible(false)}
        >
          <View className="flex-1 bg-dark-bg">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 border-b border-gray-700 bg-dark-bg">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  
                </View>
                <TouchableOpacity
                  onPress={() => setpdfGenModalVisible(false)}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#334155' }}
                >
                  <EvilIcons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>
                
            {/* PDF Viewer using WebView with Google Docs Viewer */}
            <View className="flex-1 px-20">
              <Text className='text-white text-center mb-2'>Vygenerovať správu aj s príjmovým dokladom? </Text>

                {!sumInputModalVisible && (
                  <View className="flex-row justify-between">
                    <TouchableOpacity
                      onPress={() => setsumInputModalVisible(true)}
                      className="w-20 h-10  items-center justify-center"
                      style={{ backgroundColor: '#334155' }}
                    >
                      <Text>{objects.length > 1 ? "Všetky": "Áno"}</Text>
                    </TouchableOpacity>
                  
                    {objects.length > 1 && (
                      <TouchableOpacity
                      onPress={() => setsumInputModalVisible(true)}
                      className="w-20 h-10 items-center justify-center"
                      style={{ backgroundColor: '#334155' }}
                    >
                      <Text>Iba jednu</Text>
                    </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleGeneratePDF("cleaning")}
                      className="w-20 h-10 items-center justify-center"
                      style={{ backgroundColor: '#334155' }}
                    >
                      <Text>Nie</Text>
                    </TouchableOpacity>
                    </View>    
                )}

                {sumInputModalVisible && (
                  <View className="flex-1">
                    <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>

                      {objects.map((o) =>
                        o.chimneys.map((ch, index) => (
                          <View
                            key={`${o.object.id}-${index}`}
                            className="bg-dark-details-o_p_bg rounded-xl p-3 mb-3"
                          >
                             <Text className="text-white text-lg font-semibold">{ch.type} {"-"} {ch.labelling}</Text>
                            <Text className="text-gray-400 text-sm mb-2">{o.object.address}</Text>
                           
                        
                            {/* Amount input */}
                            <FormInput
                              label="Suma (€)"
                              value={chimneySums[ch.id]?.[0] || ''}
                              onChange={(value: string) => handleChimneySumChange(ch.id, 0, value)}
                              placeholder="Napíšte sumu..."
                              fieldName={`sum-amount-${ch.id}`}
                              focusedField={focusedField}
                              setFocusedField={setFocusedField}
                              keyboardType="phone-pad"
                            />

                            {/* Amount in words */}
                            <FormInput
                              label="Suma slovom"
                              value={chimneySums[ch.id]?.[1] || ''}
                              onChange={(value: string) => handleChimneySumChange(ch.id, 1, value)}
                              placeholder="Napíšte sumu slovom..."
                              fieldName={`sum-words-${ch.id}`}
                              focusedField={focusedField}
                              setFocusedField={setFocusedField}
                            />
                          </View>
                        ))
                      )}
                    </ScrollView>
                
              </View>
              )}
  
            {/* Bottom Actions */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-dark-bg border-t border-gray-700">
              <View className="flex-row justify-around">
                <TouchableOpacity
                  onPress={closePdfSumModal}
                  className="bg-gray-700 rounded-xl px-6 py-3 flex-row items-center flex-1 mr-2"
                >
                  <Text className="text-white font-semibold ml-2">Zavrieť</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleGenerateWithReceipt}
                  className="bg-blue-600 rounded-xl px-6 py-3 flex-row items-center flex-1 ml-2"
                  disabled={isGenerating}
                >
                  <MaterialIcons name="picture-as-pdf" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2">
                    {isGenerating ? 'Generujem...' : 'Generovať s dokladom'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </View>
        </Modal>
      
    </ScrollView>
  );
}