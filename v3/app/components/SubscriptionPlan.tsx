'use client'

import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Zap, Headphones, ChevronDown, Wand2 } from 'lucide-react';

interface Plan {
  credits: number;
  price: number;
  color: string;
}

const SubscriptionPlan: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [selectedPlan, setSelectedPlan] = useState<'pro5' | 'pro25' | 'pro69'>('pro5');
  const [creditOptionsOpen, setCreditOptionsOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [checkoutLink, setCheckoutLink] = useState<string | null>(null);

  const subscribeButtonRef = useRef<HTMLButtonElement>(null);
  const upgradeCreditsRef = useRef<HTMLDivElement>(null);

  const plans: Record<'pro5' | 'pro25' | 'pro69', Plan> = {
    pro5: { credits: 5, price: 2.99, color: 'bg-blue-600' },
    pro25: { credits: 25, price: 4.99, color: 'bg-orange-500' },
    pro69: { credits: 69, price: 6.99, color: 'bg-green-500' },
  };

  const titleSubtitle = {
    title: 'Get Pro. Be a Hero.',
    subtitle: 'Or stay basic I guess. Your choice.',
  };

  useEffect(() => {
    const handleResize = () => setCreditOptionsOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getColor = () => plans[selectedPlan].color;
  const getTextColor = () => selectedPlan === 'pro5' ? 'text-white' : 'text-black';

  const setSelectedPlanAndScroll = (plan: 'pro5' | 'pro25' | 'pro69') => {
    setSelectedPlan(plan);
    subscribeButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const setCreditOptionsOpenAndScroll = (setting: boolean) => {
    setCreditOptionsOpen(setting);
    setTimeout(() => {
      upgradeCreditsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 200);
  };

  const openDialog = () => setIsOpen(true);
  const closeDialog = () => {
    setIsOpen(false);
    setLoading(false);
    setCheckoutLink(null);
  };

  const buySubscription = () => {
    setLoading(true);
    // Simulating API call
    setTimeout(() => {
      setCheckoutLink('https://checkout.stripe.com/pay/dummy');
      setLoading(false);
    }, 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={openDialog}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded inline-flex items-center"
      >
        <Zap className="mr-2" size={18} />
        <span>Open Subscription Plan</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1e2030] text-white rounded-2xl w-full max-w-3xl h-[90vh] max-h-[800px] relative overflow-hidden">
        <button
          onClick={closeDialog}
          className="absolute top-6 right-6 text-gray-400 hover:text-white"
          aria-label="Close modal"
        >
          <X size={24} />
        </button>

        <div className="p-8 h-full overflow-y-auto space-y-8">
          <div className="flex justify-center mb-6">
            <img src="/assets/memeSRC-white.svg" alt="memeSRC logo" className="h-12" />
          </div>

          <div className={`${getColor()} rounded-xl p-6 text-center ${getTextColor()}`}>
            <h3 className="text-3xl font-bold mb-3">{titleSubtitle.title}</h3>
            <p className="text-5xl font-bold mb-3">${plans[selectedPlan].price} / mo.</p>
            <p className="text-lg">{titleSubtitle.subtitle}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="font-bold text-xl mb-4 text-gray-300">memeSRC Pro helps support the site and unlocks these perks:</h4>
              <ul className="space-y-4">
                {[
                  { icon: Check, text: 'No Ads' },
                  { icon: Headphones, text: 'Pro Support' },
                  { icon: Zap, text: 'Early Access Features' },
                  { icon: Wand2, text: `${plans[selectedPlan].credits} Magic Credits / mo` },
                ].map(({ icon: Icon, text }, index) => (
                  <li key={index} className="flex items-center">
                    <div className={`${getColor()} rounded-full w-10 h-10 flex items-center justify-center mr-4`}>
                      <Icon className={getTextColor()} size={24} />
                    </div>
                    <span className="text-lg">{text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div
                onClick={() => setCreditOptionsOpenAndScroll(!creditOptionsOpen)}
                className="flex items-center cursor-pointer hover:underline mb-4"
                ref={upgradeCreditsRef}
              >
                <h4 className="text-2xl font-semibold underline mr-2">Want more magic credits?</h4>
                <ChevronDown
                  size={24}
                  className={`transition-transform duration-200 ${
                    creditOptionsOpen ? 'rotate-180' : 'rotate-0'
                  }`}
                />
              </div>
              {creditOptionsOpen && (
                <div className="space-y-3">
                  {(Object.keys(plans) as Array<keyof typeof plans>).map((key) => (
                    <div
                      key={key}
                      className={`${
                        selectedPlan === key ? plans[key].color : 'bg-gray-800'
                      } p-4 rounded-xl flex justify-between items-center cursor-pointer`}
                      onClick={() => setSelectedPlanAndScroll(key)}
                    >
                      <span className="font-bold text-lg">{plans[key].credits} credits / mo.</span>
                      <span className="font-bold text-lg">
                        {selectedPlan === key
                          ? 'included'
                          : `${plans[key].price > plans[selectedPlan].price ? '+' : '-'}$${Math.abs(
                              plans[key].price - plans[selectedPlan].price
                            ).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="text-center">
            <button
              ref={subscribeButtonRef}
              onClick={buySubscription}
              className={`w-full ${getColor()} ${getTextColor()} py-4 rounded-full font-bold text-2xl`}
              disabled={loading}
            >
              {loading ? 'Processing...' : `Subscribe: $${plans[selectedPlan].price}/mo`}
            </button>
            <p className="text-sm text-gray-500 mt-3">
              Payments to{' '}
              <a href="https://vibehouse.net" target="_blank" rel="noopener noreferrer" className="font-bold">
                Vibe House
              </a>{' '}
              secured by{' '}
              <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="font-bold">
                Stripe
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlan;