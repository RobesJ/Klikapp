import { useAuth } from '@/context/authContext';
import { useProjectSubmit } from '@/hooks/submitHooks/useProjectSubmit';
import { useHandlePDFs } from '@/hooks/useHandlePDFs';
import { useHandlePhotos } from '@/hooks/useHandlePhotos';
import { supabase } from "@/lib/supabase";
import { useClientStore } from '@/store/clientStore';
import { useNotificationStore } from '@/store/notificationStore';
import { useProjectStore } from "@/store/projectStore";
import { PDF, User } from "@/types/generics";
import { regeneratePDFUtil } from '@/utils/pdfRegeneration';
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { format, parseISO } from 'date-fns';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { ModalSelector, STATE_OPTIONS } from "../badge";
import PdfGenerationModal from '../modals/pdfGenerationModal';
import { PDF_Viewer } from '../modals/pdfViewer';
import { PhotoViewer } from '../modals/photoViewer';
import UserPickerModal from '../modals/userPickerModal';
import { NotificationToast } from '../notificationToast';
import { Body, BodyLarge, BodySmall, Caption, Heading3 } from '../typography';

interface ProjectCardDetailsProps {
    projectWithRelationsID: string;
    visible: boolean;
    onClose: () => void;
    onCloseWithUnlock: () => void;
}

