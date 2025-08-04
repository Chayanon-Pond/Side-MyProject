import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomToast } from "../../Components/ui/CustomToast";
import { useAuth } from "../../contexts/authentication";
import axios from "axios";

const CreateArticle = () => {
  const navigate = useNavigate();
  const toast = useCustomToast();
  const { token } = useAuth();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    category_id: "",
    excerpt: "",
    content: "",
    featured_image_alt: "",
    tags: "",
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Create axios instance
  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      // Handle different response structures
      const categoriesData = response.data?.data || response.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
      setCategories([]); // Set empty array on error
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        // 5MB
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setImageFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error("Title is required");
      return false;
    }
    if (!formData.category_id) {
      toast.error("Category is required");
      return false;
    }
    if (!formData.content.trim()) {
      toast.error("Content is required");
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm()) return;
    await saveArticle("draft");
  };

  const handlePublish = async () => {
    if (!validateForm()) return;
    await saveArticle("published");
  };

  const saveArticle = async (status) => {
    setLoading(true);
    const loadingToast = toast.loading(
      status === "published" ? "Publishing article..." : "Saving draft..."
    );

    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", formData.content);
      formDataToSend.append("category_id", formData.category_id);
      formDataToSend.append("excerpt", formData.excerpt || "");
      formDataToSend.append(
        "featured_image_alt",
        formData.featured_image_alt || ""
      );
      formDataToSend.append("tags", formData.tags || "");
      formDataToSend.append("status", status);

      // Add image if exists
      if (imageFile) {
        formDataToSend.append("featured_image", imageFile);
      }

      // Make API call
      const response = await api.post("/articles", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.dismiss(loadingToast);
      toast.success(
        response.data.message ||
          `Article ${
            status === "published" ? "published" : "saved"
          } successfully`
      );

      // Navigate back to dashboard
      navigate("/admin/dashboard");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Save article error:", error);

      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error(
          `Failed to ${status === "published" ? "publish" : "save"} article`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-8">
        Create article
      </h1>

      <div className="bg-white rounded-lg p-6">
        {/* Thumbnail Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Featured image
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-gray-400 transition-colors"
          >
            {previewImage ? (
              <div className="relative">
                <img
                  src={previewImage}
                  alt="Thumbnail preview"
                  className="max-h-64 mx-auto rounded"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(null);
                    setImageFile(null);
                  }}
                  className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <div>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Upload featured image (Max 5MB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>
          {imageFile && (
            <input
              type="text"
              name="featured_image_alt"
              value={formData.featured_image_alt}
              onChange={handleChange}
              placeholder="Image alt text (for SEO)"
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
            />
          )}
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black cursor-pointer"
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Article title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
            required
          />
        </div>

        {/* Excerpt */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Excerpt (Short description)
          </label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleChange}
            placeholder="Brief description of your article"
            maxLength={300}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none text-black"
          />
          <p className="text-xs text-gray-500 mt-1">
            {formData.excerpt.length}/300 characters
          </p>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content <span className="text-red-500">*</span>
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Write your article content here..."
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none text-black"
            required
          />
        </div>
        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSaveDraft}
            disabled={loading}
            className="px-6 py-2 border border-gray-300 rounded-full hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save as draft"}
          </button>
          <button
            onClick={handlePublish}
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Publishing..." : "Save and publish"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArticle;
