import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from "react-native";
import {
  Bot,
  Send,
  Sprout,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  AlertTriangle,
  Lightbulb,
} from "lucide-react-native";
import type { RootStackScreenProps } from "@/types/navigation";
import { colors, radii, shadows } from "@/theme/tokens";
import { useActiveDistrict } from "@/services/locationState";
import { useFarms } from "@/services/farmProfileService";
import {
  sendChatMessage,
  type ChatMessage,
  type FarmContext,
} from "@/services/api/chatService";

type Props = RootStackScreenProps<"Chatbot">;

interface DisplayMessage {
  id: string;
  role: "user" | "model";
  content: string;
  isFarmingOnly?: boolean;
  timestamp: string;
  suggestedFollowups?: string[];
}

const DEFAULT_SUGGESTIONS = [
  "🌾 Best fertilizer schedule for my soil",
  "🌧️ How will upcoming rain affect my crops?",
  "🐛 Natural pest control tips for my crops",
  "📈 Mandi price outlook & selling advice",
];

export function ChatbotScreen({ navigation, route }: Props) {
  const { district, profile } = useActiveDistrict();
  const { activeFarm } = useFarms();
  const effectiveDistrict = activeFarm?.district || district || "Shivamogga";

  // Build farm context from active farm & profile
  const farmContext: FarmContext = useMemo(() => {
    const crops =
      activeFarm?.allocatedCrops && activeFarm.allocatedCrops.length > 0
        ? activeFarm.allocatedCrops.map((c) => c.crop)
        : profile?.primary_crops || ["Arecanut", "Paddy", "Maize"];

    return {
      district: effectiveDistrict,
      location: effectiveDistrict,
      state: "Karnataka",
      soil_type: activeFarm?.soilType || activeFarm?.soil_type || profile?.soil?.type || "Red Sandy Loam",
      total_acres: Number(activeFarm?.acres) || 10.0,
      current_crops: crops,
      recent_weather: {
        temp_c: profile?.weather?.temp_c ?? 28,
        condition: profile?.weather?.condition ?? "Partly Cloudy",
        humidity_pct: profile?.weather?.rain_chance_pct ? 65 : 45,
      },
    };
  }, [effectiveDistrict, activeFarm, profile]);

  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "model",
      content:
        `Hello! I am **KrishiMitra AI**, your personalized agricultural advisor.\n\n` +
        `I am strictly specialized in **farming, crops, soil health, pest management, weather advisories, and mandi trends** for your farm in **${effectiveDistrict}**.\n\n` +
        `How can I help your farm today?`,
      timestamp: "Just now",
      isFarmingOnly: true,
      suggestedFollowups: DEFAULT_SUGGESTIONS,
    },
  ]);

  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll when messages update
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Handle initial prompt from route params if passed
  useEffect(() => {
    if (route.params?.initialPrompt) {
      handleSendMessage(route.params.initialPrompt);
    }
  }, [route.params?.initialPrompt]);

  const handleSendMessage = async (textToSend?: string) => {
    const rawText = textToSend || inputText;
    if (!rawText.trim() || loading) return;

    const userMsg: DisplayMessage = {
      id: "user-" + Date.now(),
      role: "user",
      content: rawText.trim(),
      timestamp: "Now",
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText("");
    setLoading(true);

    try {
      // Build conversation history for context
      const historyPayload: ChatMessage[] = newMessages
        .filter((m) => m.id !== "welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await sendChatMessage(rawText.trim(), historyPayload, farmContext);

      const aiMsg: DisplayMessage = {
        id: "ai-" + Date.now(),
        role: "model",
        content: res.response,
        isFarmingOnly: res.is_farming_related,
        timestamp: "Now",
        suggestedFollowups: res.suggested_followups,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg: DisplayMessage = {
        id: "err-" + Date.now(),
        role: "model",
        content:
          "⚠️ **Unable to connect to the advisor service.**\n\n" +
          "Please verify that your backend server is running and your `GEMINI_API_KEY` is configured in `backend/.env`.",
        isFarmingOnly: true,
        timestamp: "Now",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const renderFormattedContent = (content: string) => {
    // Basic Markdown-like renderer for bold and bullet lists
    const lines = content.split("\n");
    return (
      <View className="gap-1">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <View key={idx} className="h-1" />;
          }

          // Bullet points
          if (line.startsWith("- ") || line.startsWith("* ")) {
            const clean = line.substring(2).replace(/\*\*(.*?)\*\*/g, "$1");
            return (
              <View key={idx} className="flex-row items-start gap-1.5 pl-1 my-0.5">
                <Text className="text-forest font-bold text-sm leading-5">•</Text>
                <Text className="text-earth-dark text-sm leading-5 flex-1">{clean}</Text>
              </View>
            );
          }

          // Numbered list
          if (/^\d+\.\s/.test(line)) {
            const clean = line.replace(/\*\*(.*?)\*\*/g, "$1");
            return (
              <View key={idx} className="flex-row items-start gap-1 pl-1 my-0.5">
                <Text className="text-earth-dark text-sm leading-5 flex-1">{clean}</Text>
              </View>
            );
          }

          // Regular text
          const clean = line.replace(/\*\*(.*?)\*\*/g, "$1");
          return (
            <Text
              key={idx}
              className={`text-sm leading-5 ${
                line.startsWith("#") ? "font-bold text-forest text-base mt-1" : "text-earth-dark"
              }`}
            >
              {clean}
            </Text>
          );
        })}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-cream"
    >
      {/* ── Header ── */}
      <View
        className="bg-white border-b border-sand px-4 pt-4 pb-3 flex-row items-center justify-between"
        style={shadows.subtle}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="w-10 h-10 rounded-full bg-cream items-center justify-center border border-sand"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={colors.forest} />
          </Pressable>

          <View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-forest font-bold text-base">Krishi AI Advisor</Text>
              <View className="bg-sage/70 px-2 py-0.5 rounded-full flex-row items-center gap-1">
                <ShieldCheck size={12} color={colors.primary} />
                <Text className="text-[10px] font-semibold text-forest">Farming Only</Text>
              </View>
            </View>
            <Text className="text-textMuted text-xs">
              Powered by Gemini • Customized for {effectiveDistrict}
            </Text>
          </View>
        </View>

        <View className="w-9 h-9 rounded-full bg-forest/10 items-center justify-center">
          <Bot size={20} color={colors.primary} />
        </View>
      </View>

      {/* ── Farm Context Banner ── */}
      <View className="bg-sage/40 border-b border-sand/60 px-4 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2 flex-1">
          <Sprout size={16} color={colors.primary} />
          <Text className="text-xs text-forest font-medium" numberOfLines={1}>
            Farm: {activeFarm?.name ? `${activeFarm.name} (${effectiveDistrict})` : effectiveDistrict} • {farmContext.total_acres} ac • {farmContext.current_crops?.slice(0, 2).join(", ")}
          </Text>
        </View>
        <Text className="text-[11px] text-textMuted font-medium">Context Active</Text>
      </View>

      {/* ── Message Stream ── */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";

          return (
            <View
              key={msg.id}
              className={`flex-row ${isUser ? "justify-end" : "justify-start"}`}
            >
              {!isUser && (
                <View className="w-8 h-8 rounded-full bg-forest items-center justify-center mr-2 mt-1">
                  <Bot size={16} color="#FFFFFF" />
                </View>
              )}

              <View
                className={`max-w-[85%] rounded-2xl p-3.5 ${
                  isUser
                    ? "bg-forest rounded-tr-sm"
                    : "bg-white border border-sand rounded-tl-sm"
                }`}
                style={shadows.subtle}
              >
                {isUser ? (
                  <Text className="text-white text-sm leading-5">{msg.content}</Text>
                ) : (
                  <>
                    {renderFormattedContent(msg.content)}

                    {/* Follow-up suggestions if available */}
                    {msg.suggestedFollowups && msg.suggestedFollowups.length > 0 && (
                      <View className="mt-3 pt-2.5 border-t border-sand/60 gap-1.5">
                        <View className="flex-row items-center gap-1 mb-1">
                          <Lightbulb size={12} color={colors.accent} />
                          <Text className="text-[11px] font-semibold text-textMuted uppercase tracking-wider">
                            Suggested Follow-ups
                          </Text>
                        </View>
                        <View className="flex-row flex-wrap gap-1.5">
                          {msg.suggestedFollowups.map((suggestion, sIdx) => (
                            <Pressable
                              key={sIdx}
                              onPress={() => handleSendMessage(suggestion)}
                              className="bg-cream hover:bg-sand/30 border border-sand px-2.5 py-1.5 rounded-full active:opacity-70"
                            >
                              <Text className="text-xs text-forest font-medium">
                                {suggestion}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          );
        })}

        {/* Loading Indicator */}
        {loading && (
          <View className="flex-row items-center gap-2 self-start bg-white border border-sand px-3 py-2 rounded-2xl">
            <ActivityIndicator size="small" color={colors.primary} />
            <Text className="text-xs text-textMuted font-medium">
              Consulting Krishi AI agricultural model...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ── Input Bar ── */}
      <View
        className="bg-white border-t border-sand px-4 py-3"
        style={shadows.card}
      >
        <View className="flex-row items-center gap-2">
          <TextInput
            className="flex-1 bg-cream border border-sand rounded-full px-4 py-2.5 text-sm text-earth-dark"
            placeholder="Ask about crops, soil, pests, weather..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage()}
            returnKeyType="send"
            multiline={false}
          />

          <Pressable
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              !inputText.trim() || loading ? "bg-sand" : "bg-forest"
            }`}
          >
            <Send size={18} color={!inputText.trim() || loading ? colors.textMuted : "#FFFFFF"} />
          </Pressable>
        </View>

        <Text className="text-[11px] text-textMuted text-center mt-2">
          Only answers queries related to farming, crops, and agricultural management.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}
