'use client';

import { useState } from 'react';
import { CreditCard, File, LucideIcon, RefreshCcw } from 'lucide-react';

interface ManageBillingButtonProps {
  iconName?: string;
  text?: string;
  className?: string;
}

const iconMap: Record<string, LucideIcon> = {
  CreditCard: CreditCard,
  File: File,
  RefreshCcw: RefreshCcw,
  // Add more icons as needed
};

export default function ManageBillingButton({
  iconName = 'CreditCard',
  text = 'Manage billing',
  className = 'w-full text-left py-4 px-6 border-b border-gray-800 flex items-center hover:bg-gray-800 transition duration-300'
}: ManageBillingButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageBilling = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/create-customer-portal-session', {
        method: 'POST',
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create customer portal session');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Failed to open customer portal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = iconMap[iconName] || CreditCard;

  return (
    <button
      onClick={handleManageBilling}
      disabled={isLoading}
      className={className}
    >
      <Icon size={20} className="mr-4" />
      <span>{isLoading ? 'Loading...' : text}</span>
    </button>
  );
}
