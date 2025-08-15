import { checkAuthAndRedirect } from "@/utils/authCheck";
import SignInForm from "@/components/auth/SignInForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  await checkAuthAndRedirect(searchParams.dest as string | undefined);

  return (
    <div className="py-24 px-6 flex min-h-screen items-center justify-center bg-gray-950">
      <SignInForm />
    </div>
  );
}
