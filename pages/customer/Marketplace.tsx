import React, { useEffect, useState } from 'react';
import { getApprovedProducts } from '../../services/api';
import { Product } from '../../types';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const Marketplace: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const { addItem, addingIds } = useCart();
  const { profile } = useAuth();

  useEffect(() => {
    loadProducts();
  }, [category, location]); // Reload when category or location changes

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % 5); // 5 banner images
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getApprovedProducts(category === 'All' ? '' : category, searchTerm, location);
      setProducts(data || []);
      
      // Load featured products (first 5 approved products for carousel)
      if (!category || category === 'All') {
        const featured = await getApprovedProducts('', '', '');
        setFeaturedProducts((featured || []).slice(0, 5));
        setCarouselIndex(0);
      }
      
      // Extract unique locations from all approved products
      const allProducts = await getApprovedProducts('', '', '');
      const locations = Array.from(new Set((allProducts || []).map(p => p.location).filter(Boolean))) as string[];
      setAvailableLocations(locations.sort());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Clear location filters when searching for products
    setLocation('');
    setLocationInput('');
    // Search only by product name and category, ignoring location
    loadProductsBySearch();
  };

  const loadProductsBySearch = async () => {
    setLoading(true);
    try {
      const data = await getApprovedProducts(category === 'All' ? '' : category, searchTerm, '');
      setProducts(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Location filtering happens when Enter is pressed
    setLocation(locationInput);
  };

  const categories = ['All', 'Vegetables', 'Fruits'];

  // Banner images of farmers working in fields
  const bannerImages = [
    {
      image: '/images/image1.jpg',
      title: 'Fresh Vegetables',
      description: 'Directly from local farmers to your table'
    },
    {
      image: '/images/image2.jpg',
      title: 'Organic Fruits',
      description: 'Naturally grown, healthily delivered'
    },
    {
      image: '/images/image3.jpg',
      title: 'Support Local Farmers',
      description: 'Buy direct and build community'
    },
    {
      image: '/images/image4.jpg',
      title: 'Farm Fresh Quality',
      description: 'Harvest today, eat tomorrow'
    },
    {
      image: '/images/image5.jpg',
      title: 'Seasonal Harvest',
      description: 'Nature\'s best at every season'
    }
  ];

  const handleCarouselNext = () => {
    setCarouselIndex((prev) => (prev + 1) % bannerImages.length);
  };

  const handleCarouselPrev = () => {
    setCarouselIndex((prev) => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Farmer Banner Carousel */}
      <div className="relative w-full bg-white shadow-md overflow-hidden" style={{ height: 'clamp(200px, 50vh, 400px)' }}>
        <div className="relative w-full h-full">
          {bannerImages.map((banner, idx) => (
            <div
              key={idx}
              className={`absolute w-full h-full transition-opacity duration-500 ${
                idx === carouselIndex ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="relative w-full h-full">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/30"></div>
                
                {/* Banner Text - Responsive */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-4">{banner.title}</h2>
                  <p className="text-xs sm:text-sm md:text-lg lg:text-xl text-white/90">{banner.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Controls */}
        <button
          onClick={handleCarouselPrev}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 sm:p-3 rounded-full shadow-lg transition z-10"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
        </button>
        <button
          onClick={handleCarouselNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 sm:p-3 rounded-full shadow-lg transition z-10"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {bannerImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCarouselIndex(idx)}
              className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition ${
                idx === carouselIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Fresh from the Farm</h1>
          <p className="text-gray-600">Support local farmers directly.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="relative flex-1 sm:flex-none">
            <input 
              type="text" 
              placeholder="Search items..." 
              className="pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary w-full sm:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </form>
          <select 
            className="px-4 py-2 border rounded-md bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
          <form onSubmit={handleLocationSearch} className="relative flex-1 sm:flex-none">
            <input 
              type="text" 
              placeholder="Search location..." 
              className="pl-10 pr-4 py-2 border rounded-md focus:ring-primary focus:border-primary w-full sm:w-64"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </form>
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading fresh produce...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">No products found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition overflow-hidden border border-gray-100">
              <div className="h-48 bg-gray-200 relative">
                <img 
                  src={product.image_url || 'https://picsum.photos/400/300'} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 bg-white/90 px-2 py-1 text-xs font-bold rounded-full uppercase tracking-wider text-primary">
                  {product.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-bold text-gray-900 truncate">{product.name}</h3>
                <p className="text-gray-500 text-sm mb-3 line-clamp-2 h-10">{product.description}</p>
                
                {product.location && (
                  <div className="mb-2 text-xs text-gray-600 font-medium">
                    📍 Location: <span className="text-gray-700">{product.location}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-primary">रु {product.price}</span>
                    {profile?.role === 'customer' && (
                      <button
                        onClick={() => addItem(product.id, 1)}
                        disabled={addingIds.includes(product.id)}
                        className={`bg-primary text-white p-2 rounded-full transition flex items-center gap-1 ${addingIds.includes(product.id) ? 'opacity-60 cursor-wait' : 'hover:bg-green-700'}`}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Stock: {product.stock_quantity} kg available
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Marketplace;
