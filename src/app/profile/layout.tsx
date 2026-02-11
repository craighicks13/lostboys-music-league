import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "Manage your Music League profile, avatar, and streaming preferences.",
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
