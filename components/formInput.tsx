import { Text, TextInput, View } from "react-native";

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
    error}
) => {
    return (
      <View className="mb-4">
        <Text className="mb-1 ml-1 font-medium text-dark-text_color">{label}</Text>
        <TextInput
          placeholder={placeholder}
          placeholderTextColor="#ABABAB"
          value={value}
          onChangeText={onChange}
          cursorColor="#FFFFFF"
          className={`flex-row items-center border-2 bg-gray-800 rounded-xl px-4 py-4 text-white 
            ${focusedField === fieldName ? 'border-blue-500' : 'border-gray-700'}`}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
        />
        {error && (
          <Text className='text-red-500 font-semibold ml-2 mt-1'>{error}</Text>
        )}
      </View>
    );
  };