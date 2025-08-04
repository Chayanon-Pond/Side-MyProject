import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCustomToast } from "../../Components/ui/CustomToast";
import { useAuth } from "../../contexts/authentication";
import DeleteModal from "./deleteModal";
import axios from "axios";

const EditArticle = () => {
  const navigate = useNavigate();
  const { id } = useParams();
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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create axios instance
  const api = axios.create({
    baseURL: "http://localhost:5000/api",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Load article data
  useEffect(() => {
    if (!token) {
      navigate("/admin/login");
      return;
    }
    fetchCategories();
    fetchArticle();
  }, [id, token]);

  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      const categoriesData = response.data?.data || response.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast.error("Failed to load categories");
    }
  };

  const fetchArticle = async () => {
    try {
      const response = await api.get(`/articles/${id}`);
      // Handle the response structure (could be response.data.data or response.data.article)
      const article = response.data.data || response.data.article || response.data;
      
      console.log("Fetched article:", article); // Debug log
      
      setFormData({
        title: article.title || "",
        category_id: article.category_id || "",
        excerpt: article.excerpt || "",
        content: article.content || "",
        featured_image_alt: article.featured_image_alt || "",
        tags: article.tags && Array.isArray(article.tags) 
          ? article.tags.filter(tag => tag !== null).join(", ") 
          : "",
      });
      
      if (article.featured_image_url) {
        setPreviewImage(`http://localhost:5000${article.featured_image_url}`);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch article:", error);
      toast.error("Failed to load article");
      navigate("/admin/dashboard");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
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

  const handleSave = async () => {
    // Validation
    if (!formData.title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!formData.content.trim()) {
      toast.error("Please enter content");
      return;
    }

    if (!formData.category_id) {
      toast.error("Please select a category");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Updating article...");

    try {
      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", formData.content);
      formDataToSend.append("category_id", formData.category_id);
      formDataToSend.append("excerpt", formData.excerpt || "");
      formDataToSend.append("featured_image_alt", formData.featured_image_alt || "");
      formDataToSend.append("tags", formData.tags || "");

      // Add image if exists
      if (imageFile) {
        formDataToSend.append("featured_image", imageFile);
      }

      // Make API call
      const response = await api.put(`/articles/${id}`, formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.dismiss(loadingToast);
      toast.success(response.data.message || "Article updated successfully");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Update article error:", error);

      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Failed to update article");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Deleting article...");

    try {
      await api.delete(`/articles/${id}`);
      
      toast.dismiss(loadingToast);
      toast.success("Article deleted successfully");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Delete article error:", error);
      
      if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Failed to delete article");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold text-gray-800 mb-8">
        Edit article
      </h1>

      <div className="bg-white rounded-lg p-6">
        {/* Thumbnail Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Thumbnail image
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
                  Upload thumbnail image
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
        </div>

        {/* Category */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category *
          </label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
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
            Title *
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
            placeholder="Brief description of the article"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none text-black"
          />
          <p className="text-sm text-gray-500 mt-1">
            {formData.excerpt.length}/300 characters
          </p>
        </div>

        {/* Featured Image Alt Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Featured Image Alt Text
          </label>
          <input
            type="text"
            name="featured_image_alt"
            value={formData.featured_image_alt}
            onChange={handleChange}
            placeholder="Describe the image for accessibility"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
          />
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <input
            type="text"
            name="tags"
            value={formData.tags}
            onChange={handleChange}
            placeholder="Enter tags separated by commas (e.g., technology, react, javascript)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
          />
          <p className="text-sm text-gray-500 mt-1">
            Separate multiple tags with commas
          </p>
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content *
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
        <div className="flex justify-between">
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-6 py-2 text-red-600 hover:text-red-700 transition-colors flex items-center cursor-pointer"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete article
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Updating..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Delete Modal */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemType="article"
      />
    </div>
  );
};

export default EditArticle;
