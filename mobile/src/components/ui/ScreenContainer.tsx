import React from "react";
import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useResponsive } from "@/theme/responsive";

export type ScreenContainerProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  safe?: boolean;
  maxWidth?: number;
  contentContainerClassName?: string;
  children: React.ReactNode;
};

export function ScreenContainer({
  scroll = true,
  padded = true,
  safe = true,
  maxWidth,
  contentContainerClassName = "pb-28",
  children,
  className,
  style,
  ...rest
}: ScreenContainerProps) {
  const { isDesktop, isTablet, contentMaxWidth } = useResponsive();

  const resolvedMaxWidth = maxWidth ?? (isDesktop ? contentMaxWidth : isTablet ? 840 : undefined);

  const horizontalPadding = padded
    ? isDesktop
      ? "px-8"
      : isTablet
      ? "px-6"
      : "px-4"
    : "";

  const content = (
    <View
      className={`w-full flex-1 bg-cream ${horizontalPadding} ${className ?? ""}`}
      style={[
        resolvedMaxWidth
          ? {
              maxWidth: resolvedMaxWidth,
              alignSelf: "center",
            }
          : {},
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerClassName={contentContainerClassName}
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

export default ScreenContainer;
