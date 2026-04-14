declare module "@expo/vector-icons" {
  import { ComponentType } from "react";
  import { TextStyle } from "react-native";

  interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle;
  }

  export const Ionicons: ComponentType<IconProps>;
  export const MaterialCommunityIcons: ComponentType<IconProps>;
  export const FontAwesome: ComponentType<IconProps>;
  export const MaterialIcons: ComponentType<IconProps>;
  export const Feather: ComponentType<IconProps>;
}
