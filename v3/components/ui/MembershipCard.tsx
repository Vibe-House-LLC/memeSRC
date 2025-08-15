import { Button } from '@/components/ui/Buttons'
import { Unlock } from 'lucide-react'
import React from 'react';

interface MembershipCardProps {
  title: string;
  email: string;
  currentPeriodEnd: string;
  memberId: string;
}

const MembershipCard: React.FC<MembershipCardProps> = ({
  title,
  email,
  currentPeriodEnd,
  memberId,
}) => {
  // Function to mask the memberId, showing only the last four digits
  const maskMemberId = (id: string) => {
    if (id.length <= 4) return id;
    return `****${id.slice(-4)}`;
  };

  return (
    <div className="relative w-[350px] h-[200px]">
      <div className={`w-full h-full bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg p-5 shadow-lg text-white relative overflow-hidden flex flex-col justify-between`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent animate-shimmer pointer-events-none"></div>
        <div className="flex justify-between items-start">
          <div className='text-left'>
            <h3 className="text-xl font-bold mb-1">{title}</h3>
            <p className="text-sm text-purple-200">{email}</p>
          </div>
          <div className="flex flex-col items-end">
            <svg className="w-8 h-8 text-purple-200 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
              <line x1="1" y1="10" x2="23" y2="10"></line>
            </svg>
            {/* QR code placeholder */}
            <div className="w-18 h-18 bg-white rounded relative overflow-hidden">
              <div className="absolute inset-0 bg-purple-800 opacity-30"></div>
              <div className="absolute top-[10%] left-[10%] w-[30%] h-[30%] bg-purple-800 shadow-[6px_0_0_0_#6b21a8,0_6px_0_0_#6b21a8,6px_6px_0_0_#6b21a8]"></div>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-end">
          <div className='text-left'>
            <p className="text-xs text-purple-200 mb-1">Current Period Ends</p>
            <p className="text-sm font-semibold">{currentPeriodEnd}</p>
          </div>
          <div className='text-right'>
            <p className="text-xs text-purple-200 mb-1">Member ID</p>
            <p className="text-sm font-semibold">{maskMemberId(memberId)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MembershipCard;
