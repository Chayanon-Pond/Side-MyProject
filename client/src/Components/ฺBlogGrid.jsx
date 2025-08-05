import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BlogCard from "./BlogCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function BlogGrid() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create axios instance
  const api = axios.create({
    baseURL: `${API_URL}/api`,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/articles', {
        params: {
          status: 'published',
          limit: 6, // แสดง 6 บทความ
          sort: 'newest'
        }
      });

      const articlesData = response.data?.articles || response.data?.data || response.data || [];
      setArticles(Array.isArray(articlesData) ? articlesData : []);
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  if (loading) {
    return (
      <div className="px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-300 h-64 rounded-lg mb-4"></div>
              <div className="h-4 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="text-center text-red-500">
          <p>{error}</p>
          <button 
            onClick={fetchArticles}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8">
      {/* Grid Layout - 2x2 layout like the reference image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {articles.map((article) => (
          <BlogCard
            key={article.id}
            articleId={article.id}
            pic={article.featured_image_url || "./public/img/mc_homepage.jpg"} // fallback image
            title={article.title}
            description={article.excerpt || article.content?.substring(0, 200) + "..."}
            date={formatDate(article.published_at || article.created_at)}
            categoryName={article.category_name || "Article"}
            authorName={article.author_name || "Unknown Author"}
          />
        ))}
      </div>
    </div>
  );
}

export default BlogGrid;
