import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ArticleHeroSection = () => {
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
          sort: 'created_at',
          order: 'DESC'
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
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-center items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26231E]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center text-red-500">
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white py-16">
      <div className="container mx-auto px-4">
        {/* Hero Content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#26231E] mb-4">
            Latest Articles
          </h1>
          <p className="text-lg text-[#75716B] max-w-2xl mx-auto">
            Discover the latest insights, tips, and stories from our community
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>

        {/* View All Link */}
        <div className="text-center mt-12">
          <a 
            href="/articles" 
            className="inline-flex items-center px-6 py-3 bg-[#26231E] text-white rounded-lg hover:bg-[#1a1815] transition-colors duration-300"
          >
            View All Articles
            <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

// Article Card Component
const ArticleCard = ({ article }) => {
  const formatDate = (dateString) => {
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 group">
      {/* Article Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={article.featured_image_url ? 
            `${API_URL}${article.featured_image_url}` : 
            '/img/mc_homepage.jpg'
          }
          alt={article.featured_image_alt || article.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.target.src = '/img/mc_homepage.jpg';
          }}
        />
        
        {/* Category Badge */}
        {article.category_name && (
          <div className="absolute top-4 left-4">
            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
              {article.category_name}
            </span>
          </div>
        )}
      </div>

      {/* Article Content */}
      <div className="p-6">
        {/* Article Title */}
        <h3 className="text-xl font-bold text-[#26231E] mb-3 line-clamp-2 group-hover:text-[#1a1815] transition-colors">
          {article.title}
        </h3>

        {/* Article Excerpt */}
        {article.excerpt && (
          <p className="text-[#75716B] mb-4 line-clamp-3">
            {article.excerpt}
          </p>
        )}

        {/* Author and Date */}
        <div className="flex items-center justify-between text-sm text-[#75716B]">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[#26231E] rounded-full flex items-center justify-center mr-2">
              <span className="text-white font-medium">
                {article.author_name ? article.author_name.charAt(0).toUpperCase() : 'A'}
              </span>
            </div>
            <span>{article.author_name || 'Anonymous'}</span>
          </div>
          <span>{formatDate(article.published_at || article.created_at)}</span>
        </div>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && article.tags[0] !== null && (
          <div className="mt-4 flex flex-wrap gap-2">
            {article.tags.slice(0, 3).map((tag, index) => (
              tag && (
                <span 
                  key={index}
                  className="bg-gray-100 text-[#26231E] px-2 py-1 rounded text-xs"
                >
                  {tag}
                </span>
              )
            ))}
          </div>
        )}

        {/* Read More Link */}
        <div className="mt-4">
          <a 
            href={`/article/${article.slug || article.id}`}
            className="text-[#26231E] font-medium hover:underline flex items-center group-hover:text-[#1a1815] transition-colors"
          >
            Read More
            <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ArticleHeroSection;
