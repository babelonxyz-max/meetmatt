import type { Metadata } from "next";
import { WhitelabelToolkit } from "../components/WhitelabelToolkit";

export const metadata: Metadata = {
  title: "Matt Whitelabeling Toolkit",
  description: "Configure brand identity and export deployment assets for client-branded Matt instances.",
};

export default function WhitelabelPage() {
  return <WhitelabelToolkit />;
}
