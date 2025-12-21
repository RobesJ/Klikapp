import { PDF } from '@/types/generics';
import { EvilIcons, MaterialIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';

interface PDFViewerProps {
  uri: string;
  visible: boolean;
  onClose: () => void;
  selectedPDF: PDF
  onDelete: (pdf: PDF) => void;
}

export const PDF_Viewer = ({ uri, visible, onClose, selectedPDF, onDelete }: PDFViewerProps) => {
  const [shouldRenderWebView, setShouldRenderVebView] = useState(false);
  const pdfUrl = `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(uri)}`;
  
  useEffect(() => {
    if (visible){
        const timer = setTimeout(() => {
            setShouldRenderVebView(true);
        }, 300);
        return () => clearTimeout(timer);
    }
    else {
        setShouldRenderVebView(false);
    }
  }, [visible]);

  return (
    <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        onRequestClose={onClose}
    >
        <View className="flex-1 bg-dark-bg">
            {/* Header */}
            <View className="pt-12 pb-4 px-6 border-b border-gray-700 bg-dark-bg">
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
                  onPress={() => onClose()}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#334155' }}
                >
                  <EvilIcons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className='flex-1'>
                {shouldRenderWebView && (
                    <WebView
                      source={{ uri: pdfUrl }}
                      className="w-full"
                      startInLoadingState
                      scalesPageToFit={true}
                      bounces={false}
                    />
                )}
            </View>

            {/* Bottom Actions */}
            <View className="absolute bottom-0 left-0 right-0 p-6 bg-dark-bg border-t border-gray-700">
                <View className="flex-row justify-around">

                  <TouchableOpacity
                    onPress={() => onDelete(selectedPDF)}
                    className="bg-red-600 rounded-xl px-6 py-3 flex-row items-center flex-1 ml-2"
                  >
                    <MaterialIcons name="delete" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">Odstrániť</Text>
                  </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>

  );
};


/* arrows for navigation - could be used later
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
  )
    */