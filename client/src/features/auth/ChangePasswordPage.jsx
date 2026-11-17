import { useNavigate } from "react-router-dom";
import AccountShell from "../profile/AccountShell";
import ChangePasswordForm from "./ChangePasswordForm";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

/** /reset-password – logged-in user changes their password. */
const ChangePasswordPage = () => {
  useDocumentTitle("Reset password");
  const navigate = useNavigate();
  return (
    <AccountShell title="Reset password">
      <ChangePasswordForm onSuccess={() => navigate("/profile")} />
    </AccountShell>
  );
};

export default ChangePasswordPage;
