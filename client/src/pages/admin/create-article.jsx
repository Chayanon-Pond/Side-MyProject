import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomToast } from "../../Components/ui/CustomToast";

const CreateArticle = () => {
  const navigate = useNavigate();
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

  const handleSaveDraft = async () => {
    try {
      // API call to save as draft
      console.log("Save as draft:", { ...formData, status: "draft" });
      toast.success("Article saved as draft");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error("Failed to save draft");
    }
  };

  const handlePublish = async () => {
    try {
      // API call to publish
      console.log("Publish:", { ...formData, status: "published" });
      toast.success("Article published successfully");
      navigate("/admin/dashboard");
    } catch (error) {
      toast.error("Failed to publish article");
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
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black cursor-pointer"
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
            placeholder="chayanon p."
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
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSaveDraft}
            className="px-6 py-2 border border-gray-300 rounded-full hover:bg-blue-600 transition-colors cursor-pointer bg-blue-300"
          >
            Save as draft
          </button>
          <button
            onClick={handlePublish}
            className="px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors cursor-pointer"
          >
            Save and publish
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateArticle;
