import React from 'react';
import { AlertCircle, CheckCircle, X, XCircle } from 'lucide-react';
import ActionCard from '@/components/ActionCard';

import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth/server";
import { cookiesClient, runWithAmplifyServerContext } from "@/utils/amplify-utils";
import { cookies } from "next/headers";
import { Button } from '@/components/ui/Buttons'
import { Unlock } from 'lucide-react'
import MembershipCard from './MembershipCard'
import Stripe from 'stripe';

const stripe = new Stripe(process.env.REACT_APP_STRIPE_SECRET_KEY!);

type UserInfo = {
  id: string,
  email: string,
  groups: string[],
  firstName: string,
  lastName: string,
  stripeCustomerId: string,
  [key: string]: any; // Allow for other attributes
};

async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const session = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        try {
          return await fetchAuthSession(contextSpec);
        } catch (error) {
          console.error('Error fetching auth session:', error);
          return null;
        }
      },
    });

    if (!session?.tokens) {
      return null;
    }

    const attributes = await runWithAmplifyServerContext({
      nextServerContext: { cookies },
      operation: async (contextSpec) => {
        return await fetchUserAttributes(contextSpec);
      },
    });

    // Fetch user groups and ensure it's an array of strings
    const groups = session.tokens.accessToken.payload['cognito:groups'] || [];
    const stringGroups = Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];

    // Ensure email is present, otherwise return null
    if (!attributes.email) {
      console.error('User email is missing');
      return null;
    }

    const { data: profileData, errors } = await cookiesClient.models.Profile.get(
      { id: attributes.sub! }
    );

    return {
      id: session.userSub!,
      email: attributes.email,
      groups: stringGroups,
      firstName: profileData?.firstName!,
      lastName: profileData?.lastName!,
      stripeCustomerId: profileData?.stripeCustomerId!,
      ...attributes
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

const MyMembershipCard = async () => {
  const userInfo = await getCurrentUser();

  // Function to mask the memberId, showing only the last four digits
  const maskMemberId = (id: string) => {
    if (id.length <= 4) return id;
    return `****${id.slice(-4)}`;
  };

  const { data: profileData, errors } = await cookiesClient.models.Profile.get(
    { id: userInfo!.id },
    { selectionSet: ['stripeCustomerId'] } 
  );

  const stripeCustomerId = profileData?.stripeCustomerId;

  let subscriptions: Stripe.Subscription[] = [];

  try {
    if (stripeCustomerId) {
      const result = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active',
      });
      subscriptions = result.data;
    }
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return (
      <div className="bg-gray-800 rounded-lg p-6 flex items-center shadow-lg">
        <AlertCircle className="text-yellow-400 mr-4" size={24} />
        <p className="text-lg text-gray-300">Error fetching subscriptions. Please try again later.</p>
      </div>
    );
  }
  
  const hasActiveSubscriptions = subscriptions.length > 0;

  const currentPeriodEnd = subscriptions[0]?.current_period_end;
  const date = new Date(currentPeriodEnd * 1000); // Multiply by 1000 as Stripe uses seconds, not milliseconds
  const formattedDate = date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="relative w-[350px] h-[200px]">
      <div className={`${!hasActiveSubscriptions && 'blur-sm grayscale'}`}>
      <MembershipCard 
        title={`${userInfo?.firstName} ${userInfo?.lastName}`}
        email={userInfo?.email!}
        currentPeriodEnd={formattedDate}
        memberId={maskMemberId(userInfo?.id!)}
      />
      </div>
      {!hasActiveSubscriptions && (
        <>
          <div className={`absolute inset-0 bg-black opacity-50 rounded-lg ${!hasActiveSubscriptions && 'blur-sm grayscale'}`}></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Button className='rounded-full' href='/game'>
              <Unlock className='mr-2' />
              Unlock Unlimited
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default MyMembershipCard;
