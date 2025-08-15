import { checkAuthAndRedirect } from "@/utils/authCheck";
import VerifyForm from "@/components/auth/VerifyForm";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  await checkAuthAndRedirect(searchParams.dest as string | undefined);

  return (
    <div className="pt-20 flex min-h-screen items-center justify-center">
      <VerifyForm />
    </div>
  );
}
