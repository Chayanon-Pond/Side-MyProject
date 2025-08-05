import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArticleTable from "./ArticleTable ";
import DeleteModal from "./deleteModal";
import { useCustomToast } from "../../Components/ui/CustomToast";
import { useAuth } from "../../contexts/authentication";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useCustomToast();
  const { token } = useAuth();

  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    articleId: null,
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
  });

  // Create axios instance with auth header
  const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // Fetch articles
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        status: statusFilter || "all",
        category_id: categoryFilter,
        limit: pagination.limit,
        offset: (pagination.currentPage - 1) * pagination.limit,
      };

      const response = await api.get("/articles", { params });

      // Handle different response structures
      const articlesData =
        response.data?.articles || response.data?.data || response.data || [];
      const paginationData = response.data?.pagination || {
        currentPage: 1,
        totalPages: 1,
        total: 0,
      };

      setArticles(Array.isArray(articlesData) ? articlesData : []);
      setPagination((prev) => ({
        ...prev,
        ...paginationData,
      }));
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      toast.error("Failed to load articles");
      setArticles([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await api.get("/categories");
      // Handle different response structures
      const categoriesData = response.data?.data || response.data || [];
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      setCategories([]); // Set empty array on error
    }
  };

  // Load data on mount and when filters change
  useEffect(() => {
    fetchArticles();
  }, [searchTerm, statusFilter, categoryFilter, pagination.currentPage]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateArticle = () => {
    navigate("/admin/create-article");
  };

  const handleEdit = (id) => {
    navigate(`/admin/edit-article/${id}`);
  };

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, articleId: id });
  };

  const confirmDelete = async () => {
    const loadingToast = toast.loading("Deleting article...");

    try {
      await api.delete(`/articles/${deleteModal.articleId}`);

      toast.dismiss(loadingToast);
      toast.success("Article deleted successfully");

      // Refresh articles
      fetchArticles();

      setDeleteModal({ isOpen: false, articleId: null });
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("Failed to delete article");
      console.error("Delete error:", error);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, currentPage: newPage }));
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-gray-800">
          Article management
        </h1>
        <button
          onClick={handleCreateArticle}
          className="bg-gray-900 text-white px-6 py-2 rounded-full hover:bg-gray-800 transition-colors flex items-center cursor-pointer"
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Create article
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black "
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-400 text-black cursor-pointer"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} ({category.article_count || 0})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg p-12 text-center">
          <div className="text-gray-500">Loading articles...</div>
        </div>
      ) : (
        <>
          {/* Articles Table */}
          <ArticleTable
            articles={articles}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <nav className="flex space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Previous
                </button>

                {[...Array(pagination.totalPages)].map((_, index) => (
                  <button
                    key={index + 1}
                    onClick={() => handlePageChange(index + 1)}
                    className={`px-3 py-1 rounded border ${
                      pagination.currentPage === index + 1
                        ? "bg-gray-900 text-white"
                        : "border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                >
                  Next
                </button>
              </nav>
            </div>
          )}

          {/* Empty State */}
          {articles.length === 0 && (
            <div className="bg-white rounded-lg p-12 text-center">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No articles
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new article.
              </p>
              <div className="mt-6">
                <button
                  onClick={handleCreateArticle}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800"
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
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  New Article
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Delete Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, articleId: null })}
        onConfirm={confirmDelete}
        itemType="article"
      />
    </div>
  );
};

export default Dashboard;
