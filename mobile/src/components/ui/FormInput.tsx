import { Text, TextInput, View, type TextInputProps } from "react-native";

type Props = TextInputProps & {
  label: string;
};

export function FormInput({ label, className, ...rest }: Props) {
  return (
    <View className="mb-3.5">
      <Text className="mb-1.5 font-sans-semibold text-xs text-ink-muted">{label}</Text>
      <TextInput
        className={`rounded-xl border border-cream-dark bg-white px-3.5 py-3 font-sans text-base text-ink ${className ?? ""}`}
        placeholderTextColor="#8a9b90"
        {...rest}
      />
    </View>
  );
}
