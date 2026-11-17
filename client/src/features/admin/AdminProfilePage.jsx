import { useEffect, useId, useRef, useState } from "react";
import { Camera } from "lucide-react";
import Avatar from "../../components/ui/Avatar";
import { toast } from "../../lib/toast";
import { useAuth } from "../auth/AuthContext";
import { BIO_MAX, getProfile, updateProfile } from "../../api/profile";
import { getErrorMessage } from "../../lib/apiClient";
import { assetUrl, imgFallback, DEFAULT_AVATAR } from "../../lib/assets";
import { displayName } from "../../lib/format";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const AdminProfilePage = () => {
  useDocumentTitle("Newsroom · Profile");
  const id = useId();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({ full_name: "", username: "", email: "", bio: "" });
  const [preview, setPreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFormData({
      full_name: user.full_name || "",
      username: user.username || "",
      email: user.email || "",
      bio: user.bio || "",
    });
    setPreview(user.profile_image_url ? assetUrl(user.profile_image_url) : null);
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

  useEffect(() => () => preview?.startsWith("blob:") && URL.revokeObjectURL(preview), [preview]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > MAX_IMAGE_BYTES) return toast.error("File size must be less than 5MB");
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.full_name.trim()) return toast.error("Please enter your full name");
    if (!formData.username.trim()) return toast.error("Please enter a username");
    if (!formData.email.trim()) return toast.error("Please enter your email");

    setLoading(true);
    const toastId = toast.loading("Updating profile...");
    try {
      const updated = await updateProfile({ ...formData, imageFile });
      if (updated) updateUser({ ...user, ...updated });
      setImageFile(null);
      toast.success("Profile updated successfully!", { id: toastId });
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile"), { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { name: "full_name", label: "Name", type: "text", placeholder: "Your full name" },
    { name: "username", label: "Username", type: "text", placeholder: "Your username" },
    { name: "email", label: "Email", type: "email", placeholder: "Your email address" },
  ];

  return (
    <div className="mx-auto max-w-[960px] px-4 py-8 md:px-6 lg:py-10">
      <p className="kicker mb-2">Account</p>
      <h1 className="font-expanded text-3xl font-extrabold tracking-tight">Profile</h1>

      <form onSubmit={handleSave} className="card-apex mt-8 max-w-2xl p-6" noValidate>
        <div className="mb-8 flex items-center gap-5">
          {preview ? (
            <img
              src={preview}
              onError={imgFallback(DEFAULT_AVATAR)}
              alt="Profile"
              className="h-20 w-20 rounded-full border border-line object-cover"
            />
          ) : (
            <Avatar name={displayName(user)} size={80} />
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-apex btn-ghost-apex"
          >
            <Camera className="h-4 w-4" aria-hidden="true" /> Change photo
          </button>
          <label htmlFor={`${id}-image`} className="sr-only">
            Profile picture file
          </label>
          <input
            id={`${id}-image`}
            ref={fileInputRef}
            type="file"
            onChange={handleImageUpload}
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
          />
        </div>

        {fields.map((f) => (
          <div className="mb-5" key={f.name}>
            <label htmlFor={`${id}-${f.name}`} className="label-apex">
              {f.label}
            </label>
            <input
              id={`${id}-${f.name}`}
              type={f.type}
              name={f.name}
              value={formData[f.name]}
              onChange={handleChange}
              placeholder={f.placeholder}
              className="field-apex"
              required
            />
          </div>
        ))}

        <div className="mb-6">
          <label htmlFor={`${id}-bio`} className="label-apex">
            Bio
          </label>
          <textarea
            id={`${id}-bio`}
            name="bio"
            value={formData.bio}
            onChange={handleChange}
            placeholder="Tell us about yourself..."
            maxLength={BIO_MAX}
            rows={4}
            className="field-apex resize-none"
          />
          <p className="mt-1 text-right font-mono text-[11px] text-subtle">{formData.bio.length}/{BIO_MAX}</p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="btn-apex btn-primary-apex"
          >
            {loading ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminProfilePage;
