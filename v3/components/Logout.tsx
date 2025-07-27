// components/Logout.tsx

"use client";

import { signOut } from "aws-amplify/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import Link from "next/link";

export default function Logout() {
  const router = useRouter();

  const handleSignOut = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Link
      href="/"
      onClick={handleSignOut}
      className="flex items-center text-red-600 hover:text-red-800 transition-colors"
    >
      <LogOut className="w-4 h-4 mr-1" />
      <span className="text-sm">Sign out</span>
    </Link>
  );
}