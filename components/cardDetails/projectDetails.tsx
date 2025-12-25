import { getFooterImageBase64, getWatermarkBase64 } from '@/constants/icons';
import { useAuth } from '@/context/authContext';
import { supabase } from "@/lib/supabase";
import { generateRecord } from "@/services/pdfService";
import { useNotificationStore } from '@/store/notificationStore';
import { useProjectStore } from "@/store/projectStore";
import { PDF, User } from "@/types/generics";
import { Chimney } from "@/types/objectSpecific";
import { Photo, ProjectWithRelations } from "@/types/projectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from 'date-fns';
import * as ImagePicker from "expo-image-picker";
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ModalSelector, STATE_OPTIONS } from "../badge";
import { FormInput } from "../formInput";
import { NotificationToast } from '../notificationToast';
import { PDF_Viewer } from '../pdfViewer';
import UserPickerModal from '../userPickerModal';

interface ProjectCardDetailsProps {
  projectWithRelations: ProjectWithRelations;
  visible: boolean;
  onClose: () => void;
  onCloseWithUnlock: () => void;
}

export default function ProjectDetails({ 
  projectWithRelations, 
  visible,
  onClose,
  onCloseWithUnlock
}: ProjectCardDetailsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentState, setCurrentState] = useState(projectWithRelations.project.state);
  const [users, setUsers] = useState<User[]>(projectWithRelations.users);
  const [showUserModal, setShowUserModal] = useState(false);
  const [updatingState, setUpdatingState] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [lockedByName, setLockedByName] = useState<string | null>(null);

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
  
  const [chimneySums, setChimneySums] = useState<Record<string, string[]>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { updateProject, addProject, deleteProject, availableUsers, lockProject } = useProjectStore();
  
  type PdfFlowStep =
  | "choice"         
  | "selectOne"       
  | "inputAll"        
  | "inputOne";       

  const [pdfStep, setPdfStep] = useState<PdfFlowStep>("choice");
  const [selectedChimneyId, setSelectedChimneyId] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotos();
    fetchPDFs();
  }, [projectWithRelations.project.id]);

  useEffect(() => {
    if(!visible || !projectWithRelations.project.id || !user) return;
    console.log("Use effect called");
    let active = true;

    (async () => {
      const result = await lockProject(projectWithRelations.project.id, user.id, user.user_metadata.name);
      if(!active) return;

      if(result.success){
        setCanEdit(true);
        console.log("Project lock aquired");
      }
      else{
        setCanEdit(false);
        setLockedByName(result.lockedByName);
      }
    })();

  }, [visible, user?.id, projectWithRelations?.project?.id]);
  
  useEffect(() => {
    if(!canEdit || !visible ||  !user) return;
    
    const interval = setInterval(() => {
      supabase
      .from("projects")
      .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
      .eq('id', projectWithRelations.project.id)
      .eq('locked_by', user.id);
    },120_000);
    
    return () => clearInterval(interval);
  }, [visible, user?.id, canEdit]);

  const chimneyCount = useMemo(() =>{
    return projectWithRelations.objects.reduce((sum, o) => sum + o.chimneys.length, 0);
  },[projectWithRelations.objects]);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    try{
        const {data, error} = await supabase
            .from("photos")
            .select('*')
            .eq("project_id", projectWithRelations.project.id)
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
            .eq("project_id", projectWithRelations.project.id)
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
      setPhotos([photoData, ...photos]);
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
              setPhotos(photos.filter(p => p.id !== photo.id));
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

  const handleGeneratePDF = async (
    type: "cleaning" | "inspection" | "cleaningWithPaymentReceipt",
    receiptOnlyForChimneyId?: string
  ) => {
    try {
      setIsGenerating(true);
  
      const watermarkBase64 = await getWatermarkBase64();
      const footerBase64 = await getFooterImageBase64();
  
      /* ----------------------------------------------------
         RECEIPT LOGIC
         ---------------------------------------------------- */
      if (type === "cleaningWithPaymentReceipt") {
        console.log("inside of this condition");
        // ALL chimneys → receipt for all
        if (!receiptOnlyForChimneyId) {
          console.log("inside of generate amount for all condition");
          for (const object of projectWithRelations.objects) {
            for (const chimney of object.chimneys) {
              const sums = chimneySums[chimney.id] || ["", ""];
              console.log(sums);
              try {
                const uri = await generateRecord(
                  projectWithRelations.project,
                  users[0],
                  projectWithRelations.client,
                  object,
                  chimney,
                  watermarkBase64,
                  footerBase64,
                  type,
                  sums
                );
  
                if (uri) {
                  await uploadPDF(
                    uri,
                    type,
                    object.object.id,
                    chimney,
                    sums
                  );
                }
              } catch (err) {
                console.error("Failed uploading or generation of cleaning record with receipt", err);
              }
            }
          }
        }
  
        // ONE chimney → receipt only for selected
        else {
          for (const object of projectWithRelations.objects) {
            for (const chimney of object.chimneys) {
            const theOneChimney = chimney.id === receiptOnlyForChimneyId ? chimney : null;
            
            if (theOneChimney){
              const sums = chimneySums[theOneChimney.id];
              try {
                const uri = await generateRecord(
                  projectWithRelations.project,
                  users[0],
                  projectWithRelations.client,
                  object,
                  theOneChimney,
                  watermarkBase64,
                  footerBase64,
                  type,
                  sums
                );
    
                if (uri) {
                  await uploadPDF(
                    uri,
                    type,
                    object.object.id,
                    chimney,
                    sums
                  );
                }
              } catch (err) {
                console.error(`Single receipt failed`, err);
              }
            }
            else{
              try {
                const uri = await generateRecord(
                  projectWithRelations.project,
                  users[0],
                  projectWithRelations.client,
                  object,
                  chimney,
                  watermarkBase64,
                  footerBase64,
                  "cleaning",
                  null
                );
              
                if (uri) {
                  await uploadPDF(
                    uri,
                    "cleaning",
                    object.object.id,
                    chimney,
                    null
                  );
                }
              } catch (err) {
                console.error("Failed uploading or generation of cleaning record", err);
              }
            }
          }
        }
        }
      }
  
      else {
        for (const object of projectWithRelations.objects) {
          for (const chimney of object.chimneys) {
            try {
              const uri = await generateRecord(
                projectWithRelations.project,
                users[0],
                projectWithRelations.client,
                object,
                chimney,
                watermarkBase64,
                footerBase64,
                type,
                null
              );
  
              if (uri) {
                await uploadPDF(
                  uri,
                  type,
                  object.object.id,
                  chimney,
                  null
                );
              }
            } catch (err) {
              console.error("Generation of basic report failed", err);
            }
          }
        }
      }
      useNotificationStore.getState().addNotification(
        "PDF dokumenty boli vygenerované",
        "success",
        3000
      );
    } catch (error) {
      console.error("handleGeneratePDF failed:", error);
      useNotificationStore.getState().addNotification(
        "Nepodarilo sa vygenerovať PDF",
        "error",
        3000
      );
    } finally {
      setIsGenerating(false);
      setChimneySums({});
    }
  };
  
  const uploadPDF = async (uri: string | null, report_type: string, object_id: string, chimney: Chimney, sums: string[] | null) => {
    if (uri === null){
      return;
    }
              
    setUploadingPDFs(true);
    try {
      let filename;
      if(report_type === "cleaning" ||  report_type === "cleaningWithPaymentReceipt"){
        filename =`cleaning_${chimney.id}_${projectWithRelations.project.id}.pdf`;
      }
      else{
        filename =`inspection_${chimney.id}_${projectWithRelations.project.id}.pdf`;
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
      if( sums  !== null){
        const { data: pdfData, error: dbError } = await supabase
          .from("pdfs")
          .insert({
            project_id: projectWithRelations.project.id,
            object_id: object_id,
            chimney_id: chimney.id,
            report_type: report_type,
            file_name: filename,
            file_size: blob.size,
            file_type: blob.type.toString(),
            storage_path: urlData.publicUrl,
            amount: sums[0],
            amountByWords: sums[1]
          })
          .select()
          .single();

          if (dbError) throw dbError;
          // Update local state
          setPDFs([pdfData, ...PDFs]);
      }
      else{
        const { data: pdfData, error: dbError } = await supabase
          .from("pdfs")
          .insert({
            project_id: projectWithRelations.project.id,
            object_id: object_id,
            chimney_id: chimney.id,
            report_type: report_type,
            file_name: filename,
            file_size: blob.size,
            file_type: blob.type.toString(),
            storage_path: urlData.publicUrl
          })
          .select()
          .single();

          if (dbError) throw dbError;
          // Update local state
          setPDFs([pdfData, ...PDFs]);
      }

      await fetchPDFs();
      useNotificationStore.getState().addNotification(
        "PDF záznam bol pridaný",
        "success",
        3000
      );
    } 
    catch (error: any) {
      console.error('Error uploading pdf', error);
      useNotificationStore.getState().addNotification(
        "Nepodarilo sa nahrať PDF",
        "error",
        4000
      );
    } 
    finally {
      setUploadingPDFs(false);
    }
  };

  const deletePdf = async (pdf: PDF) => {
    const parts = pdf.storage_path.split("pdf-reports/");
    const filename = parts[1];
    
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
              useNotificationStore.getState().addNotification(
                "PDF záznam bol odstránený",
                "success",
                3000
              );
            } catch (error: any) {
              console.error('Error deleting pdf:', error);
              useNotificationStore.getState().addNotification(
                "Nepodarilo sa odstrániť PDF záznam",
                "error",
                4000
              );
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

    const oldState = projectWithRelations.project.state;
    let startDate =  projectWithRelations.project.start_date;
    let completionDate =  projectWithRelations.project.completion_date;

    if (newState === "Nový"){
      startDate = null;
      completionDate = null;
    }
    else if (["Prebieha", "Pozastavený", "Naplánovaný"].includes(newState)){
      if (oldState === "Nový"){
        startDate = new Date().toISOString().split('T')[0]; 
      }
      else if (["Ukončený","Zrušený"].includes(oldState)){
        completionDate = null;
      }
    }
    else if (["Ukončený","Zrušený"].includes(newState)){
      if (!["Ukončený","Zrušený"].includes(oldState)){
        completionDate = new Date().toISOString().split('T')[0];
      }
    }
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          state: newState,
          start_date: startDate,
          completion_date: completionDate 
        })
        .eq('id',  projectWithRelations.project.id);

      if (error) throw error;
      
      // Update local state
      setCurrentState(newState);
      
      // create new automated project
      if(newState === "Ukončený"){
        let newType;
        const completion = new Date(completionDate!);
        let scheduledDate: string;
  
        if (projectWithRelations.project.type === "Obhliadka") {
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
              client_id: projectWithRelations.client.id,
              type: newType,
              scheduled_date: scheduledDate
          })
          .select()
          .single();
        
        if (autoProjectError) throw autoProjectError;
        
        // fetch new project with relations of type Montaz and 
        // add it to state.projects
        if (autoProject && (newType === "Montáž")){
          const { data: completeProject, error: fetchError } = await supabase
            .from("projects")
            .select(`
              *,
              clients (*),
              project_assignments (
                user_profiles (id, name, email)
              ),
              project_objects (
                objects (
                  id,
                  client_id,
                  address,
                  city, 
                  streetNumber,
                  country,
                  chimneys (
                    id,
                    chimney_types (id, type, labelling),
                    placement,
                    appliance,
                    note
                  )
                )
              )
            `,)
            .eq("id", autoProject.id)
            .single();

          if (fetchError) throw fetchError;

          // Transform the data to match ProjectWithRelations format
          if (completeProject) {
            const transformedProject = {
              project: completeProject,
              client: completeProject.clients,
              users: completeProject.project_assignments
                ?.map((pa: any) => pa.user_profiles)
                .filter(Boolean) || [],
              objects: completeProject.project_objects
                ?.map((po: any) => {
                  if (!po.objects) return null;
                  const chimneys = po.objects.chimneys
                    ?.map((c: any) => ({
                      id: c.id,
                      type: c.chimney_types?.type || null,
                      labelling: c.chimney_types?.labelling || null,
                      appliance: c.appliance,
                      placement: c.placement,
                      note: c.note
                    }))
                    .filter(Boolean) || [];
                  return {
                    object: po.objects,
                    chimneys: chimneys
                  };
                })
                .filter(Boolean) || []
            };
            addProject(transformedProject);
          }
        }
        useNotificationStore.getState().addNotification(
          `Bol vytvorený nový projekt typu: ${newType}`,
          "success",
          3000
        );
      }
      // Update store
      updateProject(projectWithRelations.project.id, {
        project: 
          {   
            ...projectWithRelations.project, 
            state: newState,
            start_date: startDate,
            completion_date: completionDate 
          },
        client: projectWithRelations.client,
        users,
        objects: projectWithRelations.objects
      });
      useNotificationStore.getState().addNotification(
        `Stav projektu bol zmenený na: ${newState}`,
        "success",
        3000
      );
  
    } catch (error: any) {
      console.error('Error updating project state:', error);
      useNotificationStore.getState().addNotification(
        "Nepodarilo sa upraviť stav projektu",
        "error",
        4000
      );
    } finally {
      setUpdatingState(false);
    }
  };

  const handleAddUser = async (user: User) => {
    // Check if already assigned
    if (users.some(u => u.id === user.id)) {
      useNotificationStore.getState().addNotification(
        "Tento používateľ je už priradený",
        "error",
        4000
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("project_assignments")
        .insert({
          project_id: projectWithRelations.project.id,
          user_id: user.id,
        });

      if (error) throw error;

      // Update local state
      const updatedUsers = [...users, user];
      setUsers(updatedUsers);

      // Update store
      updateProject(projectWithRelations.project.id, {
        project: projectWithRelations.project,
        client: projectWithRelations.client,
        users: updatedUsers,
        objects: projectWithRelations.objects
      });

      setShowUserModal(false);
      useNotificationStore.getState().addNotification(
        "Úspech', `${user.name} bol priradený k projektu",
        "success",
        3000
      );
    } catch (error: any) {
      console.error('Error adding user:', error);
      useNotificationStore.getState().addNotification(
        "Nepodarilo sa priradiť používateľa",
        "error",
        4000
      );
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("project_assignments")
        .delete()
        .eq("project_id", projectWithRelations.project.id)
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers(updatedUsers);

      // Update store
      updateProject(projectWithRelations.project.id, {
        project: projectWithRelations.project,
        client: projectWithRelations.client,
        users: updatedUsers,
        objects: projectWithRelations.objects 
      });

    } catch (error: any) {
      console.error('Error removing user:', error);
      useNotificationStore.getState().addNotification(
        "Nepodarilo sa odstrániť používateľa z projektu",
        "error",
        4000
      );
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

  const closePdfModal = () => {
    setpdfGenModalVisible(false);
    setPdfStep("choice");
    setSelectedChimneyId(null);
    setFocusedField(null);
  };

  const handleClosePdfViewer = () => {
    setShowPDFReports(false);
    setSelectedPDF(null);
  };

  return (
    <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-10/12 h-fit bg-dark-bg border-2 border-gray-300 rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="px-4 py-6 border-b border-gray-400">
              <View className="flex-row items-center justify-between">
                <Text className="text-xl font-bold text-dark-text_color">
                  {projectWithRelations.project.type}
                </Text>
              
                <TouchableOpacity
                  onPress={onCloseWithUnlock}
                  className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
                >
                  <EvilIcons name="close" size={24} color="white" />
                </TouchableOpacity>
                
              </View>
            </View>
            
            {/* Project data*/}
            <ScrollView className="max-h-screen-safe-offset-12 p-4">
              <ScrollView className="flex-1">
                <NotificationToast/>
                <View className='flex-row justify-between'>
                  {/* Client Info */}
                  <View className="flex-2 mb-3">
                  <Text className="text-gray-400 mb-1">KLIENT</Text>
                    <Text className="font-semibold text-lg text-white">{projectWithRelations.client.name}</Text>
                    <View className="flex-row items-center">
                      <MaterialIcons name="phone" size={16} color="#9ca3af"/>
                      <Text className="font-medium text-gray-300 ml-2">{projectWithRelations.client.phone}</Text>
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
                {projectWithRelations.project.scheduled_date && (currentState === "Nový") && (
                  <View className="flex-row">
                    <Text className="mr-2 text-dark-text_color">Plánované na:</Text>
                    <Text className="font-semibold text-dark-text_color">
                      {format(projectWithRelations.project.scheduled_date, "dd.MM.yyyy")}
                    </Text>
                  </View>
                )}

                {projectWithRelations.project.start_date && (currentState !== "Nový") && (currentState !== "Ukončený") && (currentState !== "Zrušený") && (
                  <View className="flex-row">
                    <Text className="mr-2 text-dark-text_color">Začiatok:</Text>
                    <Text className="font-semibold text-dark-text_color">
                      {format(projectWithRelations.project.start_date, "dd.MM.yyyy")}
                    </Text>
                  </View>
                )}

                {projectWithRelations.project.completion_date && ((currentState === "Ukončený") || (currentState === "Zrušený")) &&(
                  <View className="flex-row">
                    <Text className="mr-2 text-dark-text_color">Ukončenie:</Text>
                    <Text className="font-semibold text-dark-text_color">
                      {format(projectWithRelations.project.completion_date, "dd.MM.yyyy")}
                    </Text>
                  </View>
                )}
                </View>
              
                {/* Note */}
                {projectWithRelations.project.note && (
                  <View className="mb-3">
                    <Text className="text-dark-text_color">Poznámka:</Text>
                    <Text className="font-semibold text-dark-text_color mt-1">
                      {projectWithRelations.project.note}
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
                          {canEdit && (
                            <TouchableOpacity
                            onPress={() => handleRemoveUser(user.id)}
                            className="w-8 h-8 bg-red-600 rounded-full items-center justify-center"
                          >
                            <Text className="text-white font-bold">✕</Text>
                          </TouchableOpacity>
                          )}          
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text className="text-gray-400 italic">Žiadni priradení používatelia</Text>
                  )}
                </View>
                
                {/* Objects */}
                {projectWithRelations.objects.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-gray-400 mb-2">OBJEKTY ({projectWithRelations.objects.length}) </Text>
                    {projectWithRelations.objects.map((o) => (
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
                {projectWithRelations.project.type !== "Obhliadka" && projectWithRelations.objects.length > 0 && users.length > 0 && (
                <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-gray-400 mb-2"> PDF ZÁZNAMY ({PDFs.length})</Text>
                      <TouchableOpacity
                          onPress={() => {
                            if(projectWithRelations.project.type === "Čistenie"){
                              setpdfGenModalVisible(true);
                            }
                            else{
                              handleGeneratePDF("inspection");
                              //console.log("calling handle gen pdf for inspection");
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

              </ScrollView>
              

              {/* FOOTER */}  
              <View className="flex-row justify-between px-4 py-6 border-t border-gray-400">
              
                <TouchableOpacity
                  onPress={() => {
                      try{
                        deleteProject(projectWithRelations.project.id);
                        onClose();
                      }
                      catch (error){
                        console.error("Delete failed:", error);
                      }
                  }}
                  activeOpacity={0.8}
                  className="flex-row gap-1 bg-red-700 rounded-full items-center justify-center pl-3 py-2 pr-4"
                  disabled={!canEdit}
                >
                  <EvilIcons name="trash" size={24} color="white" />
                  <Text className='text-white'>Odstrániť</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    router.push({
                      pathname: "/addProjectScreen",
                      params: { 
                        project: JSON.stringify(projectWithRelations), 
                        mode: "edit", 
                        preselectedClient: JSON.stringify(projectWithRelations.client)
                      }
                    });
                  }}
                  activeOpacity={0.8}
                  className="flex-row gap-1 bg-green-700 rounded-full items-center justify-center px-4 py-2"
                  disabled={!canEdit}
                >
                  <Feather name="edit-2" size={16} color="white" />
                  <Text className='text-white'>Upraviť</Text>
                </TouchableOpacity>
                  
              </View>
            </ScrollView>

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
                  {canEdit && (
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
                  )}
                </View>
              </Modal>
            )}

            {/* PDF Viewer Modal */}
            {selectedPDF && (
              <PDF_Viewer
                uri={selectedPDF.storage_path}
                visible={showPDFReports}
                onClose={() => handleClosePdfViewer()}
                selectedPDF={selectedPDF}
                onDelete={() => deletePdf(selectedPDF)}
              />
            )}

            {/* PDF Generation Cleaning Modal */}
            <Modal
              visible={pdfGenModalVisible}
              transparent
              animationType="slide"
              onRequestClose={closePdfModal}
            >
              <View className="flex-1 bg-black/50 justify-center items-center">
                <View className="w-11/12 max-h-[90%] bg-dark-bg border border-gray-600 rounded-2xl overflow-hidden">

                  {/* Header */}
                  <View className="flex-row justify-end p-4 border-b border-gray-700">
                    <TouchableOpacity onPress={closePdfModal}>
                      <EvilIcons name="close" size={28} color="white" />
                    </TouchableOpacity>
                  </View>

                  {/* BODY */}
                  <View className="p-6 flex-2">

                    {/* ================= STEP 1 – CHOICE ================= */}
                    {pdfStep === "choice" && (
                      <View>
                        <Text className="text-white text-center text-lg mb-6">
                          Ako chcete vygenerovať PDF?
                        </Text>
                      
                        {/* NO RECEIPT */}
                        <TouchableOpacity
                          className="bg-gray-700 rounded-xl p-4 mb-4"
                          onPress={() => {
                            handleGeneratePDF("cleaning");
                            closePdfModal();
                          }}
                        >
                          <Text className="text-white text-center">
                            Len {chimneyCount > 1 ? "správy" : "správa"} (bez PPD)
                          </Text>
                        </TouchableOpacity>
                        
                        {/* ONE CHIMNEY */}
                        {chimneyCount > 1 && (
                          <TouchableOpacity
                            className="bg-gray-700 rounded-xl p-4 mb-4"
                            onPress={() => setPdfStep("selectOne")}
                          >
                            <Text className="text-white text-center">
                              Správa + PPD pre jeden komín
                            </Text>
                          </TouchableOpacity>
                        )}

                        {/* ALL CHIMNEYS */}
                        <TouchableOpacity
                          className="bg-blue-600 rounded-xl p-4"
                          onPress={() => setPdfStep("inputAll")}
                        >
                          <Text className="text-white text-center font-semibold">
                          {chimneyCount > 1 ? "Správy + PPD pre všetky komíny" : "Správa + PPD"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ================= STEP 2 – SELECT ONE ================= */}
                    {pdfStep === "selectOne" && (
                      <ScrollView>
                        <Text className="text-white text-lg mb-4">
                          Vyberte komín
                        </Text>
                    
                        {projectWithRelations.objects.flatMap(o =>
                          o.chimneys.map(ch => (
                            <TouchableOpacity
                              key={ch.id}
                              className="bg-dark-details-o_p_bg rounded-xl p-4 mb-3"
                              onPress={() => {
                                setSelectedChimneyId(ch.id);
                                setPdfStep("inputOne");
                              }}
                            >
                              <Text className="text-white font-semibold">
                                {ch.chimney_type?.type} – {ch.chimney_type?.labelling}
                              </Text>
                              <Text className="text-gray-400 text-sm">
                                {o.object.address}
                              </Text>
                            </TouchableOpacity>
                          ))
                        )}
                      </ScrollView>
                    )}

                    {/* ================= STEP 3A – INPUT ONE ================= */}
                    {pdfStep === "inputOne" && selectedChimneyId && (
                      <View>
                        <FormInput
                          label="Suma (€)"
                          value={chimneySums[selectedChimneyId]?.[0] || ""}
                          onChange={(v: string) =>
                            handleChimneySumChange(selectedChimneyId, 0, v)
                          }
                          fieldName="sum-one"
                          keyboardType="phone-pad"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />
                        <FormInput
                          label="Suma slovom"
                          value={chimneySums[selectedChimneyId]?.[1] || ""}
                          onChange={(v: string) =>
                            handleChimneySumChange(selectedChimneyId, 1, v)
                          }
                          fieldName="sum-one-words"
                          focusedField={focusedField}
                          setFocusedField={setFocusedField}
                        />
                        <TouchableOpacity
                          className="bg-blue-600 rounded-xl p-4 mt-6"
                          disabled={isGenerating}
                          onPress={() => {
                            handleGeneratePDF(
                              "cleaningWithPaymentReceipt",
                              selectedChimneyId
                            );
                            closePdfModal();
                          }}
                        >
                          <Text className="text-white text-center font-semibold">
                            {isGenerating ? "Generujem..." : "Generovať"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* ================= STEP 3B – INPUT ALL ================= */}
                    {pdfStep === "inputAll" && (
                      <ScrollView>
                        {projectWithRelations.objects.flatMap(o =>
                          o.chimneys.map(ch => (
                            <View
                              key={ch.id}
                              className="bg-dark-details-o_p_bg rounded-xl p-4 mb-4"
                            >
                              <Text className="text-white font-semibold">
                                {ch.chimney_type?.type} – {ch.chimney_type?.labelling}
                              </Text>
                              <Text className="text-gray-400 text-sm mb-2">
                                {o.object.address}
                              </Text>
                          
                              <FormInput
                                label="Suma (€)"
                                value={chimneySums[ch.id]?.[0] || ""}
                                onChange={(v: string) =>
                                  handleChimneySumChange(ch.id, 0, v)
                                }
                                fieldName={`sum-${ch.id}`}
                                keyboardType="phone-pad"
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                              />

                              <FormInput
                                label="Suma slovom"
                                value={chimneySums[ch.id]?.[1] || ""}
                                onChange={(v: string) =>
                                  handleChimneySumChange(ch.id, 1, v)
                                }
                                fieldName={`sum-words-${ch.id}`}
                                focusedField={focusedField}
                                setFocusedField={setFocusedField}
                              />
                            </View>
                          ))
                        )}

                        <TouchableOpacity
                          className="bg-blue-600 rounded-xl p-4 mt-4"
                          disabled={isGenerating}
                          onPress={() => {
                            handleGeneratePDF("cleaningWithPaymentReceipt");
                            closePdfModal();
                          }}
                        >
                          <Text className="text-white text-center font-semibold">
                            {isGenerating ? "Generujem..." : "Generovať všetky"}
                          </Text>
                        </TouchableOpacity>
                      </ScrollView>
                    )}
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </View>  
      </Modal>
  );
}