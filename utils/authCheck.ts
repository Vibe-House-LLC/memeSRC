// utils/authCheck.ts

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { fetchAuthSession } from "aws-amplify/auth/server";
import { runWithAmplifyServerContext } from "@/utils/amplify-utils";

export async function checkAuthAndRedirect(dest?: string) {
  const authenticated = await runWithAmplifyServerContext({
    nextServerContext: { cookies },
    operation: async (contextSpec) => {
      try {
        const session = await fetchAuthSession(contextSpec, {});
        return session.tokens !== undefined;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
  });

  if (authenticated) {
    redirect(dest || '/account');
  }
}
