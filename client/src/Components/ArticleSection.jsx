
import React, { useState, useEffect } from 'react';

function ArticleSection({ onSearch, onCategoryFilter }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories] = useState([
    { id: 'all', name: 'All Cars' },
    { id: 'mclaren-720s', name: 'McLaren 720S' },
    { id: 'mclaren-gts', name: 'McLaren GTS' },
    { id: 'mclaren-w1', name: 'McLaren W1' },
    { id: 'urus', name: 'Urus' }
  ]);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Call parent component's search function
    if (onSearch) {
      onSearch(value);
    }
  };

  // Handle category filter changes
  const handleCategoryChange = (categoryId) => {
    setSelectedCategory(categoryId);
    // Call parent component's filter function
    if (onCategoryFilter) {
      onCategoryFilter(categoryId);
    }
  };

  // Handle mobile dropdown category change
  const handleMobileCategoryChange = (e) => {
    const value = e.target.value;
    handleCategoryChange(value);
  };

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <section className="bg-gray-500 rounded-xl container mx-auto px-2 py-4 mb-30">
      <div className="md:flex md:flex-row md:justify-between items-center">
        {/* Desktop Category Tabs */}
        <div className="hidden md:flex">
          <div className="flex space-x-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-white text-gray-800 shadow-md'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="md:flex md:flex-row md:justify-center md:items-center md:gap-10">
          <form onSubmit={handleSearchSubmit} className="relative">
            <label className="input bg-white flex items-center">
              <svg 
                className="h-[1em] opacity-50 mr-2" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24"
              >
                <g strokeLinejoin="round" strokeLinecap="round" strokeWidth="2.5" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </g>
              </svg>
              <input 
                type="search" 
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search articles..." 
                className="text-black bg-transparent border-none outline-none flex-1"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    if (onSearch) onSearch('');
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </label>
          </form>
        </div>

        {/* Mobile Category Dropdown */}
        <div className="md:hidden mt-6 w-full">
          <select 
            value={selectedCategory}
            onChange={handleMobileCategoryChange}
            className="select bg-white text-black w-full"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search Results Info */}
      {searchTerm && (
        <div className="mt-4 text-white text-sm">
          <span className="bg-gray-600 px-3 py-1 rounded-full">
            Searching for: "{searchTerm}"
          </span>
        </div>
      )}
    </section>
  );
}
export default ArticleSection