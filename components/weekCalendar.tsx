import { addDays, format, isSameDay, startOfWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { useEffect, useState } from "react";
import { TouchableOpacity, useWindowDimensions, View } from "react-native";
import { BodyLarge, Caption, Heading1, Heading3 } from "./typografy";

interface WeekCalendarProps {
    selectedDay: Date;
    onDateSelect: (date: Date) => void;
    initialWeekStart?: Date;
}

export default function WeekCalendar({selectedDay, onDateSelect, initialWeekStart}: WeekCalendarProps) {
    const { width } = useWindowDimensions();
    
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

    const horizontalPadding = 32; // px-4 = 16 on each side
    const arrowSpace = 80; // Space for arrows and gaps
    const availableWidth = width - horizontalPadding - arrowSpace;
    const dayWidth = Math.floor(availableWidth / 7);

    // Responsive sizing based on available width
    const isSmallScreen = width < 400;
    const dayHeight = isSmallScreen ? 58 : 66;

    return (
        <View className="p-4 mx-4">
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
                <TouchableOpacity
                    onPress={goToPreviousWeek}
                    className="px-3"
                >
                    <Heading1 className="font-bold text-dark-text_color">←</Heading1>
                </TouchableOpacity>
                
                <View className="items-center flex-1">
                    <BodyLarge className="font-bold  text-dark-text_color">
                        {format(currentWeekStart, "LLLL yyyy", {locale: sk})}
                    </BodyLarge>
                    <TouchableOpacity onPress={goToToday} className="mt-1">
                        <Heading3 className="text-dark-text_color">Dnes</Heading3>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={goToNextWeek}
                    className="px-3"
                >
                    <Heading1 className="font-bold text-dark-text_color">→</Heading1>
                </TouchableOpacity>
            </View>
            
                <View className="flex-row items-center justify-center">
                    {weekDays.map((day, index) =>{
                        const isSelected = isSameDay(day, selectedDay);
                        const isToday = isSameDay(day, new Date());

                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={() => onDateSelect(day)}
                                style={{
                                    width: dayWidth,
                                    height: dayHeight,
                                    marginLeft: index > 0 ? 1 : 0,
                                }}
                                className={`items-center justify-center rounded-xl ${
                                    isSelected 
                                    ? "bg-blue-600"
                                    : isToday
                                    ? "bg-blue-100 border-2 border-blue-600"
                                    : "bg-gray-100"
                                }`}
                            >
                                <Caption
                                  className={`font-medium ${
                                    isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-600'
                                  }`}
                                >
                                    {format(day, "EEE", {locale: sk}).toUpperCase()}
                                </Caption>
                                <BodyLarge
                                  className={`font-bold mt-1 ${
                                    isSelected ? 'text-white' : isToday ? 'text-blue-600' : 'text-gray-900'
                                  }`}
                                >
                                    {format(day, 'd')}
                                </BodyLarge>
                            </TouchableOpacity>
                        );
                    })}
                </View>
        </View>
    );
}