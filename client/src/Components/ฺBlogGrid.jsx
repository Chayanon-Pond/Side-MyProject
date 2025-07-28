import BlogCard from "./BlogCard";

function BlogGrid() {
  const blogPosts = [
    {
      id: 1,
      pic: "./public/img/redmc.jpg",
      title:
        "Understanding Cat Behavior: Why Your Feline Friend Acts the Way They Do",
      description:
        "Dive into the curious world of cat behavior, exploring why cats knead,purr, and chase imaginary prey. This article helps pet owners decode their feline's actions and understand how their instincts as hunters shape their daily routines.",
      date: "11 September 2024",
    },
    {
      id: 2,
      pic: "./public/img/gtsmc.jpg",
      title:
        "Want to compare the 2025 McLaren GT / GTS to other vehicles you're interested in?",
      description:
        "McLaren GTS leverages the company's lightweight architecture and F1-inspired performance tech but offers a more upscale cabin than the brand's other sports cars. A twin-turbocharged V-8 engine offers up 626 horsepower and an adaptive suspension system allows the car to be set for long-distance comfort or racetrack-dominating sharpness. Inside",
      date: "11 September 2024",
    },
    {
      id: 3,
      pic: "./public/img/urus.jpg",
      title:
        "Finding Motivation: How to Stay Inspired Through Life's Challenges",
      description:
        "This article explores strategies to maintain motivation when faced with personal or professional challenges, from setting smart goals to practicing mindfulness and building resilience.",
      date: "11 September 2024",
    },
    {
      id: 4,
      pic: "./public/img/amg.jpg",

      title:
        "The Science of the Cat's Purr: How It Benefits Cats and Humans Alike",
      description:
        "Discover the fascinating science behind the cat's purr, including its potential healing properties for both cats and humans. Learn how this unique sound is produced and its various benefits.",
      date: "11 September 2024",
    },
    {
      id: 5,
      pic: "./public/img/aventador.jpg",

      title:
        "The Science of the Cat's Purr: How It Benefits Cats and Humans Alike",
      description:
        "Discover the fascinating science behind the cat's purr, including its potential healing properties for both cats and humans. Learn how this unique sound is produced and its various benefits.",
      date: "11 September 2024",
    },
    {
      id: 6,
      pic: "./public/img/bmw.jpg",

      title:
        "The Science of the Cat's Purr: How It Benefits Cats and Humans Alike",
      description:
        "Discover the fascinating science behind the cat's purr, including its potential healing properties for both cats and humans. Learn how this unique sound is produced and its various benefits.",
      date: "11 September 2024",
    },
  ];

  return (
    <div className="px-4 py-8 gap-[24px] ">
      {/* Grid Layout - เก็บขนาดเดิม */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto ">
        {blogPosts.map((post) => (
          <BlogCard
            key={post.id}
            pic={post.pic}
            title={post.title}
            description={post.description}
            date={post.date}
          />
        ))}
      </div>
    </div>
  );
}

export default BlogGrid;
