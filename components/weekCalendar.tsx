import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

interface WeekCalendarProps {
    selectedDay: Date;
    onDateSelect: (date: Date) => void;
    initialWeekStart?: Date;
}

export default function WeekCalendar({selectedDay, onDateSelect, initialWeekStart}: WeekCalendarProps) {
    const [currentWeekStart, setCurrentWeekStart] = useState(
        initialWeekStart 
        ?  startOfWeek(initialWeekStart, { weekStartsOn: 1})
        :  startOfWeek(selectedDay, { weekStartsOn: 1})
    );

    useEffect(() => {
        setCurrentWeekStart(startOfWeek(selectedDay, { weekStartsOn: 1 }));
    }, [selectedDay]);

    const weekDays = Array.from({ length: 7}, (_, i) => addDays(currentWeekStart,i));

    const goToPreviousWeek = () => {
        setCurrentWeekStart(addDays(currentWeekStart, -7));
    };

    const goToNextWeek = () => {
        setCurrentWeekStart(addDays(currentWeekStart, 7));
    };

    const goToToday = () => {
        setCurrentWeekStart(startOfWeek(new Date(), {weekStartsOn: 1}));
        onDateSelect(new Date());
    };

    return (
        <View className="p-4 mx-4">

            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                    onPress={goToPreviousWeek}
                >
                    <Text className="font-bold text-3xl text-dark-text_color">←</Text>
                </TouchableOpacity>
                
                <View className="items-center">
                    <Text className="text-lg font-bold  text-dark-text_color">
                        {format(currentWeekStart, "LLLL yyyy", {locale: sk})}
                    </Text>
                    <TouchableOpacity onPress={goToToday} className="mt-1">
                        <Text className="text-xl text-dark-text_color">Dnes</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={goToNextWeek}
                >
                    <Text className="font-bold text-3xl text-dark-text_color">→</Text>
                </TouchableOpacity>
            </View>
            <View className="flex-2 items-center justify-center">
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row">
                    {weekDays.map((day, index) =>{
                        const isSelected = isSameDay(day, selectedDay);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => onDateSelect(day)}
                                className={`items-center justify-center w-14 h-20 rounded-xl ${
                                    isSelected 
                                    ? "bg-blue-600"
                                    : isToday
                                    ? "bg-blue-100 border-2 border-blue-600"
                                    : "bg-gray-100"
                                }`}
                            >
                                <Text
                                  className={`text-xs font-medium ${
                                    isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-600'
                                  }`}
                                >
                                    {format(day, "EEE", {locale: sk}).toUpperCase()}
                                </Text>
                                <Text
                                  className={`text-xl font-bold mt-1 ${
                                    isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-900'
                                  }`}
                                >
                                    {format(day, 'd')}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
            </View>
        </View>
    );
}