import { supabase } from "@/lib/supabase";
import { useProjectStore } from "@/store/projectStore";
import { Client, Project, User } from "@/types/generics";
import { ObjectWithRelations, Photo } from "@/types/projectSpecific";
import { EvilIcons, Feather, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Image, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

interface ProjectCardDetailsProps {
  project: Project;
  client: Client;
  assignedUsers: User[];
  objects: ObjectWithRelations[];
}

const STATE_OPTIONS = [
  {
    value: "Nový",
    colors: ["text-dark-project-state-novy", "border-2 border-dark-project-state-novy"],
  },
  {
    value: "Naplánovaný",
    colors: ["text-dark-project-state-novy", "border-2 border-dark-project-state-novy"],
  },
  {
    value: "Aktívny", 
    colors: ["text-dark-project-state-aktivny","border-2 border-dark-project-state-aktivny"],
  },
  {
    value: "Prebieha", 
    colors: ["text-dark-project-state-prebieha","border-2 border-dark-project-state-prebieha"],
  },
  {
    value: "Pozastavený", 
    colors: ["text-dark-project-state-pozastaveny","border-2 border-dark-project-state-pozastaveny"],
  },
  {
    value: "Ukončený", 
    colors: ["text-dark-project-state-ukonceny","border-2 border-dark-project-state-ukonceny"]
  },
  {
    value: "Zrušený", 
    colors: ["text-dark-project-state-zruseny","border-2 border-dark-project-state-zruseny"]
  }
];

export default function ProjectDetails({ 
  project, 
  client, 
  assignedUsers, 
  objects 
}: ProjectCardDetailsProps) {
  const { updateProject } = useProjectStore();
  const [currentState, setCurrentState] = useState(project.state);
  const [users, setUsers] = useState<User[]>(assignedUsers);
  const [showUserModal, setShowUserModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [updatingState, setUpdatingState] = useState(false);

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetchPhotos();
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
  }

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
  }

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
  }

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

  // Delete photo
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
          completion_date: completionDate 
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
        project: { ...project, state: newState, completion_date: completionDate },
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

  // Search for users
  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setAvailableUsers([]);
      return;
    }

    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error: any) {
      console.error("Error searching users:", error.message);
      setAvailableUsers([]);
    } finally {
      setLoadingUsers(false);
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
      setSearchQuery('');
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

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    searchUsers(text);
  };

  const goToNextPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const nextIndex = (currentIndex + 1) % photos.length; // Loop back to start
    setSelectedPhoto(photos[nextIndex]);
  };
  
  const goToPreviousPhoto = () => {
    if (!selectedPhoto) return;
    const currentIndex = photos.findIndex(p => p.id === selectedPhoto.id);
    const previousIndex = currentIndex === 0 ? photos.length - 1 : currentIndex - 1; // Loop to end
    setSelectedPhoto(photos[previousIndex]);
  };
  
  return (
    <ScrollView className="flex-1">
      {/* Client Info */}
      {client?.name && (
        <View className="flex-row mt-1">
          <Text className="mr-2 text-dark-text_color">Klient:</Text>
          <Text className="font-semibold text-dark-text_color">{client.name}</Text>
        </View>
      )}

      {/* State Selection */}
      <View className="mt-4">
        <Text className="mb-2 text-dark-text_color font-semibold">Stav projektu:</Text>
        <View className="flex-row gap-2">
          {STATE_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => handleStateChange(option.value)}
              disabled={updatingState}
              className={`flex-1 py-3 rounded-xl items-center ${
                currentState === option.value
                  ? `${option.colors[1]}`
                  : 'bg-gray-700'
              }`}
            >
              <Text
                className={`font-semibold ${
                  currentState === option.value ? `${option.colors[0]}` : 'text-white'
                }`}
              >
                {option.value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Dates */}
      {project.scheduled_date && (
        <View className="flex-row mt-3">
          <Text className="mr-2 text-dark-text_color">Plánované na:</Text>
          <Text className="font-semibold text-dark-text_color">
            {project.scheduled_date}
          </Text>
        </View>
      )}

      {project.start_date && (
        <View className="flex-row mt-1">
          <Text className="mr-2 text-dark-text_color">Začiatok:</Text>
          <Text className="font-semibold text-dark-text_color">
            {project.start_date}
          </Text>
        </View>
      )}

      {project.completion_date && (
        <View className="flex-row mt-1">
          <Text className="mr-2 text-dark-text_color">Ukončenie:</Text>
          <Text className="font-semibold text-dark-text_color">
            {project.completion_date}
          </Text>
        </View>
      )}

      {/* Assigned Users */}
      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-dark-text_color font-semibold">
            Priradení používatelia:
          </Text>
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

      {/* Note */}
      {project.note && (
        <View className="mt-3">
          <Text className="text-dark-text_color">Poznámka:</Text>
          <Text className="font-semibold text-dark-text_color mt-1">
            {project.note}
          </Text>
        </View>
      )}

      {/* Objects */}
      {objects.length > 0 && (
        <View className="mt-4">
          <Text className="text-dark-text_color font-semibold mb-2">
            Objekty: {objects.length}
          </Text>
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
      <View className="mt-4 pb-8">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-dark-text_color font-semibold">
              Fotografie: ({photos.length})
            </Text>
            <TouchableOpacity
                onPress={takePhoto}
                disabled={uploadingPhotos}
                className="bg-blue-600 rounded-full px-4 py-2 flex-row items-center"
            >
                {uploadingPhotos ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="camera" size={18} color="white" />
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
            <View className="flex-row flex-wrap gap-2 mt-2">
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

      {/* User Assignment Modal */}
      <Modal
        visible={showUserModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUserModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View 
            className="rounded-t-3xl h-3/4"
            style={{ backgroundColor: '#1e293b' }}
          >
            <View 
              className="p-6 border-b border-gray-700"
              style={{ backgroundColor: '#0f172a' }}
            >
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-xl font-bold text-white">
                    Priradiť používateľa
                  </Text>
                  <Text className="text-sm text-gray-400">
                    Vyhľadajte používateľa na priradenie
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setShowUserModal(false);
                    setSearchQuery('');
                    setAvailableUsers([]);
                  }}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#334155' }}
                >
                  <EvilIcons name="close" size={28} color="white" />
                </TouchableOpacity>
              </View>

              <TextInput
                placeholder="Vyhľadať používateľa..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={handleSearchChange}
                className="bg-gray-700 text-white rounded-xl p-4"
                autoFocus
              />
            </View>

            {loadingUsers ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-400">Vyhľadávám...</Text>
              </View>
            ) : searchQuery.length < 2 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-6xl mb-4">🔍</Text>
                <Text className="text-gray-400">Zadajte aspoň 2 znaky</Text>
              </View>
            ) : availableUsers.length === 0 ? (
              <View className="flex-1 items-center justify-center">
                <Text className="text-gray-400">Žiadni používatelia neboli nájdení</Text>
              </View>
            ) : (
              <FlatList
                data={availableUsers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const isAssigned = users.some(u => u.id === item.id);
                  return (
                    <TouchableOpacity
                      onPress={() => handleAddUser(item)}
                      disabled={isAssigned}
                      className={`px-6 py-4 border-b border-gray-700 ${
                        isAssigned ? 'opacity-50' : ''
                      }`}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-semibold text-white">
                            {item.name}
                          </Text>
                          {item.email && (
                            <Text className="text-sm text-gray-400 mt-1">
                              {item.email}
                            </Text>
                          )}
                        </View>
                        {isAssigned && (
                          <View className="bg-green-600 rounded-full px-3 py-1">
                            <Text className="text-white text-xs font-semibold">
                              Priradený
                            </Text>
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
      
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
    </ScrollView>
  );
}