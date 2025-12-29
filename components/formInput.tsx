import { useMemo } from "react";
import { TextInput, TextStyle, View } from "react-native";
import { FONT_SIZES } from "../utils/responsive";
import { Body } from "./typografy";

interface FormInputProps{
    label?: string;
    value: string;
    onChange: (text: string) => void;
    placeholder?: string;
    error?: string;
    fieldName: string;
    focusedField: string | null;
    setFocusedField: (field: string | null) => void;
    multiline?: boolean;
    numberOfLines?: number;
    autoCapitalize?: "none" | "words";
    keyboardType?: "email-address" | "phone-pad";
    editable?: boolean;
    secureTextEntry?: boolean; 
    containerClassName?: string;
    autoComplete?: "email" | "password" | "off"; 
}

export const FormInput: React.FC<FormInputProps> = ({
    label, 
    value, 
    multiline, 
    numberOfLines,
    autoCapitalize,
    keyboardType,
    onChange,
    placeholder,
    fieldName, 
    focusedField, 
    setFocusedField, 
    error,
    editable,
    secureTextEntry,
    containerClassName,
    autoComplete
  }
) => {

  const inputStyle = useMemo((): TextStyle => {
    const size = FONT_SIZES["base"];
    return {
      fontSize: size,
      lineHeight: size * 1.4,
    };
  },[]);

    return (
      <View className={containerClassName || "mb-4"}>
        <Body className="mb-1 ml-1 font-medium text-dark-text_color">{label}</Body>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF" //"#ABABAB"
          value={value}
          onChangeText={onChange}
          cursorColor="#FFFFFF"
          className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
            ${focusedField === fieldName ? 'border-blue-500' : 'border-gray-500'}`}
          style={inputStyle}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          allowFontScaling={false}
          maxFontSizeMultiplier={1.3}
          editable={editable}
          secureTextEntry={secureTextEntry}
          autoComplete={autoComplete}
        />
        {error && (
          <Body className='text-red-500 font-semibold ml-2 mt-1'>{error}</Body>
        )}
      </View>
    );
  };