import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useCustomToast } from "../../components/admin/CustomToast";
import DeleteModal from "../../components/admin/DeleteModal";

const EditArticle = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useCustomToast();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    introduction: "",
    content: "",
    authorName: "",
    thumbnail: null,
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load article data
  useEffect(() => {
    fetchArticle();
  }, [id]);

  const fetchArticle = async () => {
    try {
      // Mock data - replace with API call
      const mockArticle = {
        id: id,
        title: "The Fascinating World of Cats: Why We Love Our Furry Friends",
        category: "Cat",
        introduction:
          "Cats have captivated human hearts for thousands of years...",
        content: `Cats have captivated human hearts for thousands of years. Whether lounging in a sunny spot or playfully chasing a string, these furry companions bring warmth and joy to millions of homes. But what makes cats so special? Let's dive into the unique traits, behaviors, and quirks that make cats endlessly fascinating.

## 1. Independent Yet Affectionate

One of the most remarkable traits of cats is their balance between independence and affection. Unlike dogs, who are often eager for constant attention, cats enjoy their alone time...`,
        authorName: "chayanon p.",
        thumbnail: "/cat-image.jpg",
      };

      setFormData(mockArticle);
      setPreviewImage(mockArticle.thumbnail);
      setLoading(false);
    } catch (error) {
      toast.error("Failed to load article");
      navigate("/admin/dashboard");
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
        setFormData({ ...formData, thumbnail: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSave = async () => {
    try {
      // API call to update article
      console.log("Update article:", formData);
      toast.success("Article updated successfully");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error("Failed to update article");
    }
  };

  const handleDelete = async () => {
    try {
      // API call to delete article
      console.log("Delete article:", id);
      toast.success("Article deleted successfully");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error("Failed to delete article");
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
                    setFormData({ ...formData, thumbnail: null });
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
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
          >
            <option value="">Select category</option>
            <option value="Cat">Cat</option>
            <option value="General">General</option>
            <option value="Inspiration">Inspiration</option>
          </select>
        </div>

        {/* Author Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Author name
          </label>
          <input
            type="text"
            name="authorName"
            value={formData.authorName}
            onChange={handleChange}
            placeholder="Author name"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
          />
        </div>

        {/* Title */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Article title"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black"
          />
        </div>

        {/* Introduction */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Introduction (max 120 letters)
          </label>
          <textarea
            name="introduction"
            value={formData.introduction}
            onChange={handleChange}
            placeholder="Introduction"
            maxLength={120}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none text-black"
          />
        </div>

        {/* Content */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content
          </label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            placeholder="Content"
            rows={15}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none text-black"
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
            className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Save
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
