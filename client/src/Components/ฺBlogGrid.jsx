import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BlogCard from "./BlogCard";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function BlogGrid({ searchTerm = '', selectedCategory = 'all' }) {
  const [articles, setArticles] = useState([]);
  const [allArticles, setAllArticles] = useState([]); // Keep original articles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create axios instance
  const api = axios.create({
    baseURL: `${API_URL}/api`,
  });

  useEffect(() => {
    fetchArticles();
  }, []);

  // Filter articles when search term or category changes
  useEffect(() => {
    filterArticles();
  }, [searchTerm, selectedCategory, allArticles]);

  const fetchArticles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/articles', {
        params: {
          status: 'published',
          limit: 20, // Increased to get more articles for filtering
          sort: 'newest'
        }
      });

      const articlesData = response.data?.articles || response.data?.data || response.data || [];
      const processedArticles = Array.isArray(articlesData) ? articlesData : [];
      
      setAllArticles(processedArticles);
      setArticles(processedArticles.slice(0, 6)); // Initially show 6 articles
    } catch (error) {
      console.error('Failed to fetch articles:', error);
      setError('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const filterArticles = () => {
    let filtered = [...allArticles];

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(article => 
        article.title?.toLowerCase().includes(searchLower) ||
        article.excerpt?.toLowerCase().includes(searchLower) ||
        article.content?.toLowerCase().includes(searchLower) ||
        article.category_name?.toLowerCase().includes(searchLower) ||
        article.author_name?.toLowerCase().includes(searchLower)
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      // Map category IDs to filter logic
      const categoryMap = {
        'mclaren-720s': ['720S', 'McLaren 720S'],
        'mclaren-gts': ['GTS', 'McLaren GTS'],
        'mclaren-w1': ['W1', 'McLaren W1'],
        'urus': ['Urus', 'Lamborghini']
      };

      if (categoryMap[selectedCategory]) {
        const searchTerms = categoryMap[selectedCategory];
        filtered = filtered.filter(article => 
          searchTerms.some(term => 
            article.title?.toLowerCase().includes(term.toLowerCase()) ||
            article.category_name?.toLowerCase().includes(term.toLowerCase()) ||
            article.content?.toLowerCase().includes(term.toLowerCase())
          )
        );
      }
    }

    setArticles(filtered.slice(0, 6)); // Show max 6 filtered results
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
      {/* Search Results Info */}
      {(searchTerm || selectedCategory !== 'all') && (
        <div className="max-w-6xl mx-auto mb-6">
          <div className="text-center text-gray-600">
            {searchTerm && (
              <p className="mb-2">
                Search results for: <span className="font-semibold">"{searchTerm}"</span>
              </p>
            )}
            {selectedCategory !== 'all' && (
              <p className="mb-2">
                Category: <span className="font-semibold capitalize">{selectedCategory.replace('-', ' ')}</span>
              </p>
            )}
            <p className="text-sm">
              Found {articles.length} article{articles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* No Results Message */}
      {articles.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <div className="text-gray-500">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.291-1.007-5.691-2.554M15 17h5l-5 5v-5zM9 2h6l5 5v11a2 2 0 01-2 2H9a2 2 0 01-2-2V4a2 2 0 012-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600">
              {searchTerm 
                ? `Try adjusting your search term or browse all articles`
                : `No articles in this category yet`
              }
            </p>
          </div>
        </div>
      )}

      {/* Grid Layout - 2x2 layout like the reference image */}
      {articles.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {articles.map((article) => (
            <BlogCard
              key={article.id}
              articleId={article.id}
              pic={article.featured_image_url ? `${API_URL}${article.featured_image_url}` : "./public/img/mc_homepage.jpg"} // fallback image
              title={article.title}
              description={article.excerpt || article.content?.substring(0, 200) + "..."}
              date={formatDate(article.published_at || article.created_at)}
              categoryName={article.category_name || "Article"}
              authorName={article.author_name || "Unknown Author"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default BlogGrid;
