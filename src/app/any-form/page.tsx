import type { Metadata } from "next";
import { FormExperience } from "@/components/FormExperience";

export const metadata: Metadata = {
  title: "Any form — SpeakGov",
  description: "Paste the questions from any form and fill it in by talking, in English or French.",
};

export default function AnyForm() {
  return <FormExperience mode="custom" />;
}
