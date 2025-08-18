import { checkAuthAndRedirect } from "@/utils/authCheck";
import ForgotPassForm from "@/components/auth/ForgotPassForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  await checkAuthAndRedirect(searchParams.dest as string | undefined);

  return (
    <div className="py-24 px-6 flex min-h-screen items-center justify-center bg-gray-950">
      <ForgotPassForm />
    </div>
  );
}
