import { Feather } from '@expo/vector-icons';
import { useEffect, useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";

interface FilterOption {
  value: string;
  label: string;
  color: string;
  checkColor: string;
}

interface FilterSection {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClearSection: () => void;
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  sections: FilterSection[];
  onClearAll: () => void;
  totalFiltersCount: number;
}

export default function FilterModal({
  visible,
  onClose,
  sections,
  onClearAll,
  totalFiltersCount
}: FilterModalProps) {
  const firstSectionTitle = sections[0]?.title || null;
  const [expandedSection, setExpandedSection] = useState<string | null>(firstSectionTitle);

  useEffect(() => {
    if (visible) {
      setExpandedSection(firstSectionTitle);
    }
  }, [visible, firstSectionTitle]);

  const toggleSection = (title: string) => {
    setExpandedSection(expandedSection === title ? null : title);
  };

  const isSelected = (value: string, selectedValues: string[]) => 
    selectedValues.includes(value);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View 
          className="rounded-t-3xl max-h-[85%]"
          style={{ backgroundColor: '#1e293b' }}
        >
          {/* Header */}
          <View 
            className="px-6 py-4 border-b border-gray-700"
            style={{ backgroundColor: '#0f172a' }}
          >
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-2xl font-bold text-white">Filtre</Text>
                {totalFiltersCount > 0 && (
                  <Text className="text-sm text-gray-400 mt-1">
                    {totalFiltersCount} aktívnych filtrov
                  </Text>
                )}
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: '#334155' }}
              >
                <Text className="text-white text-xl">✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Filter Sections */}
          <ScrollView className="flex-1">
            {sections.map((section) => (
              <View key={section.title} className="border-b border-gray-700">
                {/* Section Header */}
                <TouchableOpacity
                  onPress={() => toggleSection(section.title)}
                  className="px-6 py-4 flex-row items-center justify-between"
                  style={{ backgroundColor: '#1e293b' }}
                >
                  <View className="flex-row items-center">
                    <Text className="text-lg font-semibold text-white">
                      {section.title}
                    </Text>
                    {section.selectedValues.length > 0 && (
                      <View className="ml-3 bg-blue-600 rounded-full w-6 h-6 items-center justify-center">
                        <Text className="text-white text-xs font-bold">
                          {section.selectedValues.length}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Feather 
                    name={expandedSection === section.title ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#9CA3AF" 
                  />
                </TouchableOpacity>

                {/* Section Content */}
                {expandedSection === section.title && (
                  <View className="px-4 py-3 bg-gray-800">
                    {section.options.map((option) => {
                      const selected = isSelected(option.value, section.selectedValues);
                      return (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => section.onToggle(option.value)}
                          className={`rounded-xl p-4 mb-2 border-2 ${
                            selected ? 'border-blue-500 bg-blue-900/30' : 'border-gray-700 bg-gray-700'
                          }`}
                        >
                          <View className="flex-row justify-between items-center">
                            <Text className="text-base font-medium text-white">
                              {option.label}
                            </Text>
                            <View
                              className={`w-6 h-6 rounded-md items-center justify-center ${
                                selected
                                  ? 'bg-blue-600 border-transparent'
                                  : 'border-2 border-gray-500 bg-transparent'
                              }`}
                            >
                              {selected && (
                                <Text className="text-white font-bold text-sm">✓</Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    
                    {/* Clear Section Button */}
                    {section.selectedValues.length > 0 && (
                      <TouchableOpacity
                        onPress={section.onClearSection}
                        className="mt-2 py-2"
                      >
                        <Text className="text-red-400 text-center font-semibold">
                          Zrušiť výber v sekcii
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View 
            className="px-6 py-4 border-t border-gray-700 flex-row justify-between"
            style={{ backgroundColor: '#0f172a' }}
          >
            {totalFiltersCount > 0 && (
              <TouchableOpacity
                onPress={onClearAll}
                className="bg-red-600 rounded-xl px-6 py-3"
              >
                <Text className="text-white font-semibold">Zrušiť všetko</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              onPress={onClose}
              className="bg-blue-600 rounded-xl px-6 py-3 ml-auto"
            >
              <Text className="text-white font-semibold">Použiť filtre</Text>
            </TouchableOpacity>
          </View>
      </View>
    </View>
    </Modal>
  );
}