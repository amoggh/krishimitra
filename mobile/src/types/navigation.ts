import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { FarmInputPayload, RecommendationResult } from "./api";

export type AuthStackParamList = {
  Splash: undefined;
  Login: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Plan: undefined;
  Market: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  FarmInput: undefined;
  AIProcessing: { farmInput: FarmInputPayload };
  Recommendations: { result: RecommendationResult };
  RiskAnalysis: { planId: string };
  Settings: undefined;
  DiseaseDetection: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;
