"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string; // Optional className prop
}

export default function NavLink({ href, children, className = "" }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ease-in-out
        ${isActive 
          ? 'text-black bg-gray-200 dark:text-white dark:bg-gray-900' 
          : 'text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
        }
        ${className} // Merge any additional classes
      `}
    >
      {children}
    </Link>
  );
}
