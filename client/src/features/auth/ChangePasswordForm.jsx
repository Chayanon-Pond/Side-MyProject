import { useId, useState } from "react";
import { toast } from "../../lib/toast";
import { changePassword } from "../../api/auth";
import { getErrorMessage } from "../../lib/apiClient";
import PasswordInput from "../../components/ui/PasswordInput";
import ConfirmModal from "../../components/ui/ConfirmModal";

const EMPTY = { currentPassword: "", newPassword: "", confirmPassword: "" };
const FIELDS = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
];

/** Logged-in password change, shared by the user account page and the admin panel. */
const ChangePasswordForm = ({ onSuccess }) => {
  const id = useId();
  const [formData, setFormData] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [showModal, setShowModal] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};
    if (!formData.currentPassword) next.currentPassword = "Current password is required";
    if (!formData.newPassword) next.newPassword = "New password is required";
    else if (formData.newPassword.length < 6) next.newPassword = "Password must be at least 6 characters";
    else if (formData.newPassword === formData.currentPassword)
      next.newPassword = "New password must be different from current password";
    if (!formData.confirmPassword) next.confirmPassword = "Please confirm your password";
    else if (formData.newPassword !== formData.confirmPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) setShowModal(true);
  };

  const handleConfirm = async () => {
    try {
      await changePassword(formData.currentPassword, formData.newPassword);
      toast.success("Password updated");
      setFormData(EMPTY);
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update password"));
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label htmlFor={`${id}-${f.name}`} className="label-apex">
              {f.label}
            </label>
            <PasswordInput
              id={`${id}-${f.name}`}
              name={f.name}
              autoComplete={f.autoComplete}
              value={formData[f.name]}
              onChange={handleChange}
              placeholder={f.label}
              aria-invalid={Boolean(errors[f.name])}
              aria-describedby={errors[f.name] ? `${id}-${f.name}-err` : undefined}
            />
            {errors[f.name] && (
              <p id={`${id}-${f.name}-err`} className="mt-1.5 text-xs text-danger">
                {errors[f.name]}
              </p>
            )}
          </div>
        ))}
        <div className="pt-2">
          <button type="submit" className="btn-apex btn-primary-apex">
            Update password
          </button>
        </div>
      </form>

      <ConfirmModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirm}
        title="Update password?"
        message="You'll use the new password the next time you sign in."
        confirmLabel="Update"
      />
    </>
  );
};

export default ChangePasswordForm;
