"use client";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import NavLink from "./components/NavLink";
import Sidebar from "./components/Sidebar";
import "./globals.css";
import { MessageSquare, Heart, RotateCw, Grid3X3, Trash2, X } from "lucide-react";
import ConfigureAmplifyClientSide from "@/components/ConfigureAmplify";
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/ui/darkmode-toggle";
import { Button } from "@/components/ui/button";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { useState, useEffect, useRef, useContext, createContext } from "react";
import { useRouter } from "next/navigation";
import { getSearchResults, type SearchResult } from "./api/getSearchResults";

const inter = Inter({ subsets: ["latin"] });

// Types for collage functionality
interface CollageItem {
  id: string;
  frameImage?: string;
  cid: string;
  season: string;
  episode: string;
  frame: string;
  subtitle?: string;
  subtitleShowing?: boolean;
  timestamp?: string;
  showTitle?: string;
}

// Mock user context - you'll need to replace this with your actual user context
const UserContext = createContext<{ user?: any }>({ user: null });

// Mock collage context - you'll need to replace this with your actual collage context
const useCollage = () => {
  const [collageItems, setCollageItems] = useState<CollageItem[]>([]);
  const count = collageItems.length;
  
  const removeItem = (id: string) => {
    setCollageItems(prev => prev.filter(item => item.id !== id));
  };
  
  const clearAll = () => {
    setCollageItems([]);
  };
  
  return { collageItems, count, removeItem, clearAll };
};

// Helper function to calculate midpoint between two frame numbers
const findMidpoint = (startFrame: string, endFrame: string): number => {
  const start = parseInt(startFrame, 10);
  const end = parseInt(endFrame, 10);
  return Math.floor((start + end) / 2);
};

// Helper function to get random item from array
const getRandomIndex = (array: any[]): any => {
  return array[Math.floor(Math.random() * array.length)];
};

// Available show indices - you might want to fetch this dynamically
const AVAILABLE_INDICES = [
  'the-simpsons',
  'futurama', 
  'rick-and-morty',
  'south-park',
  'family-guy',
  'american-dad',
  'archer',
  'bob-s-burgers',
  'king-of-the-hill',
  'the-office',
  'friends',
  'seinfeld',
  'it-s-always-sunny-in-philadelphia',
  // Add more as needed
];

