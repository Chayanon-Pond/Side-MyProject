import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/authentication";
import NavbarSection from "./NavbarSection";
import FooterSection from "./FooterSection";
import LoginModal from "./ui/LoginModal";
import CommentForm from "./ui/CommentForm";
import CommentList from "./ui/CommentList";
import ArticleHeader from "./ui/ArticleHeader";

// Resolve API base URL consistently (dev uses Vite proxy, prod uses env or same-origin)
const resolveApiUrl = () => {
  const envUrl = (import.meta.env.VITE_API_URL ?? "").trim();
  if (/^https?:\/\//i.test(envUrl)) return envUrl.replace(/\/$/, "");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (
    import.meta.env.DEV &&
    (origin.includes("localhost:5173") || origin.includes("127.0.0.1:5173"))
  ) {
    return "http://localhost:3001";
  }
  return origin || "http://localhost:3001";
};
const API_URL = resolveApiUrl();
const buildAssetUrl = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path; // already absolute (e.g., Cloudinary)
  const joined = `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  return joined;
};
import SocialShare from "./ui/SocialShare";

function CardDetal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const [article, setArticle] = useState(null);
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success'|'error', text: string }

  const showNotice = (type, text, ms = 4000) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), ms);
  };

  // Create axios instance
  const api = axios.create({
    baseURL: import.meta.env.DEV ? "/api" : `${API_URL}/api`,
  });

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug(
      "[CardDetal] api.defaults.baseURL ->",
      api.defaults.baseURL,
      "API_BASE ->",
      API_URL
    );
  }

  // Add token to requests if available
  api.interceptors.request.use((config) => {
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    fetchArticle();
    fetchComments();
  }, [id]);

  // After comments fetched, if URL has a comment anchor/query, scroll to it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const commentId = params.get("comment");
    const hash = window.location.hash;

    // Scroll to comments section
    if (hash === "#comments") {
      const el = document.getElementById("comments");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    // Scroll to specific comment
    if (commentId) {
      const targetId = `comment-${commentId}`;
      // slight delay to ensure render
      setTimeout(() => {
        const node = document.getElementById(targetId);
        if (node) node.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    }
  }, [comments]);

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/articles/${id}`);
      console.log("Article response:", response.data); // Debug log

      const articleData = response.data.data || response.data;
      const relatedData = response.data.relatedArticles || [];
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[CardDetal] article fetched:", {
          id: articleData?.id,
          title: articleData?.title,
          featured_image_url: articleData?.featured_image_url,
        });
      }

      setArticle(articleData);
      setRelatedArticles(relatedData);

      // Increment view count
      try {
        await api.post(`/articles/${id}/view`);
      } catch (viewError) {
        console.warn("Failed to increment view count:", viewError);
      }
    } catch (error) {
      console.error("Failed to fetch article:", error);
      setError("Failed to load article");
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await api.get(`/comments/article/${id}`);
      console.log("Comments response:", response.data); // Debug log
      setComments(response.data.comments || response.data || []);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      setComments([]); // Set empty array on error
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();

    if (!user || !token) {
      // Show modal instead of alert
      setShowLoginModal(true);
      return;
    }

    if (!commentText.trim()) {
      showNotice("error", "Please enter a comment");
      return;
    }

    if (commentText.length > 1000) {
      showNotice(
        "error",
        "Comment is too long. Maximum 1000 characters allowed."
      );
      return;
    }

    console.log(
      "Submitting comment with token:",
      token ? "Token exists" : "No token"
    );
    console.log("User:", user);

    setSubmittingComment(true);
    try {
      const response = await api.post(`/comments/article/${id}`, {
        content: commentText.trim(),
      });

      setCommentText("");
      fetchComments(); // Refresh comments
      showNotice("success", "Comment posted successfully!");
    } catch (error) {
      console.error("Failed to post comment:", error);
      if (error.response?.status === 401) {
        showNotice("error", "Your session has expired. Please login again.");
        navigate("/login");
      } else {
        showNotice("error", "Failed to post comment. Please try again.");
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReplySubmit = async (parentId) => {
    if (!user || !token) {
      setShowLoginModal(true);
      return;
    }

    if (!replyText.trim()) {
      showNotice("error", "Please enter a reply");
      return;
    }

    if (replyText.length > 1000) {
      showNotice(
        "error",
        "Reply is too long. Maximum 1000 characters allowed."
      );
      return;
    }

    try {
      await api.post(`/comments/article/${id}`, {
        content: replyText.trim(),
        parent_id: parentId,
      });

      setReplyText("");
      setReplyingTo(null);
      fetchComments(); // Refresh comments
      showNotice("success", "Reply posted successfully!");
    } catch (error) {
      console.error("Failed to post reply:", error);
      if (error.response?.status === 401) {
        showNotice("error", "Your session has expired. Please login again.");
        navigate("/login");
      } else {
        showNotice("error", "Failed to post reply. Please try again.");
      }
    }
  };

  const formatDate = (dateString) => {
    const options = {
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatCommentDate = (dateString) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInHours = Math.floor((now - commentDate) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavbarSection />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded mb-4"></div>
            <div className="h-64 bg-gray-300 rounded mb-6"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </div>
        <FooterSection />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavbarSection />
        <div className="max-w-4xl mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Article Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error || "The article you are looking for does not exist."}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Back to Home
          </button>
        </div>
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavbarSection />

      {/* Article Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-6 transition-colors cursor-pointer"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>

        {/* Article Header */}
        <ArticleHeader article={article} formatDate={formatDate} />

        {/* Featured Image */}
        {article?.featured_image_url && (
          <div className="mb-8">
            <img
              className="w-full h-96 object-cover rounded-lg"
              src={buildAssetUrl(article.featured_image_url)}
              alt={
                article.featured_image_alt || article.title || "Article image"
              }
              onError={(e) => {
                e.target.src = "./public/img/mc_homepage.jpg";
              }}
            />
          </div>
        )}

        {/* Article Content */}
        <div className="prose prose-lg max-w-none mb-12">
          <div
            className="text-gray-800 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: article?.content || "" }}
          />
        </div>

        {/* Social Share */}
        <SocialShare />

        {/* Comments Section */}
        <section id="comments" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Comments ({comments?.length || 0})
          </h2>

          {notice && (
            <div
              className={`mb-4 px-4 py-2 rounded ${
                notice.type === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }`}
            >
              {notice.text}
            </div>
          )}

          {/* Comment Form */}
          <CommentForm
            commentText={commentText}
            setCommentText={setCommentText}
            onSubmit={handleCommentSubmit}
            submittingComment={submittingComment}
            onLoginRequired={() => setShowLoginModal(true)}
          />

          {/* Comments List */}
          <CommentList
            comments={comments}
            user={user}
            replyingTo={replyingTo}
            setReplyingTo={setReplyingTo}
            replyText={replyText}
            setReplyText={setReplyText}
            onReplySubmit={handleReplySubmit}
            onLoginRequired={() => setShowLoginModal(true)}
            formatCommentDate={formatCommentDate}
            onCommentUpdated={fetchComments}
          />
        </section>

        {/* Related Articles */}
        {relatedArticles?.length > 0 && (
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Related Articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedArticles.map((related) => (
                <div
                  key={related.id}
                  className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/detail/${related.id}`)}
                >
                  <img
                    className="w-full h-48 object-cover"
                    src={
                      related.featured_image_url
                        ? buildAssetUrl(related.featured_image_url)
                        : "./public/img/mc_homepage.jpg"
                    }
                    alt={related.title}
                  />
                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-2 line-clamp-2">
                      {related.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-2">
                      {related.excerpt}
                    </p>
                    <p className="text-gray-500 text-xs mt-2">
                      {formatDate(related.published_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      <FooterSection />
    </div>
  );
}

export default CardDetal;
