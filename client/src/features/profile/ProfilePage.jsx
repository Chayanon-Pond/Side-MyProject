import { useEffect, useId, useState } from "react";
import { toast } from "../../lib/toast";
import { useAuth } from "../auth/AuthContext";
import AccountShell from "./AccountShell";
import { BIO_MAX, getProfile, updateProfile } from "../../api/profile";
import { getErrorMessage } from "../../lib/apiClient";
import { avatarUrl, imgFallback, DEFAULT_AVATAR } from "../../lib/assets";
import { displayName } from "../../lib/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // matches server limit

const inputClass =
  "w-full px-3 py-2 border border-line rounded-[6px] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none text-fg";

const ProfilePage = () => {
  useDocumentTitle("Profile");
  const { user, updateUser } = useAuth();
  const id = useId();
  const [formData, setFormData] = useState({ name: "", username: "", email: "", bio: "" });
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({ ...prev, name: displayName(user), username: user.username || "", email: user.email || "" }));
  }, [user]);

  // The login payload has no bio: load it from GET /profile so saving never wipes it.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return undefined;
    const controller = new AbortController();
    getProfile({ signal: controller.signal })
      .then((p) => p && setFormData((prev) => ({ ...prev, bio: p.bio || "" })))
      .catch(() => {}); // the bio field simply stays empty if this fails
    return () => controller.abort();
  }, [userId]);

  // Revoke object URLs we created for the preview.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be 2MB or smaller");
      return;
    }
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      const updated = await updateProfile({
        full_name: formData.name,
        username: formData.username,
        email: formData.email,
        bio: formData.bio.trim(),
        imageFile,
      });
      if (updated) updateUser({ ...user, ...updated });
      setImageFile(null);
      setPreview(null);
      toast.success("Saved profile", { description: "Your profile has been successfully updated" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setIsLoading(false);
    }
  };

  const imageSrc = preview || avatarUrl(user?.profile_image_url);

  return (
    <AccountShell title="Profile" avatarSrc={imageSrc}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-line rounded-full overflow-hidden">
            <img src={imageSrc} onError={imgFallback(DEFAULT_AVATAR)} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <label
              htmlFor={`${id}-image`}
              className="inline-block px-4 py-2 bg-surface border border-line rounded-[6px] cursor-pointer hover:bg-bg transition-colors text-fg focus-within:ring-2 focus-within:ring-[var(--ring)]"
            >
              Upload profile picture
              <input id={`${id}-image`} type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-name`} className="block text-sm font-medium text-muted mb-2">
              Name
            </label>
            <input
              id={`${id}-name`}
              type="text"
              name="name"
              autoComplete="name"
              value={formData.name}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="Enter your name"
            />
          </div>
          <div>
            <label htmlFor={`${id}-username`} className="block text-sm font-medium text-muted mb-2">
              Username
            </label>
            <input
              id={`${id}-username`}
              type="text"
              name="username"
              autoComplete="username"
              value={formData.username}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="Enter your username"
            />
          </div>
          <div>
            <label htmlFor={`${id}-email`} className="block text-sm font-medium text-muted mb-2">
              Email
            </label>
            <input
              id={`${id}-email`}
              type="email"
              name="email"
              value={formData.email}
              className="w-full px-3 py-2 border border-line rounded-[6px] bg-bg text-subtle"
              readOnly
            />
          </div>
          <div>
            <label htmlFor={`${id}-bio`} className="block text-sm font-medium text-muted mb-2">
              Bio
            </label>
            <textarea
              id={`${id}-bio`}
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              maxLength={BIO_MAX}
              rows={4}
              className={`${inputClass} resize-none`}
              placeholder="A line or two about you. Shown on stories you write."
              aria-describedby={`${id}-bio-count`}
            />
            <p id={`${id}-bio-count`} className="mt-1 text-right font-mono text-[11px] text-subtle">
              {formData.bio.length}/{BIO_MAX}
            </p>
          </div>
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="px-6 py-2 bg-papaya text-papaya-contrast rounded-[2px] hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </AccountShell>
  );
};

export default ProfilePage;
