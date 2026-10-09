import { View, type ViewProps } from "react-native";

export function Card({ children, className, ...rest }: ViewProps) {
  return (
    <View
      className={`mb-3 bg-white p-3.5 ${className ?? ""}`}
      style={{
        borderRadius: 20,
        shadowColor: "#1b5e3b",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
      }}
      {...rest}
    >
      {children}
    </View>
  );
}
