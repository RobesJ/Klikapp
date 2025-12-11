import { EvilIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// Configure Slovak locale
LocaleConfig.locales['sk'] = {
  monthNames: [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ],
  monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'],
  dayNames: ['Nedeľa', 'Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota'],
  dayNamesShort: ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So'],
  today: 'Dnes'
};
LocaleConfig.defaultLocale = 'sk';

interface ModernDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  error?: string;
}

export default function ModernDatePicker({ 
  value, 
  onChange, 
  error,
}: ModernDatePickerProps) {
  const [show, setShow] = useState(false);

  const formatDate = (date: Date | null) => {
    if (!date) return 'Vyberte dátum...';
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}.${month}.${year}`;
  };

  const formatDateForCalendar = (date: Date | null) => {
    if (!date) {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const day = today.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  };

  const handleDayPress = (day: any) => {
    const selectedDate = new Date(day.year, day.month - 1, day.day);
    const isSameAsCurrent =
      value && selectedDate.toDateString() === value.toDateString();

    onChange(isSameAsCurrent ? null : selectedDate);
    setShow(false);
  };

  return (
    <View>
      <TouchableOpacity
        onPress={() => setShow(true)}
        className={`border-2 ${
          error ? 
          'border-red-400' 
          : show 
            ? 'border-blue-500'
            : 'border-gray-600'
          } bg-gray-800 rounded-xl p-3`}
        
      >
        <View className="flex-row items-center justify-between">
          <Text style={{ color: value ? "#FFFFFF" : "#ABABAB"}}>
            {formatDate(value)}
          </Text>
          <Text className="text-2xl">📅</Text>
        </View>
      </TouchableOpacity>

      {error && (
        <Text className="text-red-500 text-xs mt-1 ml-1">
          {error}
        </Text>
      )}

      <Modal
        visible={show}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShow(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setShow(false)}
          className="flex-1 bg-black/50 justify-end"
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View className="bg-white rounded-t-3xl">
              {/* Header */}
              <View className="p-6 border-b border-gray-200">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xl font-bold text-gray-900">
                    Vyberte dátum
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShow(false)}
                    className="w-8 h-8 bg-gray-100 rounded-full items-center justify-center"
                  >
                    <EvilIcons name="close" size={20} color="black"/>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Calendar */}
              <Calendar
                current={formatDateForCalendar(value)}
                firstDay={1}
                onDayPress={handleDayPress}
                markedDates={
                  value
                    ? {
                        [formatDateForCalendar(value)]: {
                          selected: true,
                          selectedColor: '#2563EB',
                          selectedTextColor: '#FFFFFF'
                        }
                      }
                    : undefined
                }
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#6B7280',
                  selectedDayBackgroundColor: '#2563EB',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#2563EB',
                  dayTextColor: '#1F2937',
                  textDisabledColor: '#D1D5DB',
                  monthTextColor: '#1F2937',
                  textMonthFontWeight: 'bold',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14,
                  arrowColor: '#2563EB',
                }}
                style={{
                  paddingBottom: 20,
                }}
              />
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}