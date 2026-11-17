import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "../../lib/toast";
import LoginForm from "../auth/LoginForm";
import AuthSplitLayout from "../auth/AuthSplitLayout";
import DemoAccessCard from "../../components/ui/DemoAccessCard";
import { DEMO_ADMIN, DEMO_OWNER_ADMIN } from "../../components/ui/demoAccounts";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const AdminLoginPage = () => {
  useDocumentTitle("Newsroom sign in");
  const navigate = useNavigate();
  const [prefill, setPrefill] = useState(null);

  return (
    <main id="main" className="bg-bg text-fg">
      <AuthSplitLayout
        fullHeight
        image="/img/mc_engin.jpg"
        quote="Write it like you drove it. Check the numbers twice."
        quoteBy="APEX style guide"
        kicker="Newsroom"
        title="Editor sign in"
        subtitle="Publish reviews, manage the spec sheets and keep the conversation civil."
        footer={
          <>
            {/* Demo credentials are intentionally visible (owner decision). */}
            <DemoAccessCard accounts={[DEMO_ADMIN, DEMO_OWNER_ADMIN]} onUse={(acc) => setPrefill({ ...acc })} />
            <p className="mt-6 text-sm text-muted">
              Not an editor?{" "}
              <Link to="/" className="font-medium text-fg underline decoration-papaya underline-offset-4">
                Back to APEX
              </Link>
            </p>
          </>
        }
      >
        <LoginForm
          requireAdmin
          showForgotLink={false}
          prefill={prefill}
          onSuccess={() => {
            toast.success("Welcome back to the newsroom");
            navigate("/admin", { replace: true });
          }}
        />
      </AuthSplitLayout>
    </main>
  );
};

export default AdminLoginPage;
