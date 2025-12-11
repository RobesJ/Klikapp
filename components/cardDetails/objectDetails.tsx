import { supabase } from "@/lib/supabase";
import { Client, PDF } from "@/types/generics";
import { Chimney, Object } from "@/types/objectSpecific";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Text, TouchableOpacity, View } from "react-native";
import WebView from "react-native-webview";


interface ObjectCardDetailsProps {
  object: Object;
  client: Client;
  chimneys: Chimney[];
}

export default function ObjectDetails({ object, chimneys, client } : ObjectCardDetailsProps) { 

  const [loadingPDFs, setLoadingPDFs] = useState(false);
  const [PDFs, setPDFs] = useState<PDF[]>([]);
  const [selectedPDF, setSelectedPDF] = useState<PDF | null>(null);
  const [showPDFReports, setShowPDFReports] = useState(false);

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


  return (
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
  );
}
