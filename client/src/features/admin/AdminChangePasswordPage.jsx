import ChangePasswordForm from "../auth/ChangePasswordForm";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const AdminChangePasswordPage = () => {
  useDocumentTitle("Newsroom · Change password");
  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 md:px-6 lg:py-10">
      <p className="kicker mb-2">Security</p>
      <h1 className="font-expanded text-3xl font-extrabold tracking-tight">Change password</h1>
      <p className="mt-2 max-w-md text-sm text-muted">Use at least 6 characters. A passphrase you don&apos;t use anywhere else is best.</p>
      <div className="card-apex mt-8 max-w-md p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
};

export default AdminChangePasswordPage;
