import React from 'react';
import { Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import { Body, BodySmall, Heading3 } from './typography';

interface BadgeOption {
  value: string;
  colors: string[];
}

interface ProjectBadgeProps {
  value: string | null;
  isSelected: boolean;
  onPress?: () => void;
  colors: string[];
  size?: 'small' | 'medium' | 'large';
}

export const ProjectBadge: React.FC<ProjectBadgeProps> = ({
  value,
  isSelected,
  onPress,
  colors,
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'px-2 py-1',
    medium: 'px-3 py-2',
    large: 'px-4 py-3'
  };

  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      className={`
        rounded-2xl
        ${sizeClasses[size]}
        ${isSelected ? `${colors[1]} ${colors[0]} bg-opacity-20` : 'border-2 border-gray-600 bg-gray-800'}
      `}
    >
      <Body
        className={`${textSizeClasses[size]} font-semibold ${isSelected ? colors[0] : 'text-gray-400'}`}
      >
        {value}
      </Body>
    </TouchableOpacity>
  );
};

// Reusable Badge Selector Component
interface BadgeSelectorProps {
  options: BadgeOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label: string;
  error?: string;
}

export const BadgeSelector: React.FC<BadgeSelectorProps> = ({
  options,
  selectedValue,
  onSelect,
  label,
  error
}) => {
  return (
    <View className="mb-4">
      <Body className="mb-2 ml-1 text-dark-text_color">{label}</Body>
      <View className="flex-row justify-between gap-2">
        {options.map((option) => (
          <ProjectBadge
            key={option.value}
            value={option.value}
            isSelected={selectedValue === option.value}
            onPress={() => onSelect(option.value)}
            colors={option.colors}
            size="large"
          />
        ))}
      </View>
      {error && (
        <BodySmall className="text-red-500 font-semibold ml-2 mt-1">
          {error}
        </BodySmall>
      )}
    </View>
  );
};

// Modal Selector for States
interface ModalSelectorProps {
  options: BadgeOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  label: string;
  inDetailsModal: boolean;
  error?: string;
  placeholder?: string;
}

export const ModalSelector: React.FC<ModalSelectorProps> = ({
  options,
  selectedValue,
  onSelect,
  label,
  inDetailsModal,
  error,
  placeholder = 'Vyberte...'
}) => {
  const [showModal, setShowModal] = React.useState(false);
  
  const selectedOption = options.find(opt => opt.value === selectedValue);

  return (
    <>
      {!inDetailsModal && (
        <View className="mb-4">
          <Body className="mb-2 ml-1 font-medium text-dark-text_color">{label}</Body>
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            className={`border-2 
              ${error 
                  ? 'border-red-400' 
                  : showModal 
                      ? 'border-blue-500'
                      : 'border-gray-600'
              } bg-gray-800 rounded-xl p-4`}
          >
            <View className="flex-row items-center justify-between">
              {selectedOption ? (
                <View className={`${selectedOption.colors[1]} ${selectedOption.colors[0]} bg-opacity-20 rounded-full px-4 py-1`}>
                  <Body className={`${selectedOption.colors[0]} font-semibold`}>
                    {selectedOption.value}
                  </Body>
                </View>
              ) : (
                <Body style={{ color: '#ABABAB' }}>{placeholder}</Body>
              )}
              <Body className="text-gray-400">▼</Body>
            </View>
          </TouchableOpacity>
          {error && (
            <BodySmall className="text-red-500 text-xs mt-1 ml-1">
              {error}
            </BodySmall>
          )}
        </View>
      )}

      {inDetailsModal && (
        <View className="p-4 items-start justify-center">
          
          {selectedOption && (
            <ProjectBadge
              value={selectedOption.value}
              isSelected={true}
              colors={STATE_OPTIONS.find(s => s.value === selectedOption.value)?.colors ?? ["text-white", "border-gray-500"]}
              size = "medium"
              onPress={() => setShowModal(true)}
            />
          )}
          {error && (
            <BodySmall className="text-red-500 mt-1 ml-1">
              {error}
            </BodySmall>
          )}
        </View>
      )}

      {/* Selection Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-dark-bg rounded-t-3xl" style={{ height: '60%' }}>
            {/* Header */}
            <View className="p-6 border-b border-gray-700">
              <View className="flex-row items-center justify-between">
                <Heading3 className="text-xl text-white font-bold">{label}</Heading3>
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  className="w-9 h-9 bg-gray-700 rounded-full items-center justify-center"
                >
                  <Heading3 className="text-white text-xl">×</Heading3>
                </TouchableOpacity>
              </View>
            </View>

            {/* Options List */}
            <ScrollView className="flex-1 p-4">
              {options.map((option) => {
                const isSelected = selectedValue === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setShowModal(false);
                    }}
                    className={`
                      mb-3 p-4 rounded-xl border-2
                      ${isSelected ? `${option.colors[1]} ${option.colors[0]} bg-opacity-20` : 'border-gray-700 bg-gray-800'}
                    `}
                  >
                    <View className="flex-row items-center justify-between">
                      <Body className={`font-semibold text-base ${isSelected ? option.colors[0] : 'text-white'}`}>
                        {option.value}
                      </Body>
                      {isSelected && (
                        <View className={`w-6 h-6 rounded-full items-center justify-center ${option.colors[1]}`}>
                          <Body className={option.colors[0]}>✓</Body>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

// Export constants
export const TYPE_OPTIONS = [
  {
    value: "Obhliadka", 
    colors: ["text-dark-project-type-obhliadka", "border-2 border-dark-project-type-obhliadka"],
  },
  {
    value: "Montáž",
    colors: ["text-dark-project-type-montaz", "border-2 border-dark-project-type-montaz"],
  },
  {
    value: "Revízia", 
    colors: ["text-dark-project-type-revizia", "border-2 border-dark-project-type-revizia"],
  },
  {
    value: "Čistenie", 
    colors: ["text-dark-project-type-cistenie", "border-2 border-dark-project-type-cistenie"],
  }
];

export const STATE_OPTIONS = [
  {
    value: "Nový",
    colors: ["text-dark-project-state-novy", "border-2 border-dark-project-state-novy"],
  },
  {
    value: "Naplánovaný",
    colors: ["text-dark-project-state-naplanovany", "border-2 border-dark-project-state-naplanovany"],
  },
  {
    value: "Prebieha", 
    colors: ["text-dark-project-state-prebieha", "border-2 border-dark-project-state-prebieha"],
  },
  {
    value: "Pozastavený", 
    colors: ["text-dark-project-state-pozastaveny", "border-2 border-dark-project-state-pozastaveny"],
  },
  {
    value: "Ukončený", 
    colors: ["text-dark-project-state-ukonceny", "border-2 border-dark-project-state-ukonceny"]
  },
  {
    value: "Zrušený", 
    colors: ["text-dark-project-state-zruseny", "border-2 border-dark-project-state-zruseny"]
  }
];

export const STATE_OPTIONS_HOME = [
  {
    value: "Naplánovaný",
    colors: ["text-dark-project-state-naplanovany", "border-2 border-dark-project-state-naplanovany"],
  },
  {
    value: "Prebieha", 
    colors: ["text-dark-project-state-prebieha", "border-2 border-dark-project-state-prebieha"],
  },
  {
    value: "Pozastavený", 
    colors: ["text-dark-project-state-pozastaveny", "border-2 border-dark-project-state-pozastaveny"],
  }
];