"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Image, Search, Edit, Vote, Upload, Heart, HelpCircle, MessageSquare, Plus, FileText, X, Crop, Type } from 'lucide-react';

const Sidebar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const closeMenu = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Prevent background scrolling when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isOpen]);

  const rainbowColors = [
    '#5461c8', // Blue
    '#c724b1', // Pink
    '#e4002b', // Red
    '#ff6900', // Orange
    '#f6be00', // Yellow
    '#97d700', // Lime
    '#00ab84', // Green
    '#00a3e0'  // Light Blue
  ];

  const SidebarLink: React.FC<{ href: string; icon: React.ReactNode; text: string; isPro?: boolean; colorIndex: number }> = 
    ({ href, icon, text, isPro, colorIndex }) => (
    <li className="relative">
      <Link 
        href={href} 
        className="flex items-center text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 group py-2 px-4" 
        onClick={closeMenu}
      >
        <span 
          className="absolute left-0 top-0 h-full w-1 transform scale-y-0 group-hover:scale-y-100 transition-transform duration-200 ease-in-out"
          style={{ backgroundColor: rainbowColors[colorIndex] }}
        ></span>
        {icon}
        <span className="ml-2">{text}</span>
        {isPro && <span className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded-full">Pro</span>}
      </Link>
    </li>
  );

  return (
    <div>
      <button 
        className="text-black dark:text-white focus:outline-none"
        onClick={toggleMenu}
        aria-label="Open menu"
      >
        <svg
          className="w-6 h-6 mt-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 6h16M4 12h16M4 18h16"
          ></path>
        </svg>
      </button>

      <div 
        className={`fixed inset-0 bg-slate-950 z-40 transition-opacity duration-300 ease-in-out ${
          isOpen ? 'opacity-50 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMenu}
      ></div>

      <div 
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-64 bg-white dark:bg-black shadow-lg z-50 transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } overflow-y-auto`}
        aria-hidden={!isOpen}
      >
        <div className="p-5">
          <button 
            className="absolute top-2 right-2 text-gray-400 dark:text-gray-600 hover:text-gray-700 dark:hover:text-gray-300"
            onClick={toggleMenu}
            aria-label="Close menu"
          >
            <X className="w-6 h-6" />
          </button>
          <nav className="mt-8">
            <div className="mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-2 px-1 mt-6 opacity-50">Tools</h3>
              <ul className="space-y-1">
                <SidebarLink href="/collage" icon={<Image alt="Collage icon" className="w-5 h-5" aria-label="Collage Icon" />} text="Collage" isPro colorIndex={0} />
                <SidebarLink href="/" icon={<Search className="w-5 h-5" aria-label="Search Icon" />} text="Search" colorIndex={1} />
                <SidebarLink href="/edit" icon={<Edit className="w-5 h-5" aria-label="Edit Icon" />} text="Edit" colorIndex={2} />
                <SidebarLink href="/vote" icon={<Vote className="w-5 h-5" aria-label="Vote Icon" />} text="Vote" colorIndex={3} />
                <SidebarLink href="/crop" icon={<Crop className="w-5 h-5" aria-label="Crop Icon" />} text="Crop" colorIndex={4} />
                <SidebarLink href="/toptext" icon={<Type className="w-5 h-5" aria-label="Top Text Icon" />} text="Top Text" colorIndex={5} />
              </ul>
            </div>
            <div className="mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-2 px-1 mt-6 opacity-50">Contribute</h3>
              <ul className="space-y-1">
                <SidebarLink href="/upload" icon={<Upload className="w-5 h-5" />} text="Upload" colorIndex={4} />
                <SidebarLink href="/donate" icon={<Heart className="w-5 h-5" />} text="Donate" colorIndex={5} />
              </ul>
            </div>
            <div className="mb-4">
              <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-2 px-1 mt-6 opacity-50">Help &amp; Contact</h3>
              <ul className="space-y-1">
                <SidebarLink href="/support" icon={<HelpCircle className="w-5 h-5" />} text="Pro Support" isPro colorIndex={6} />
                <SidebarLink href="/faq" icon={<MessageSquare className="w-5 h-5" />} text="FAQs" colorIndex={7} />
                <SidebarLink href="/feedback" icon={<Plus className="w-5 h-5" />} text="Feedback" colorIndex={0} />
              </ul>
            </div>
            <div>
              <h3 className="text-gray-700 dark:text-gray-300 font-semibold mb-2 px-1 mt-6 opacity-50">Legal</h3>
              <ul className="space-y-1">
                <SidebarLink href="/terms-of-service" icon={<FileText className="w-5 h-5" />} text="Terms of Service" colorIndex={1} />
                <SidebarLink href="/privacy" icon={<FileText className="w-5 h-5" />} text="Privacy Policy" colorIndex={2} />
              </ul>
            </div>
          </nav>
          <div style={{ height: '100px' }}></div> 
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
