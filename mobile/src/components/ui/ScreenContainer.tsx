import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  safe?: boolean;
  children: React.ReactNode;
};

export function ScreenContainer({
  scroll = true,
  padded = true,
  safe = true,
  children,
  className,
  ...rest
}: Props) {
  const content = (
    <View className={`flex-1 bg-cream ${padded ? "px-4" : ""} ${className ?? ""}`} {...rest}>
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName="pb-28"
      className="flex-1 bg-cream"
    >
      {content}
    </ScrollView>
  ) : (
    content
  );

  if (safe) {
    return (
      <SafeAreaView className="flex-1 bg-cream" edges={["top"]}>
        {body}
      </SafeAreaView>
    );
  }
  return body;
}
