import React from 'react';
import { LucideIcon, Mail } from 'lucide-react';
import { Button } from '@/components/ui/Buttons';

interface ActionCardProps {
  title: string;
  description?: string;
  buttonText?: string;
  href?: string;
  className?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  buttonBgColor?: string;
}

const ActionCard: React.FC<ActionCardProps> = ({ 
  title, 
  description, 
  buttonText, 
  href, 
  className,
  icon: Icon = Mail,
  iconBgColor = 'bg-purple-600',
}) => {
  return (
    <div className={`max-w-md w-full space-y-8 bg-gray-800 p-8 pt-10 rounded-lg text-center ${className}`}>
      <div className={`mx-auto h-16 w-16 ${iconBgColor} rounded-full flex items-center justify-center`}>
        <Icon className="h-10 w-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-white">{title}</h2>
      {description && (
        <p className="mt-1 text-gray-400 text-center">
          {description}
        </p>
      )}
      {buttonText && (
        <div className="mt-8">
          <Button href={href} className={`w-full`}>
            {buttonText}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActionCard;
