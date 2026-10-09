import { Platform } from "react-native";
import { FarmLocationMap as WebMap } from "./FarmLocationMap.web";
import { FarmLocationMap as NativeMap } from "./FarmLocationMap.native";

export const FarmLocationMap = Platform.OS === "web" ? WebMap : NativeMap;
export default FarmLocationMap;