// Real random frame hook that uses getSearchResults API
const useLoadRandomFrame = () => {
  const [loadingRandom, setLoadingRandom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadRandomFrame = async (shows?: any[]) => {
    setLoadingRandom(true);
    setError(null);

    try {
      // Select a random show index
      const randomIndex = getRandomIndex(AVAILABLE_INDICES);
      
      // Use a common search term that's likely to return results
      // You might want to use different strategies here
      const searchTerms = ['the', 'a', 'and', 'is', 'to', 'of', 'in', 'it', 'you', 'that'];
      const randomSearchTerm = getRandomIndex(searchTerms);
      
      console.log(`Loading random frame from ${randomIndex} with search term: ${randomSearchTerm}`);
      
      // Get search results
      const searchResults = await getSearchResults(randomSearchTerm, randomIndex);
      
      if (!searchResults.results || searchResults.results.length === 0) {
        throw new Error('No results found for random search');
      }

      // Pick a random result
      const randomResult = getRandomIndex(searchResults.results) as SearchResult;
      
      // Calculate midpoint frame
      const midpointFrame = findMidpoint(randomResult.start_frame, randomResult.end_frame);
      const roundedFrame = Math.round(midpointFrame / 10) * 10; // Round to nearest 10 frames
      
      // Navigate to the random frame
      const frameUrl = `/frame/${randomIndex}/${randomResult.season}/${randomResult.episode}/${roundedFrame}`;
      console.log(`Navigating to random frame: ${frameUrl}`);
      
      router.push(frameUrl);
      
    } catch (error) {
      console.error('Error loading random frame:', error);
      setError(error instanceof Error ? error.message : 'Failed to load random frame');
    } finally {
      setLoadingRandom(false);
    }
  };

  return { loadRandomFrame, loadingRandom, error };
};

// Helper function to generate image URL from collage item
const getImageUrl = (item: CollageItem): string => {
  if (item.frameImage && item.frameImage.startsWith('http')) {
    return item.frameImage;
  }
  return `https://v2-${process.env.NEXT_PUBLIC_USER_BRANCH || 'main'}.memesrc.com/frame/${item.cid}/${item.season}/${item.episode}/${item.frame}`;
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { collageItems, count, removeItem, clearAll } = useCollage();
  const { loadRandomFrame, loadingRandom, error } = useLoadRandomFrame();
  const [showImageDrawer, setShowImageDrawer] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  
  // Mock user context - replace with your actual user context
  const { user } = useContext(UserContext);
  
  // Check if user is an admin - replace with your actual logic
  const hasCollageAccess = user?.['cognito:groups']?.includes('admins') || true; // Set to true for demo
  
  // Function to handle closing with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowImageDrawer(false);
      setIsClosing(false);
    }, 400);
  };

  // Function to navigate to collage page
  const handleNavigateToCollage = () => {
    if (collageItems.length > 0) {
      const collageImages = collageItems.map(item => ({
        originalUrl: getImageUrl(item),
        displayUrl: getImageUrl(item),
        subtitle: item.subtitle || '',
        subtitleShowing: item.subtitleShowing || false,
        metadata: {
          season: item.season,
          episode: item.episode,
          frame: item.frame,
          timestamp: item.timestamp,
          showTitle: item.showTitle
        }
      }));
      
      // Navigate with state if there are collage items
      router.push('/collage');
      // In a real app, you'd pass the collageImages via context or state management
    } else {
      // Navigate to empty collage page
      router.push('/collage');
    }
    
    // Only close drawer if it's open
    if (showImageDrawer) {
      handleClose();
    }
  };

  // Function to create collage from collage items (for the drawer button)
  const handleCreateCollage = () => {
    if (collageItems.length === 0) return;
    handleNavigateToCollage();
  };

  // Handle click outside to close popup
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        handleClose();
      }
    }

    if (showImageDrawer) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showImageDrawer]);

  // Show error toast if random frame loading fails
  useEffect(() => {
    if (error) {
      console.error('Random frame error:', error);
      // You could show a toast notification here
    }
  }, [error]);

  return (
    <html lang="en" className="dark:bg-black">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
      </head>
      <body className={`${inter.className} relative`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FavoritesProvider>
            <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-black shadow-md z-50 h-12">
              <div className="px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-12">
                  <div className="flex items-center">
                    <Sidebar />
                    <Link href="/" className="flex items-center">
                      <Image
                        src="/memeSRC-color.svg"
                        alt="memeSRC Logo"
                        width={24}
                        height={24}
                        className="h-6 w-auto ml-2"
                      />
                      <p className="ml-1 font-semibold text-black dark:text-white">memeSRC</p>
                    </Link>
                  </div>
                  <div className="flex items-center space-x-4">
                    <NavLink href="/account">
                      Account
                    </NavLink>
                    <ModeToggle />
                  </div>
                </div>
              </div>
            </nav>
            <ConfigureAmplifyClientSide />
            <main>{children}</main>
            
            {/* Action buttons */}
            <div className="fixed bottom-4 left-4 flex space-x-2 z-50">
              {hasCollageAccess ? (
                // Show Collage button for users with access
                <div className="relative">
                  {count > 0 && (
                    <div className="absolute -top-2 -right-2 z-[51] bg-red-500 text-white border-2 border-black min-w-[20px] h-5 text-xs font-bold flex items-center justify-center rounded-full px-1">
                      {count > 99 ? '99+' : count}
                    </div>
                  )}
                  <Button 
                    ref={buttonRef}
                    onClick={() => {
                      if (showImageDrawer) {
                        handleClose();
                      } else if (count > 0) {
                        setShowImageDrawer(true);
                      } else {
                        handleNavigateToCollage();
                      }
                    }}
                    variant="outline" 
                    className="bg-black text-white border-gray-600 hover:bg-gray-800"
                  >
                    <Grid3X3 className="mr-2 h-4 w-4" />
                    Collage
                  </Button>
                </div>
              ) : (
                // Show original donate + feedback buttons for users without access
                <>
                  <Link href="/support">
                    <Button size="icon" variant="outline" className="bg-black text-white border-gray-600 hover:bg-gray-800">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="https://memesrc.com/donate" target="_blank">
                    <Button size="icon" variant="outline" className="bg-black text-white border-gray-600 hover:bg-gray-800">
                      <Heart className="h-4 w-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Random button */}
            <div className="fixed bottom-4 right-4 z-50">
              <Button 
                onClick={() => loadRandomFrame()} 
                variant="outline" 
                className="bg-black text-white border-gray-600 hover:bg-gray-800"
                disabled={loadingRandom}
              >
                <RotateCw className={`mr-2 h-4 w-4 ${loadingRandom ? 'animate-spin' : ''}`} />
                Random
              </Button>
            </div>

            {/* Image Drawer Popup */}
            {hasCollageAccess && (showImageDrawer || isClosing) && (
              <div 
                ref={popupRef}
                className={`fixed bottom-0 left-0 right-0 w-full bg-gradient-to-t from-black/90 via-black/60 to-black/40 p-5 pb-20 max-h-96 overflow-y-auto z-[51] backdrop-blur-lg border-t border-white/20 transition-all duration-400 ease-out ${
                  isClosing 
                    ? 'transform translate-y-full opacity-0' 
                    : 'transform translate-y-0 opacity-100'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-lg font-semibold text-center flex-1">
                      Collage Images ({count})
                    </h3>
                    <Button
                      onClick={handleClose}
                      size="icon"
                      variant="ghost"
                      className="text-white hover:bg-white/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {collageItems.length === 0 ? (
                    <p className="text-white/60 italic text-center py-5">
                      No images in collage
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {collageItems.map((item, index) => (
                        <div 
                          key={item.id}
                          className="p-3 bg-white/8 rounded-lg border border-white/15"
                        >
                          <div className="flex items-start space-x-3">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0">
                              <img
                                src={getImageUrl(item)}
                                alt={`S${item.season}E${item.episode} Frame ${item.frame}`}
                                className="w-20 h-11 object-cover rounded bg-white/10"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                                  target.style.display = 'flex';
                                  target.style.alignItems = 'center';
                                  target.style.justifyContent = 'center';
                                  target.innerHTML = '📷';
                                }}
                              />
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-white font-bold text-sm">
                                S{item.season}E{item.episode} - Frame {item.frame}
                              </p>
                              {item.timestamp && (
                                <p className="text-white/70 text-xs">
                                  {item.timestamp}
                                </p>
                              )}
                              {item.subtitle && (
                                <div className="flex items-start gap-1">
                                  <p className="text-white/90 italic text-sm overflow-hidden text-ellipsis line-clamp-2 flex-1">
                                    "{item.subtitle}"
                                  </p>
                                  {item.subtitleShowing && (
                                    <span className="text-green-500 text-xs" title="Image shows subtitle">
                                      ✏️
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* Remove button */}
                            <Button
                              onClick={() => removeItem(item.id)}
                              size="icon"
                              variant="ghost"
                              className="text-white/70 hover:text-white hover:bg-white/10 w-8 h-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {index < collageItems.length - 1 && (
                            <hr className="mt-3 border-white/10" />
                          )}
                        </div>
                      ))}
                      
                      <Button 
                        onClick={handleCreateCollage}
                        disabled={count > 5}
                        className={`w-full font-bold ${
                          count > 5 
                            ? 'bg-gray-600 hover:bg-gray-600' 
                            : 'bg-green-600 hover:bg-green-700'
                        }`}
                      >
                        <Grid3X3 className="mr-2 h-4 w-4" />
                        Create Collage ({count} images)
                      </Button>
                      
                      {count > 5 && (
                        <p className="text-white/70 italic text-center text-sm">
                          Maximum 5 images allowed for collage
                        </p>
                      )}
                      
                      {collageItems.length > 1 && (
                        <Button 
                          onClick={clearAll}
                          variant="outline"
                          className="w-full text-white border-white/30 hover:bg-white/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clear All ({count})
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            <Toaster position="bottom-right" />
          </FavoritesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
