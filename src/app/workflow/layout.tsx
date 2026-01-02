import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workflow • Avenge-Studio",
  description: "Visual workflow editor for AI content generation pipelines",
};

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
