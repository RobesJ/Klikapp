import { supabase } from "@/lib/supabase";
import { useObjectStore } from "@/store/objectStore";
import { Client, PDF } from "@/types/generics";
import { Chimney, Object } from "@/types/objectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import WebView from "react-native-webview";

interface ObjectCardDetailsProps {
  object: Object;
  client: Client;
  chimneys: Chimney[];
  visible: boolean;
  onClose: () => void;
}

export default function ObjectDetails({ object, chimneys, client, visible, onClose } : ObjectCardDetailsProps) { 

  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [PDFs, setPDFs] = useState<PDF[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<PDF | null>(null);
  const [showPDFReports, setShowPDFReports] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const router = useRouter();
  const {deleteObject} = useObjectStore();

  useEffect(() => {
    fetchPDFs();
  }, [object.id]);

  const fetchPDFs = async () => {
    setLoadingPDFs(true);
    try{
        const {data, error} = await supabase
            .from("pdfs")
            .select('*')
            .eq("object_id", object.id)
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
  
  /*
  const handleGeneratePDF = async (pdf: PDF, type: "cleaning" | "inspection" | "cleaningWithPaymentReceipt") => {
    try {
      //setIsGenerating(true);
      const {data: projectData, error: projectError} = await supabase
        .from("projects")
        .select()
        .eq("id", pdf.project_id)
        .single();

      if (projectError) throw projectError;
      
      const watermarkBase64 = await getWatermarkBase64();
      const footerBase64 = await getFooterImageBase64();
  
     
      if (type === "cleaningWithPaymentReceipt") {
        console.log("inside of this condition");
  
        try {
          const uri = await generateRecord(
            projectData,
            users[0],
            client,
            object,
            chimney,
            watermarkBase64,
            footerBase64,
            type,
            sums
          
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
  
      else {
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
      Alert.alert("Úspech", "PDF dokumenty boli vygenerované");
  
    } catch (error) {
      console.error("handleGeneratePDF failed:", error);
      Alert.alert("Chyba", "Nepodarilo sa vygenerovať PDF");
    } finally {
      setIsGenerating(false);
    }
  };


  const regeneratePDF = async (pdf: PDF, report_type: string, object_id: string, chimney: Chimney, sums: string[] | null) => {
    const parts = pdf.storage_path.split("pdf-reports/");
    const filename = parts[1];
    setUploadingPDF(true);
    try{
      // Delete old version from storage
      const { error: storageError } = await supabase.storage
          .from("pdf-reports")
          .remove([filename]);

      if (storageError) throw storageError;
    }
    catch(err: any){
      console.error("Error deleting object from storage: ", err);
    }
         
    
    try {
      let filename;
      if(report_type === "cleaning" ||  report_type === "cleaningWithPaymentReceipt"){
        filename =`cleaning_${chimney.id}_${pdf.project_id}.pdf`;
      }
      else{
        filename =`inspection_${chimney.id}_${pdf.project_id}.pdf`;
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
      if( sums !== null){
        const { data: pdfData, error: dbError } = await supabase
          .from("pdfs")
          .update({
            project_id: pdf.project_id,
            object_id: pdf.object_id,
            chimney_id: pdf.chimney_id,
            report_type: pdf.report_type,
            file_name: filename,
            file_size: blob.size,
            file_type: blob.type.toString(),
            storage_path: urlData.publicUrl,
            amount: sums[0],
            amountByWords: sums[1]
          })
          .select();

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
      Alert.alert('Úspech', 'PDF záznam bol pridaný');
    } 
    catch (error: any) {
      console.error('Error uploading pdf', error);
      Alert.alert('Chyba', 'Nepodarilo sa nahrať PDF');
    } 
    finally {
      setUploadingPDF(false);
    }
  };
  */
 
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
            {object.city ? (
              <View className='flex-1'>
                <Text className="text-xl font-bold text-dark-text_color">
                  {object.streetNumber}
                </Text>
                <Text className="text-xl font-bold text-dark-text_color">
                  {object.city}
                </Text>
              </View>
            ): (
              <Text className="text-xl font-bold text-dark-text_color">
                {object.address}
              </Text>
            )}
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 bg-gray-600 rounded-full items-center justify-center"
            >
              <EvilIcons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
              
        <ScrollView className="max-h-screen-safe-offset-12 p-4">
      <View className="flex-1">
          
          <View className="flex-2 mb-3">
            <Text className="text-gray-400 mb-1">KLIENT</Text>
            <Text className="font-semibold text-lg text-white">{client.name}</Text>
            <View className="flex-row items-center">
              <MaterialIcons name="phone" size={16} color="#9ca3af"/>
              <Text className="font-medium text-gray-300 ml-2">{client.phone}</Text>
            </View>
          </View>
              
          {chimneys.length > 0 && (
              <Text className="text-gray-400 mb-1">
                  KOMÍNY ({chimneys.length})
              </Text>
          )}
          {chimneys.length > 0 && (
              chimneys.map(ch => (
                  <View
                      className="flex-row border rounded-lg bg-dark-details-o_p_bg px-4 py-2 mb-2"
                      key={ch.id}
                  >
                      <View className="flex-2 mr-2">
                          <Text className="text-dark-text_color"> 
                              Typ: 
                          </Text>
                          <Text className="text-dark-text_color"> 
                              Spotrebič: 
                          </Text>
                          <Text className="text-dark-text_color"> 
                              Umiestnenie:
                          </Text>
                          {ch.note && (
                            <Text className="text-dark-text_color"> 
                                Poznámka: 
                            </Text>
                          )}
                          {PDFs.filter(p => p.chimney_id === ch.id).length > 0 && (
                            <View className="mt-2">
                              <Text className="text-dark-text_color"> 
                                Záznamy:
                              </Text>
                            </View>
                          )}
                      </View>
                      <View className="flex-2" style={{ flexShrink: 1 }}>
                          <View className="flex-row flex-wrap">
                              <Text className="text-white mr-1 font-semibold">
                                {ch.chimney_type?.type} 
                              </Text>
                              <Text className="text-white mr-1 font-semibold">
                                - 
                              </Text>
                              <Text className="text-white font-semibold"> 
                                {ch.chimney_type?.labelling}
                              </Text>
                          </View>
                          <Text className="text-white font-semibold"> 
                              {ch.appliance}
                          </Text>
                  
                          <Text className="text-white font-semibold"> 
                              {ch.placement}
                          </Text>
                          
                          {ch.note && (
                              <Text 
                                className="text-white font-semibold"
                                numberOfLines={undefined} 
                                style={{ flexWrap: 'wrap' }}
                              > 
                                  {ch.note} 
                              </Text>
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
                                      <Text className="text-white font-semibold text-xs">{pdf.report_type === "inspection" ? "Revízia" : "Čistenie"}</Text>
                                      <Text className="text-white font-semibold text-xs">{parseISO(pdf.generated_at).toLocaleDateString('sk-SK')} </Text>
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
                      {selectedPDF.report_type === "cleaning" ? "Čistenie" : "Revizna sprava"}
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
                    justifyContent: 'center',
                    width: "100%"      
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
                    <MaterialIcons name="refresh" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Vytvorit novu verziu</Text>
                  </TouchableOpacity>
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
      </View>
      </ScrollView>

      <View className="flex-row justify-between px-4 py-6 border-t border-gray-400">
          
          {/* Object detail card action buttons*/}
          <TouchableOpacity
              onPress={() => {
                  try{
                    deleteObject(object.id);
                    onClose;
                  }
                  catch (error){
                    console.error("Delete failed:", error);
                  }
              }}
              activeOpacity={0.8}
              className="flex-row gap-1 bg-red-700 rounded-full items-center justify-center pl-3 py-2 pr-4"
          >
            <EvilIcons name="trash" size={24} color="white" />
            <Text className='text-white'>Odstrániť</Text>
          </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                onClose;
                router.push({
                  pathname: "/addObjectScreen",
                  params: { 
                    object: JSON.stringify(object), 
                    mode: "edit",
                    preselectedClient: JSON.stringify(client)
                  }
                });
              }}
              activeOpacity={0.8}
              className="flex-row gap-1 bg-green-700 rounded-full items-center justify-center px-4 py-2"
          >
            <Feather name="edit-2" size={16} color="white" />
            <Text className='text-white'>Upraviť</Text>
          </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
  );
}