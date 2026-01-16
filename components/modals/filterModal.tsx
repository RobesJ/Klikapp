import { EvilIcons, Feather } from '@expo/vector-icons';
import { useCallback, useState } from "react";
import { Modal, ScrollView, Switch, TouchableOpacity, View } from "react-native";
import { Body, BodySmall, Caption, Heading3 } from '../typography';

interface FilterOption {
  value: string;
  label?: string;
  colors?: string[]; 
}

interface FilterSection {
  id: string;
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  type?: "simple" | "styled";
}

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  sections: FilterSection[];
  onClearAll: () => void;
}

export default function FilterModal({
  visible,
  onClose,
  sections,
  onClearAll,
}: FilterModalProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  },[]);

  const totalFiltersCount = sections.reduce(
    (sum, section) => sum + section.selectedValues.length,
    0
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-center items-center">
        <View className="w-11/12 max-w-2xl bg-dark-bg border-2 border-gray-400 rounded-2xl overflow-hidden max-h-[80%]">
          {/* Header */}
          <View className="px-4 py-6 border-b border-gray-700">
            <View className="flex-row items-center justify-between">
              <View>
                <Heading3 className="text-xl font-bold text-dark-text_color">
                  Filtrovať
                </Heading3>
                {totalFiltersCount > 0 && (
                  <BodySmall className="text-sm text-gray-400 mt-1">
                    {totalFiltersCount} aktívnych filtrov
                  </BodySmall>
                )}
              </View>

              <TouchableOpacity
                onPress={onClose}
                className="items-center justify-center"
              >
                <EvilIcons name="close" size={28} color="white"/>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sections */}
          <ScrollView className="px-4 py-6">
            
            {sections.map((section) => {
              const isExpanded = expandedSections.has(section.id);
              const activeCount = section.selectedValues.length;
              
              return (
                <View key={section.id} className="mb-4">
                  {/* Section Toggle Button */}
                  <TouchableOpacity
                    onPress={() => toggleSection(section.id)}
                    activeOpacity={0.8}
                    className="rounded-2xl border-2 border-gray-600 py-2 px-4 flex-row items-center justify-between"
                  >
                    <View className="flex-row gap-4 items-center">
                      <Body className="text-dark-text_color">
                        {section.title}
                      </Body>
                      {activeCount > 0 && (
                        <View className="bg-blue-500 rounded-full w-5 h-5 items-center justify-center">
                          <Caption className="text-white text-xs font-bold">
                            {activeCount}
                          </Caption>
                        </View>
                      )}
                    </View>
                    <Feather
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>

                  {/* Section Content */}
                  {isExpanded && (
                    <ScrollView className="mt-1 mb-4 max-h-44">
                      {section.options.map((option) => {
                        const isSelected = section.selectedValues.includes(option.value);
                        const displayLabel = option.label || option.value;

                        return (
                          <View
                            key={option.value}
                            className="flex-row items-center justify-between"
                          >
                            {section.type === 'styled' && option.colors ? (
                              // Styled badge option (for Type/State filters)
                              <Body
                                className={`${option.colors[1]} rounded-2xl px-4 py-1 ml-2 ${option.colors[0]}`}
                              >
                                {displayLabel}
                              </Body>
                            ) : (
                              // Simple text option (for Users/City filters)
                              <Body className="text-dark-text_color font-semibold ml-2">
                                {displayLabel}
                              </Body>
                            )}
                            
                            <Switch
                              value={isSelected}
                              onValueChange={() => section.onToggle(option.value)}
                              trackColor={{ false: "#555", true: "#4ade80" }}
                              thumbColor={"white"}
                            />
                          </View>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          {totalFiltersCount > 0 && (
            <View className="px-4 py-4 border-t border-gray-700">
              <TouchableOpacity
                onPress={() => {
                  onClearAll();
                  onClose();
                }}
                className="bg-red-600 rounded-xl py-3"
              >
                <Body className="text-white font-semibold text-center">
                  Zrušiť všetky filtre
                </Body>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}