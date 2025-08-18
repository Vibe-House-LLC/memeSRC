import React from 'react';
import { fetchAuthSession, fetchUserAttributes } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext, cookiesClient } from "@/utils/amplify-utils";
import { cookies } from "next/headers";
import { UpdateProfileForm, UpdateEmailForm, AccountHeader } from '@/components/AccountTools';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type UserInfo = {
  id: string;
  email: string;
  groups: string[];
  [key:string]: any;
};

type ProfileData = {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  stripeCustomerId?: string;
  createdAt?: string;
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

    const groups = session.tokens.accessToken.payload['cognito:groups'] || [];
    const stringGroups = Array.isArray(groups) ? groups.filter((group): group is string => typeof group === 'string') : [];

    return {
      id: session.userSub!,
      email: attributes.email!,
      groups: stringGroups,
      ...attributes
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export default async function EnhancedAccountPage() {
  const userInfo = await getCurrentUser();

  if (!userInfo) {
    redirect('/signin?dest=/account');
  }

  const { data: profileData, errors } = await cookiesClient.models.Profile.get({ id: userInfo.id });

  if (errors) {
    console.error('Errors fetching profile data:', errors);
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-center p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">An error occurred while fetching your profile data.</p>
        </div>
      </div>
    );
  }

  const profile: ProfileData = {
    id: userInfo.id,
    email: userInfo.email,
    firstName: profileData?.firstName || undefined,
    lastName: profileData?.lastName || undefined,
    stripeCustomerId: profileData?.stripeCustomerId || undefined,
    createdAt: profileData?.createdAt || undefined,
  };

  return (
    <div className="pt-20 pb-24 bg-black text-white min-h-screen">
      <div className="max-w-3xl mx-auto px-6">
        <h1 className="text-3xl font-bold mb-8">My Account</h1>
        <AccountHeader profile={profile} />
        <UpdateProfileForm initialData={profile} />
        <UpdateEmailForm currentEmail={userInfo.email} />
      </div>
    </div>
  );
}