export default function ProjectDetails({ 
    projectWithRelationsID, 
    visible,
    onClose,
    onCloseWithUnlock
}: ProjectCardDetailsProps) {
    
    const { user } = useAuth();
    const projectWithRelations = useProjectStore(state => state.projects.get(projectWithRelationsID));
    const [canEdit, setCanEdit] = useState(false);
    const { handleStateChange: handleStateChangeFromHook } = useProjectSubmit({
      mode: "edit",
      oldState: projectWithRelations?.project.state,
      initialData: projectWithRelations
    });

    const { 
      uploadingPDFs, 
      loadingPDFs, 
      generatingPDFs, 
      selectedPDF, 
      PDFs,   
      setSelectedPDF, 
      handleGeneratePDF,
      deletePdf,
      fetchPDFs,
      setPDFs
    } = useHandlePDFs({ 
      projectWithRelations: projectWithRelations!,
      users: projectWithRelations?.users || []
     });
  
    const { 
      uploadingPhotos, 
      loadingPhotos, 
      photos, 
      setSelectedPhoto,
      selectedPhoto,
      fetchPhotos,
      takePhoto,
      pickFromGallery,
      deletePhoto
    } = useHandlePhotos({ 
      projectWithRelations: projectWithRelations!
    });

    if (!projectWithRelations) {
        return null;
    }

    const router = useRouter();
    const { users } = projectWithRelations;
   
    const [showUserModal, setShowUserModal] = useState(false);
    const [lockedByName, setLockedByName] = useState<string | null>(null);

    const [showGallery, setShowGallery] = useState(false);
    const [showPDFReports, setShowPDFReports] = useState(false);
    const [pdfGenModalVisible, setpdfGenModalVisible] = useState(false);
    const [chimneySums, setChimneySums] = useState<Record<string, string[]>>({});

    const { updateProject, deleteProject, availableUsers, lockProject } = useProjectStore();
    const { updateClientCounts } = useClientStore();
    const projectId = projectWithRelations.project.id;
    const PDFsRef = useRef(PDFs);

    useEffect(() => {
        PDFsRef.current = PDFs;
    }, [PDFs]);

    useEffect(() => {
        fetchPhotos();
        fetchPDFs();
    }, [projectId, fetchPDFs, fetchPhotos]);

    useEffect(() => {
        if(!visible || !projectWithRelations.project.id || !user) return;
        let active = true ;

        (async () => {  
            const result = await lockProject(projectWithRelations.project.id, user.id, user.user_metadata.name);
            if(!active) return;

            if(result.success ){
                setCanEdit(true );
                console.log("Project lock aquired");
            } 
            else{ 
                setCanEdit(false);
                setLockedByName(result.lockedByName);
          }
        })();

        return () => {
            active = false;
        };
    }, [visible, user?.id, projectWithRelations.project.id, lockProject]);

    useEffect(() => {
        if(!canEdit || !visible ||  !user) return;

        const interval = setInterval(async () => {
            try {
                const { error } = await supabase
                    .from("projects")
                    .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
                    .eq('id', projectWithRelations.project.id)
                    .eq('locked_by', user.id);
              
                if (error) {
                    console.error('Failed to renew lock:', error);
                    useNotificationStore.getState().addNotification(
                        "Nepodarilo sa obnoviť zámok projektu",
                        "warning",
                        "projectDetails",
                        3000
                    );
                }
            }
            catch (error: any){
                console.error("Lock renewal error:", error);
            }
        }, 120_000);

        return () => clearInterval(interval);
    }, [visible, user?.id, canEdit, projectWithRelations.project.id]);

    // Handle state change with auto-completion
    const handleStateChange = async (newState: string) => {
        await handleStateChangeFromHook(newState, projectWithRelations.project.state);
    };

    const handleAddUser = useCallback(async (user: User) => {
        // Check if already assigned
        if (users.some(u => u.id === user.id)) {
            useNotificationStore.getState().addNotification(
                "Tento používateľ je už priradený",
                "error",
                "projectDetails",
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

          // Update store
          updateProject(
              projectWithRelations.project.id, 
              {
                  project: projectWithRelations.project,
                  client: projectWithRelations.client,
                  users: updatedUsers,
                  objects: projectWithRelations.objects
              }, 
              false);

          setShowUserModal(false);
          useNotificationStore.getState().addNotification(
              `${user.name} bol priradený k projektu`,
              "success",
              "projectDetails",
              3000
          );
      } 
      catch (error: any) {
          console.error('Error adding user:', error);
          useNotificationStore.getState().addNotification(
              "Nepodarilo sa priradiť používateľa",
              "error",
              "projectDetails",
              4000
          );
      }
    }, [users, projectWithRelations.project.id, updateProject]);

    const handleRemoveUser = useCallback(async (userId: string) => {
        try {
            const { error } = await supabase
                .from("project_assignments")
                .delete()
                .eq("project_id", projectWithRelations.project.id)
                .eq("user_id", userId);
          
            if (error) throw error;
          
            // Update local state
            const updatedUsers = users.filter(u => u.id !== userId);

            // Update store
            updateProject(
                projectWithRelations.project.id, 
                {
                  project: projectWithRelations.project,
                  client: projectWithRelations.client,
                  users: updatedUsers,
                  objects: projectWithRelations.objects 
                },
                false);
          
        } 
        catch (error: any) {
            console.error('Error removing user:', error);
            useNotificationStore.getState().addNotification(
                "Nepodarilo sa odstrániť používateľa z projektu",
                "error",
                "projectDetails",
                4000
            );
        }
    }, [users, projectWithRelations, updateProject]);
  
    const toggleUserAssign = async (userId: string) => {
        const exists = users.some(u => u.id === userId);
      
        if (!exists) {
            await handleAddUser(availableUsers.find((u) => u.id === userId)!);
        } else {
            await handleRemoveUser(userId);
        }
    };

    const handlePressGeneratePDF = () => {
        if(projectWithRelations.project.type === "Čistenie"){
            setpdfGenModalVisible(true);
        }
        else{
            handleGeneratePDF("inspection");
        }
    };

    const closePdfModal = () => {
        setpdfGenModalVisible(false);
        setChimneySums({});
    };

    const handleCloseViewer = () => {
        setShowPDFReports(false);
        setShowGallery(false);
        setSelectedPDF(null);
        setSelectedPhoto(null);
        setChimneySums({});
    };

    const handlePdfGenerationWithClose = useCallback((type: "cleaningWithPaymentReceipt" | "cleaning", chimneyId?: string) => {
        console.log("Called generation wiht chimney sums:", chimneySums);
        if (type ==="cleaningWithPaymentReceipt") {
            handleGeneratePDF(type, chimneySums);
            if(chimneyId){
                handleGeneratePDF(type, chimneySums, chimneyId);
            }
        }
        else {
            handleGeneratePDF(type);
        }
        handleCloseViewer();
    }, [chimneySums]);

    const handleRegeneratePDF = async (pdf: PDF) => {
        try {
            const newPDF = await regeneratePDFUtil(pdf);
            
            // Update PDFs list
            setPDFs(prev => {
                const filtered = prev.filter(p => p.id !== pdf.id);
                return [newPDF, ...filtered];
            });
            
            handleCloseViewer();
            useNotificationStore.getState().addNotification(
                "PDF bol úspešne regenerovaný",
                "success",
                "objectDetails",
                3000
            );
        }
        catch (error) {
            useNotificationStore.getState().addNotification(
                "Nepodarilo sa regenerovať PDF",
                "error",
                "objectDetails",
                4000
            );
        }
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
                  <Heading3 className="text-xl font-bold text-dark-text_color">
                    {projectWithRelations.project.type}
                  </Heading3>

                  <TouchableOpacity
                    onPress={onCloseWithUnlock}
                    className="items-center justify-center"
                  >
                    <EvilIcons name="close" size={28} color="white" />
                  </TouchableOpacity>

                </View>
              </View>

              {/* Project data*/}
              <ScrollView className="max-h-screen-safe-offset-12 p-4">
                <ScrollView className="flex-1">
                  {!canEdit && <Body style={{color: "#F59E0B"}}>Tento projekt upravuje používateľ {lockedByName}</Body>}
                  <NotificationToast
                    screen="projectDetails"
                  />
                  <View className='flex-row justify-between'>
                    {/* Client Info */}
                    <View className="flex-2 mb-3">
                    <Body className="text-gray-400 mb-1">KLIENT</Body>
                      <BodyLarge className="font-semibold text-lg text-white">{projectWithRelations.client.name}</BodyLarge>
                      <View className="flex-row items-center">
                        <MaterialIcons name="phone" size={16} color="#9ca3af"/>
                        <Body className="font-medium text-gray-300 ml-2">{projectWithRelations.client.phone}</Body>
                      </View>
                    </View>

                    {/* State field*/}
                    <View className="flex-2">
                    <ModalSelector
                      options={STATE_OPTIONS}
                      selectedValue={projectWithRelations.project.state}
                      onSelect={(newState) => handleStateChange(newState)}
                      label="Stav: "
                      inDetailsModal={true}
                    />
                    </View>
                  </View>

                  {/* Dates */}
                  <View className='flex-2 mb-3'>
                  <Body className="text-gray-400 mb-1">TERMÍN</Body>
                  {projectWithRelations.project.scheduled_date && (projectWithRelations.project.state === "Nový") && (
                    <View className="flex-row">
                      <Body className="mr-2 text-dark-text_color">Plánované na:</Body>
                      <Body className="font-semibold text-dark-text_color">
                        {format(projectWithRelations.project.scheduled_date, "dd.MM.yyyy")}
                      </Body>
                    </View>
                  )}

                  {projectWithRelations.project.start_date && (projectWithRelations.project.state !== "Nový") && (projectWithRelations.project.state !== "Ukončený") && (projectWithRelations.project.state !== "Zrušený") && (
                    <View className="flex-row">
                      <Body className="mr-2 text-dark-text_color">Začiatok:</Body>
                      <Body className="font-semibold text-dark-text_color">
                        {format(projectWithRelations.project.start_date, "dd.MM.yyyy")}
                      </Body>
                    </View>
                  )}

                  {projectWithRelations.project.completion_date && ((projectWithRelations.project.state === "Ukončený") || (projectWithRelations.project.state === "Zrušený")) &&(
                    <View className="flex-row">
                      <Body className="mr-2 text-dark-text_color">Ukončenie:</Body>
                      <Body className="font-semibold text-dark-text_color">
                        {format(projectWithRelations.project.completion_date, "dd.MM.yyyy")}
                      </Body>
                    </View>
                  )}
                  </View>
                
                  {/* Note */}
                  {projectWithRelations.project.note && (
                    <View className="mb-3">
                      <Body className="text-dark-text_color">Poznámka:</Body>
                      <Body className="font-semibold text-dark-text_color mt-1">
                        {projectWithRelations.project.note}
                      </Body>
                    </View>
                  )}

                  {/* Assigned Users */}
                  <View className="mb-3">
                    <View className="flex-row items-center justify-between mb-2">
                    <Body className="text-gray-400 mt-2">PRIRADENǏ POUŽÍVATELIA</Body>
                      <TouchableOpacity
                        onPress={() => setShowUserModal(true)}
                        className="bg-gray-500 w-8 h-8 rounded-full items-center justify-center"
                      >
                        <BodyLarge className="text-white font-bold text-lg">+</BodyLarge>
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
                              <Body className="text-white font-semibold">{user.name}</Body>
                              {user.email && (
                                <BodySmall className="text-gray-400 text-sm">{user.email}</BodySmall>
                              )}
                            </View>
                            {canEdit && (
                              <TouchableOpacity
                              onPress={() => handleRemoveUser(user.id)}
                              className="w-8 h-8 bg-red-600 rounded-full items-center justify-center"
                            >
                              <Body className="text-white font-bold">✕</Body>
                            </TouchableOpacity>
                            )}          
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Body className="text-gray-400">Žiadni priradení používatelia</Body>
                    )}
                  </View>
                  
                  {/* Objects */}
                  {projectWithRelations.objects.length > 0 && (
                    <View className="mb-3">
                      <Body className="text-gray-400 mb-2">OBJEKTY ({projectWithRelations.objects.length}) </Body>
                      {projectWithRelations.objects.map((o) => (
                        <View key={o.object.id} className="bg-dark-details-o_p_bg rounded-xl p-3 mb-2">
                          <Body className="text-white font-semibold">{o.object.address}</Body>
                          <BodySmall className="text-gray-400 text-sm">
                            {o.chimneys.length} komínov
                          </BodySmall>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Photos Section */}
                  <View className="mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                          <Body className="text-gray-400 mb-2"> FOTOGRAFIE ({photos.length})</Body>
                          <View className="flex-row items-center justify-between gap-2">
                              <TouchableOpacity
                                  onPress={pickFromGallery}
                                  disabled={uploadingPhotos}
                                  className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg"
                              >
                                {uploadingPhotos ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                  <>
                                    <Body className="text-white font-semibold">+</Body>
                                    <Body className="text-white font-semibold">Pridať</Body>
                                  </>
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity
                                  onPress={takePhoto}
                                  disabled={uploadingPhotos}
                                  className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg"
                              >
                                {uploadingPhotos ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Feather name="camera" size={16} color="white" />
                                )}
                              </TouchableOpacity>
                              
                          </View>
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
                              <Body className="text-white font-bold">+{photos.length - 6}</Body>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                  </View>
                    
                  {/* PDFs Section */}
                  {projectWithRelations.project.type !== "Obhliadka" && projectWithRelations.objects.length > 0 && users.length > 0 && (
                  <View className="mb-3">
                      <View className="flex-row items-center justify-between mb-2">
                        <Body className="text-gray-400 mb-2"> PDF ZÁZNAMY ({PDFs.length})</Body>
                        <TouchableOpacity
                            onPress={handlePressGeneratePDF}
                            disabled={generatingPDFs}
                            className="flex-row gap-2 bg-gray-500 py-2 px-4 rounded-lg"
                        >
                            {uploadingPDFs ? (
                              <ActivityIndicator size="small" color="white" />
                            ) : (
                              <View className='flex-row'>
                                <MaterialIcons name="picture-as-pdf" size={16} color="white"/>
                                <Body className="text-white font-semibold ml-2">{generatingPDFs? 'Generujem...' : 'Generovať'}</Body>
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
                              <Caption className="text-white font-semibold text-xs">{pdf.report_type === "inspection" ? "Revízia" : "Čistenie"}</Caption>
                              <Caption className="text-white font-semibold text-xs">{parseISO(pdf.generated_at).toLocaleDateString('sk-SK')} </Caption>
                            </TouchableOpacity>
                            </View>
                            </View>
                          ))}

                          {PDFs.length > 6 && (
                            <TouchableOpacity
                              onPress={() => setShowPDFReports(true)}
                              className="w-20 h-20 rounded-lg bg-gray-700 items-center justify-center"
                            >
                              <Body className="text-white font-bold">+{PDFs.length - 6}</Body>
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
                          onClose();
                          deleteProject(projectWithRelations.project.id);
                          updateClientCounts(projectWithRelations.client.id, -1, 0);
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
                    <Body className='text-white'>Odstrániť</Body>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      router.push({
                        pathname: "/addProjectScreen",
                        params: { 
                          project: JSON.stringify(projectWithRelations), 
                          mode: "edit"
                        }
                      });
                    }}
                    activeOpacity={0.8}
                    className="flex-row gap-1 bg-green-700 rounded-full items-center justify-center px-4 py-2"
                    disabled={!canEdit}
                  >
                    <Feather name="edit-2" size={16} color="white" />
                    <Body className='text-white'>Upraviť</Body>
                  </TouchableOpacity>

                </View>
              </ScrollView>

              <UserPickerModal
                visible={showUserModal}
                onClose={() => setShowUserModal(false)}
                selectedUsers={users.map(u => u.id)}
                onToggle={toggleUserAssign}
              />

              {/* Photo Viewer Modal */}
              {selectedPhoto && (
                <PhotoViewer
                  visible={showGallery}
                  onClose={() => handleCloseViewer()}
                  selectedPhoto={selectedPhoto}
                  photos={photos}
                  onDelete={() => deletePhoto(selectedPhoto)}
                  canEdit={canEdit}
                />
              )}

              {/* PDF Viewer Modal */}
              {selectedPDF && (
                <PDF_Viewer
                  uri={selectedPDF.storage_path}
                  visible={showPDFReports}
                  onClose={() => handleCloseViewer()}
                  selectedPDF={selectedPDF}
                  onDelete={() => deletePdf(selectedPDF)}
                  regeneratePDF={() => handleRegeneratePDF(selectedPDF)}
                />
              )}

              {/* PDF Generation Cleaning Modal */} 
              <PdfGenerationModal
                visible={pdfGenModalVisible}
                onCloseSimple={closePdfModal}
                projectWithRelations={projectWithRelations}
                handlePdfGeneration={handlePdfGenerationWithClose}
                chimneySums={chimneySums}
                setChimneySums={setChimneySums}
              />
            </View>
          </View>  
        </Modal>
      );
}