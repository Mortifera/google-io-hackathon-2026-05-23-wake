import GenesisClient from "./GenesisClient";

export const metadata = {
  title: "Wake · Genesis",
  description: "Generate a runnable world from a single sentence.",
};

export default function GenesisPage() {
  return <GenesisClient />;
}
