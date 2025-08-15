import Link from 'next/link';
import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const baseClasses = "bg-purple-600 font-bold text-white rounded py-4 px-6 hover:bg-purple-700 transition-colors duration-300 flex items-center justify-center";

export const Button: React.FC<ButtonProps> = ({ children, href, onClick, disabled, className = '', type = 'button' }) => {
  if (href) {
    return (
      <Link href={href} className={`${baseClasses} ${className}`}>
        {children}
      </Link>
    );
  }

  return (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={`${baseClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      type={type}
    >
      {children}
    </button>
  );
};