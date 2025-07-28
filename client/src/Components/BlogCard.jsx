function BlogCard({ pic, title, description, date }) {
  return (
    <div className="flex flex-col gap-24 w-[590px] h-[360px] ">
      <div href="#" className="relative h-[212px] sm:h-[360px]">
        <img
          className="w-[590px] h-[360px] border-radius-[16px] object-cover rounded-md hover:scale-105 ease-in-out duration-300 cursor-pointer"
          src={pic}
          alt={title}
        />
      </div>
      <div className="flex flex-col mt-7">
        <div className="flex">
          <span className="bg-green-200 rounded-full px-3 py-1 text-sm font-semibold text-green-600 mb-2">
            car
          </span>
        </div>
        <a href="#">
          <h2 className="text-start font-bold text-xl mb-2 line-clamp-2 hover:underline text-[#26231E]">
            {title}
          </h2>
        </a>
        <p className="text-muted-foreground text-sm mb-4 flex-grow line-clamp-3 text-[#75716B]">
          {description}
        </p>
        <div className="flex items-center text-sm">
          <img
            className="w-8 h-8 rounded-full mr-2"
            src="https://res.cloudinary.com/dcbpjtd1r/image/upload/v1728449784/my-blog-post/xgfy0xnvyemkklcqodkg.jpg"
          />
          <span className="text-[#43403B]">Thompson P.</span>
          <span className="mx-2 text-gray-300">|</span>
          <span className="text-[#75716B]">{date}</span>
        </div>
      </div>
    </div>
  );
}

export default BlogCard;
