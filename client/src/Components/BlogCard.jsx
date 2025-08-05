import { useNavigate } from 'react-router-dom';

function BlogCard({ pic, title, description, date, categoryName = "Article", authorName = "Unknown Author", articleId }) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (articleId) {
      navigate(`/detail/${articleId}`);
    }
  };

  return (
    <div 
      className="flex flex-col bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative h-64 overflow-hidden">
        <img
          className="w-full h-full object-cover hover:scale-105 ease-in-out duration-300 cursor-pointer"
          src={pic}
          alt={title}
          onError={(e) => {
            e.target.src = "./public/img/mc_homepage.jpg"; // fallback image
          }}
        />
      </div>
      <div className="flex flex-col p-6">
        <div className="flex mb-4">
          <span className="bg-emerald-100 text-emerald-700 rounded-full px-3 py-1 text-sm font-medium">
            {categoryName}
          </span>
        </div>
        <div className="mb-3">
          <h2 className="font-bold text-xl leading-tight text-gray-900 hover:text-gray-700 transition-colors duration-200 line-clamp-2">
            {title}
          </h2>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3">
          {description}
        </p>
        <div className="flex items-center text-sm mt-auto">
          <img
            className="w-8 h-8 rounded-full mr-3"
            src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
            alt={authorName}
          />
          <span className="text-gray-900 font-medium">{authorName}</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="text-gray-500">{date}</span>
        </div>
      </div>
    </div>
  );
}

export default BlogCard;
