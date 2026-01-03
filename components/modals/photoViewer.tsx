import { Photo } from "@/types/projectSpecific";
import { EvilIcons, MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Image, Modal, TouchableOpacity, View } from "react-native";
import { Body, Heading3 } from "../typography";

interface PhotoViewerProps {
    visible: boolean;
    onClose: () => void;
    selectedPhoto: Photo;
    photos: Photo[];
    onDelete: (photo: Photo) => void;
    canEdit: boolean;
}

export const PhotoViewer = ({ visible, onClose, selectedPhoto, onDelete, canEdit, photos } : PhotoViewerProps ) => {
    const [selectedPhotoLocal, setSelectedPhotoLocal] = useState(selectedPhoto);

    const goToNextPhoto = () => {
        if (!selectedPhotoLocal) return;
        const currentIndex = photos.findIndex(p => p.id === selectedPhotoLocal.id);
        const nextIndex = (currentIndex + 1) % photos.length;
        setSelectedPhotoLocal(photos[nextIndex]);
      };
      
      const goToPreviousPhoto = () => {
        if (!selectedPhotoLocal) return;
        const currentIndex = photos.findIndex(p => p.id === selectedPhotoLocal.id);
        const previousIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1;
        setSelectedPhotoLocal(photos[previousIndex]);
      };

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View className="pt-12 pb-4 px-6 border-b border-gray-700 bg-dark-bg">
                <View className="flex-row items-center justify-between">
                  <Heading3 className="text-xl font-bold text-white">
                    Fotografie ({photos.length})
                  </Heading3>
                  <TouchableOpacity
                    onPress={onClose}
                    className="items-center justify-center"
                  >
                    <EvilIcons name="close" size={28} color="white" />
                  </TouchableOpacity>
                </View>
            </View>
                    
            <View className="flex-1">
              <Image
                source={{ uri: selectedPhotoLocal.storage_path }}
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
                      onPress={() => onDelete(selectedPhotoLocal)}
                      className="bg-red-600 rounded-xl px-6 py-3 flex-row items-center"
                    >
                      <MaterialIcons name="delete" size={20} color="white" />
                      <Body className="text-white font-semibold ml-2">Odstrániť</Body>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
        </Modal>
    );
}