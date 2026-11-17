import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";
import LoginForm from "./LoginForm";
import AuthSplitLayout from "./AuthSplitLayout";
import DemoAccessCard from "../../components/ui/DemoAccessCard";
import { DEMO_USER } from "../../components/ui/demoAccounts";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { displayName } from "../../lib/format";

const LoginPage = () => {
  useDocumentTitle("Sign in");
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || "/";
  const [prefill, setPrefill] = useState(null);

  return (
    <AuthSplitLayout
      image="/img/gtsmc.jpg"
      quote="Smooth hands, quiet feet, and the road will tell you everything."
      kicker="Welcome back"
      title="Sign in to APEX"
      subtitle="Comment on stories, follow makes and get the Friday Lap."
      footer={
        <>
          {/* Demo credentials are intentionally visible (owner decision). */}
          <DemoAccessCard accounts={[DEMO_USER]} onUse={(acc) => setPrefill({ ...acc })} />
          <p className="mt-6 text-center text-sm text-muted">
            New here?{" "}
            <Link to="/register" className="font-semibold text-fg underline decoration-papaya underline-offset-4">
              Create an account
            </Link>
          </p>
        </>
      }
    >
      <LoginForm
        prefill={prefill}
        onSuccess={(user) => {
          toast.success(`Welcome back${displayName(user) ? `, ${displayName(user).split(" ")[0]}` : ""}`);
          navigate(from, { replace: true });
        }}
      />
    </AuthSplitLayout>
  );
};

export default LoginPage;
