import VotingComponent from '../components/VotingComponent';

const movies = [
    {
      id: 1,
      title: "Malcolm in the Middle",
      image: "https://artworks.thetvdb.com/banners/posters/73838-7.jpg",
      upvotes: 593,
      downvotes: 0,
      description: "A gifted and smart young man tries to navigate life, puberty, and love while trying to survive his often dimwitted, dysfunctional family."
    },
    {
      id: 2,
      title: "New Girl",
      image: "https://artworks.thetvdb.com/banners/posters/248682-9.jpg",
      upvotes: 569,
      downvotes: 0,
      description: "Jessica Day is an offbeat and adorable girl in her late 20s who, after a bad breakup, moves in with three single guys. Goofy, positive, vulnerable and honest to a fault, Jess has faith in people, even when she shouldn't."
    },
    {
      id: 3,
      title: "Star Wars",
      image: "https://artworks.thetvdb.com/banners/movies/11/posters/11.jpg",
      upvotes: 358,
      downvotes: 113,
      description: "With the galaxy is in the midst of a civil war, the rebel alliance spies have fortuitously stolen plans, planted them inside a droid, and sent the droid to a desert planet where it is discovered by a young..."
    },
    {
      id: 4,
      title: "Monty Python and the Holy Grail",
      image: "https://artworks.thetvdb.com/banners/movies/71/posters/71.jpg",
      upvotes: 321,
      downvotes: 80,
      description: "In 932 AD, King Arthur and his squire, Patsy, travel throughout Britain (place name) searching for men to join the Knights of the Round Table. Arthur recruits Bedivere, Lancelot, Galahad, Sir Robin the Not-..."
    },
    {
      id: 5,
      title: "Jurassic Park",
      image: "https://artworks.thetvdb.com/banners/movies/329/posters/329.jpg",
      upvotes: 271,
      downvotes: 60,
      description: "A pragmatic paleontologist touring an almost complete theme park on an island in Central America is tasked with protecting a couple of kids after a power failure causes the park's cloned dinosaurs to run..."
    },
    {
      id: 6,
      title: "Mean Girls",
      image: "https://artworks.thetvdb.com/banners/movies/180/posters/180.jpg",
      upvotes: 277,
      downvotes: 101,
      description: "When sixteen-year-old Cady Heron moves from Africa to the US, she quickly learns that social life at her new high school is run by queen bee Regina George and her mean girl crew, collectively known a..."
    }
  ];

export default function Home() {
  return (
    <div className="container mx-auto p-4 bg-gray-900 mt-24">
      <h1 className="text-2xl font-bold mb-4 text-white">Requests</h1>
      <p className="text-white mb-4">Upvote shows and movies you want on memeSRC</p>
      <VotingComponent movies={movies} />
    </div>
  );
}