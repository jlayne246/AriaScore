import { Image } from "react-native";

interface Props {
  uri: string;
}

export function RenderedPage({ uri }: Props) {
  return (
    <Image
      source={{ uri }}
      style={{
        flex: 1,
        resizeMode: "contain",
      }}
    />
  );
}