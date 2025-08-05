import React from "react";

function ArticleHeader({ article, formatDate }) {
  return (
    <header className="mb-8">
      <div className="flex items-center space-x-4 mb-4">
        <span className="bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-sm font-medium">
          {article.category_name || "Article"}
        </span>
        <span className="text-gray-500 text-sm">
          {formatDate(article.published_at || article.created_at)}
        </span>
      </div>

      <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
        {article.title}
      </h1>

      {article.excerpt && (
        <p className="text-xl text-gray-600 leading-relaxed mb-6">
          {article.excerpt}
        </p>
      )}

      {/* Author Info */}
      <div className="flex items-center space-x-4 py-4 border-y border-gray-200">
        <img
          className="w-12 h-12 rounded-full"
          src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
          alt={article.author_name}
        />
        <div>
          <p className="font-medium text-gray-900">{article.author_name}</p>
          <p className="text-sm text-gray-500">@{article.author_username}</p>
        </div>
        <div className="ml-auto flex items-center space-x-4 text-sm text-gray-500">
          <span>{article.view_count || 0} views</span>
        </div>
      </div>
    </header>
  );
}

export default ArticleHeader;
