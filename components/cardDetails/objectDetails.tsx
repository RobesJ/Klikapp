import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabase";
import { useClientStore } from "@/store/clientStore";
import { useNotificationStore } from "@/store/notificationStore";
import { useObjectStore } from "@/store/objectStore";
import { PDF } from "@/types/generics";
import { ObjectWithRelations } from "@/types/objectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { PDF_Viewer } from "../modals/pdfViewer";
import { NotificationToast } from "../notificationToast";
import { Body, BodyLarge, Caption, Heading3 } from "../typography";

interface ObjectCardDetailsProps {
  objectWithRelations: ObjectWithRelations;
  visible: boolean;
  onClose: () => void;
  onCloseWithUnlock: () => void;
}

export default function ObjectDetails({ objectWithRelations, visible, onClose, onCloseWithUnlock} : ObjectCardDetailsProps) { 
  const router = useRouter();
  const { user } = useAuth();
  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [PDFs, setPDFs] = useState<PDF[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<PDF | null>(null);
  const [showPDFReports, setShowPDFReports] = useState(false);
  // const [uploadingPDF, setUploadingPDF] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [lockedByName, setLockedByName] = useState<string | null>(null);
  const {deleteObject, lockObject } = useObjectStore();
  const {updateClientCounts} = useClientStore();

  useEffect(() => {
    if( objectWithRelations.object){
      fetchPDFs();
    }
  }, [objectWithRelations.object.id]);

  const fetchPDFs = async () => {
    setLoadingPDFs(true);
    try{
        const {data, error} = await supabase
            .from("pdfs")
            .select('*')
            .eq("object_id", objectWithRelations.object.id)
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

  useEffect(() => {
    if (!visible || !objectWithRelations.object || !user) return;
    let active = true;

    (async () => {
      const result = await lockObject(objectWithRelations.object.id, user.id, user.user_metadata.name);
      if (!active) return;

      if(result.success){
        setCanEdit(true);
        console.log("Object lock aquired");
      }
      else{
        setCanEdit(false);
        setLockedByName(result.lockedByName);
        console.log("Object lock not aquired");
      }
    })();
  }, [visible, user?.id, objectWithRelations.object?.id]);


  useEffect(() => {
    if(!canEdit || !visible || !user) return;
    
    const interval = setInterval(() => {
        supabase
          .from('objects')
          .update({ lock_expires_at: new Date(Date.now() + 5 * 60 * 1000) })
          .eq('id', objectWithRelations.object.id)
          .eq('locked_by', user.id);
      }, 120_000);

    return () => clearInterval(interval);
            
  }, [visible, canEdit, user?.id]);
  
  const handleClosePdfViewer = () => {
    setShowPDFReports(false);
    setSelectedPDF(null);
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
              useNotificationStore.getInitialState().addNotification(
                "PDF záznam bol odstránený",
                "success",
                "objectDetails",
                3000
              )
            } catch (error: any) {
              console.error('Error deleting pdf:', error);
              useNotificationStore.getInitialState().addNotification(
                "Nepodarilo sa odstrániť PDF záznam",
                "error",
                "objectDetails",
                4000
              )
            }
          }
        }
      ]
    );
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
            {objectWithRelations.object.city ? (
              <View className='flex-1'>
                <Heading3 className="text-xl font-bold text-dark-text_color">
                  {objectWithRelations.object.streetNumber}
                </Heading3>
                <Heading3 className="text-xl font-bold text-dark-text_color">
                  {objectWithRelations.object.city}
                </Heading3>
              </View>
            ): (
              <Heading3 className="text-xl font-bold text-dark-text_color">
                {objectWithRelations.object.address}
              </Heading3>
            )}
            <TouchableOpacity
              onPress={onCloseWithUnlock}
              className="items-center justify-center"
            >
              <EvilIcons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>
              
        <ScrollView className="max-h-screen-safe-offset-12 p-4">
          <View className="flex-1">
            {!canEdit && <Body style={{color: "#F59E0B"}}>`Tento objekt upravuje používateľ ${lockedByName}`</Body>}
            <NotificationToast
              screen="objectDetails"
            />
            <View className="flex-2 mb-3">
              <Body className="text-gray-400 mb-1">KLIENT</Body>
              <BodyLarge className="font-semibold text-lg text-white">{objectWithRelations.client.name}</BodyLarge>
              <View className="flex-row items-center">
                <MaterialIcons name="phone" size={16} color="#9ca3af"/>
                <Body className="font-medium text-gray-300 ml-2">{objectWithRelations.client.phone}</Body>
              </View>
            </View>
              
            {objectWithRelations.chimneys.length > 0 && (
                <Body className="text-gray-400 mb-1">
                    KOMÍNY ({objectWithRelations.chimneys.length})
                </Body>
            )}

            {objectWithRelations.chimneys.length > 0 && (
                objectWithRelations.chimneys.map(ch => (
                    <View
                        className="flex-row border rounded-lg bg-dark-details-o_p_bg px-4 py-2 mb-2"
                        key={ch.id}
                    >
                        <View className="flex-2 mr-2">
                            <Body className="text-dark-text_color mb-1"> 
                                Typ: 
                            </Body>
                            <Body className="text-dark-text_color mb-1"> 
                                Spotrebič: 
                            </Body>
                            <Body className="text-dark-text_color mb-1"> 
                                Umiestnenie:
                            </Body>
                            {ch.note && (
                              <Body className="text-dark-text_color mb-1"> 
                                  Poznámka: 
                              </Body>
                            )}
                            {PDFs.filter(p => p.chimney_id === ch.id).length > 0 && (
                              <View className="mt-2">
                                <Body className="text-dark-text_color"> 
                                  Záznamy:
                                </Body>
                              </View>
                            )}
                        </View>
                        <View className="flex-2" style={{ flexShrink: 1 }}>
                            <View className="flex-row flex-wrap">
                                <Body className="text-white mr-1 font-semibold mb-1">
                                  {ch.chimney_type?.type} 
                                </Body>
                                <Body className="text-white mr-1 font-semibold">
                                  - 
                                </Body>
                                <Body className="text-white font-semibold"> 
                                  {ch.chimney_type?.labelling}
                                </Body>
                            </View>
                            <Body className="text-white font-semibold mb-1"> 
                                {ch.appliance}
                            </Body>
                          
                            <Body className="text-white font-semibold mb-1"> 
                                {ch.placement}
                            </Body>

                            {ch.note && (
                                <Body 
                                  className="text-white font-semibold mb-1"
                                  numberOfLines={undefined} 
                                  style={{ flexWrap: 'wrap' }}
                                > 
                                    {ch.note} 
                                </Body>
                            )}
                            {PDFs.filter(p => p.chimney_id === ch.id).length > 0 && (
                              <View className="flex-row mt-2 gap-2">
                                {PDFs.filter(p => p.chimney_id === ch.id).slice(0, 6).map((pdf) => (
                                  <View key={pdf.id}>
                                    <View className="flex-1 h-16 w-16">  
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
                              </View>
                            )}
                        </View>
                    </View>
                ))
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
            
          </View>
        </ScrollView>

        <View className="flex-row justify-between px-4 py-6 border-t border-gray-400">
            {/* Object detail card action buttons*/}
            <TouchableOpacity
              onPress={() => {
                  try{
                    onClose();
                    deleteObject(objectWithRelations.object.id);
                    updateClientCounts(objectWithRelations.client.id, 0, -1);
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
                  pathname: "/addObjectScreen",
                  params: { 
                    object: JSON.stringify(objectWithRelations), 
                    mode: "edit",
                    preselectedClientID: objectWithRelations.client.id
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
      </View>
    </View>
    </Modal>
  );
}
