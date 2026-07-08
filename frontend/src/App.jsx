import React, { useState, useEffect } from 'react';
import { 
  Recycle, 
  Shield, 
  Coins, 
  Truck, 
  Leaf, 
  Calendar, 
  Scale, 
  Smartphone, 
  Laptop, 
  Monitor, 
  Printer, 
  Tv, 
  Refrigerator, 
  WashingMachine, 
  Battery, 
  BatteryCharging, 
  Cable, 
  Wifi, 
  Volume2,
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Minus, 
  Send, 
  Star, 
  ArrowRight,
  Search,
  CheckCircle,
  HelpCircle,
  Menu,
  X
} from 'lucide-react';
import './App.css';

// Custom inline SVG components for social brand logos (removed in Lucide v1+)
const Facebook = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const Instagram = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

const Linkedin = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const Twitter = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
  </svg>
);

const Youtube = (props) => (
  <svg viewBox="0 0 24 24" width="1em" height="1em" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
  </svg>
);

// All Categories Data
const ALL_CATEGORIES = [
  { id: 1, name: 'Smartphones', icon: Smartphone, price: '₹150 - ₹2,500', desc: 'Old androids, iPhones, keypad phones.' },
  { id: 2, name: 'Laptops', icon: Laptop, price: '₹500 - ₹8,000', desc: 'Working or broken personal laptops.' },
  { id: 3, name: 'Desktops', icon: Monitor, price: '₹800 - ₹10,000', desc: 'Monitors, CPUs, and desktop units.' },
  { id: 4, name: 'Printers', icon: Printer, price: '₹200 - ₹1,500', desc: 'Laserjet, inkjet, and scanner units.' },
  { id: 5, name: 'Televisions', icon: Tv, price: '₹300 - ₹4,000', desc: 'LED, LCD, and CRT televisions.' },
  { id: 6, name: 'Refrigerators', icon: Refrigerator, price: '₹600 - ₹5,000', desc: 'Single/double door household fridges.' },
  { id: 7, name: 'Washing Machines', icon: WashingMachine, price: '₹500 - ₹4,500', desc: 'Top or front load washers.' },
  { id: 8, name: 'Batteries', icon: Battery, price: '₹50 - ₹1,200', desc: 'UPS, laptop, and lithium batteries.' },
  { id: 9, name: 'Chargers', icon: BatteryCharging, price: '₹10 - ₹100', desc: 'Power adapters and mobile chargers.' },
  { id: 10, name: 'Cables & Wires', icon: Cable, price: '₹20 - ₹250', desc: 'Copper cables, HDMI, and power cords.' },
  { id: 11, name: 'Routers & Modems', icon: Wifi, price: '₹50 - ₹500', desc: 'Wi-Fi routers, modems, switches.' },
  { id: 12, name: 'Speakers', icon: Volume2, price: '₹100 - ₹2,000', desc: 'Home theatres, bluetooth speakers.' }
];

// Testimonials Data
const TESTIMONIALS = [
  {
    id: 1,
    name: 'Rahul Sharma',
    city: 'New Delhi',
    rating: 5,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    text: 'E-Waste Connect is amazing! The pickup executive arrived exactly on time, weighed my old laptop and monitor, and I received the UPI payment in my bank account within minutes. Absolutely hassle-free!'
  },
  {
    id: 2,
    name: 'Sneha Mehta',
    city: 'Bangalore',
    rating: 5,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    text: 'We used their corporate recycling service to dispose of 50+ outdated laptops and office cables. They provided a green data destruction certificate and offered the best scrap rate. Highly recommended!'
  },
  {
    id: 3,
    name: 'Amit Patel',
    city: 'Mumbai',
    rating: 5,
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    text: 'Fantastic user experience! The website is super clean and booking a pickup took less than 2 minutes. Doing a small part for the environment and getting paid for it is a win-win.'
  }
];

// FAQs Data
const FAQS = [
  {
    question: 'How do I schedule a pickup?',
    answer: 'Simply click on any "Schedule a Pickup" button, enter your details (name, phone, address, and types of electronic items), select a convenient date and time slot, and submit the booking. We will send you a confirmation message!'
  },
  {
    question: 'How is the price calculated for my e-waste?',
    answer: 'The price is calculated based on the type of device, its brand, working condition, and age. During collection, our executive will inspect and weigh the items using certified scales, verifying the value against our live market price matrix.'
  },
  {
    question: 'Is my personal data securely erased?',
    answer: 'Yes, data security is our top priority. We use certified data wiping software (compliant with NIST SP 800-88 standards) to completely destroy data on all hard drives, smartphones, and storage devices. We can also provide a data destruction certificate upon request.'
  },
  {
    question: 'When and how do I receive the payment?',
    answer: 'You will receive the payment immediately on your doorstep after the physical inspection and evaluation of the items. You can choose to be paid instantly via UPI (GPay/PhonePe), Direct Bank Transfer, or digital wallets.'
  },
  {
    question: 'What types of items are accepted?',
    answer: 'We accept almost all electronic waste, including smartphones, laptops, desktop computers, printers, TVs, home appliances (fridges, washing machines), lithium batteries, routers, copper cables, adapters, and chargers.'
  }
];

function App() {
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // E-Waste Categories Pagination & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Price Estimator State
  const [estimatorDevice, setEstimatorDevice] = useState('Smartphones');
  const [estimatorBrand, setEstimatorBrand] = useState('Apple');
  const [estimatorCondition, setEstimatorCondition] = useState('Working');
  const [estimatorAge, setEstimatorAge] = useState('1-3 years');
  const [estimatedValue, setEstimatedValue] = useState(null);

  // Testimonials Carousel State
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // FAQs Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  // Newsletter State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Pickup Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    name: '',
    phone: '',
    address: '',
    deviceType: 'Smartphones',
    pickupDate: ''
  });

  // Handle Search & Filter Categories
  const filteredCategories = ALL_CATEGORIES.filter(cat => 
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = filteredCategories.slice(indexOfFirstItem, indexOfLastItem);

  // Reset page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Estimate Price Handler
  const handleEstimate = (e) => {
    e.preventDefault();
    let baseVal = 2000;
    
    // Base values per device type
    if (estimatorDevice === 'Smartphones') baseVal = 2500;
    else if (estimatorDevice === 'Laptops') baseVal = 6000;
    else if (estimatorDevice === 'Desktops') baseVal = 7000;
    else if (estimatorDevice === 'Printers') baseVal = 1000;
    else if (estimatorDevice === 'Televisions') baseVal = 2500;
    else if (estimatorDevice === 'Refrigerators') baseVal = 4000;
    else if (estimatorDevice === 'Washing Machines') baseVal = 3500;
    else if (estimatorDevice === 'Batteries') baseVal = 800;
    else baseVal = 150; // chargers, cables, routers

    // Brand modifier
    let brandMultiplier = 1.0;
    if (estimatorBrand === 'Apple') brandMultiplier = 1.4;
    else if (estimatorBrand === 'Samsung') brandMultiplier = 1.25;
    else if (['Dell', 'HP', 'Lenovo'].includes(estimatorBrand)) brandMultiplier = 1.15;
    
    // Condition modifier
    let conditionMultiplier = 1.0;
    if (estimatorCondition === 'Working') conditionMultiplier = 1.0;
    else if (estimatorCondition === 'Defective') conditionMultiplier = 0.55;
    else if (estimatorCondition === 'Completely Broken') conditionMultiplier = 0.25;

    // Age modifier
    let ageMultiplier = 1.0;
    if (estimatorAge === 'Less than 1 year') ageMultiplier = 1.3;
    else if (estimatorAge === '1-3 years') ageMultiplier = 1.0;
    else if (estimatorAge === '3-5 years') ageMultiplier = 0.7;
    else ageMultiplier = 0.35;

    const estimatedResult = Math.round(baseVal * brandMultiplier * conditionMultiplier * ageMultiplier);
    // Add variations for range representation
    setEstimatedValue({
      min: Math.max(50, Math.round(estimatedResult * 0.85)),
      max: Math.round(estimatedResult * 1.15)
    });
  };

  // Testimonials Carousel Controls
  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % TESTIMONIALS.length);
  };
  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  // FAQs Accordion Control
  const toggleFaq = (index) => {
    setOpenFaqIndex((prev) => (prev === index ? null : index));
  };

  // Newsletter Submit
  const handleNewsletterSubmit = (e) => {
    e.preventDefault();
    if (newsletterEmail) {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setTimeout(() => setNewsletterSubscribed(false), 5000);
    }
  };

  // Booking Form Submit
  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (bookingForm.name && bookingForm.phone && bookingForm.address) {
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setBookingModalOpen(false);
        setBookingForm({
          name: '',
          phone: '',
          address: '',
          deviceType: 'Smartphones',
          pickupDate: ''
        });
      }, 3000);
    }
  };

  return (
    <div className="app-container">
      {/* Navigation Header */}
      <header className="navbar-header glass">
        <div className="container nav-content">
          <a href="#home" className="nav-logo">
            <div className="logo-icon">
              <Recycle className="logo-svg" size={20} />
            </div>
            <span className="logo-text">E-Waste Connect</span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="nav-links">
            <a href="#home" className="nav-link">Home</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="#why-us" className="nav-link">Why Us</a>
            <a href="#categories" className="nav-link">Pricing</a>
            <a href="#about-us" className="nav-link">About Us</a>
            <a href="#contact" className="nav-link">Contact</a>
          </nav>

          {/* Action Buttons */}
          <div className="nav-actions">
            <button className="btn btn-outline login-btn">Login</button>
            <button className="btn btn-filled signup-btn" onClick={() => setBookingModalOpen(true)}>Sign Up</button>
            <button className="mobile-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="mobile-drawer glass">
            <nav className="mobile-nav-links">
              <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
              <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
              <a href="#why-us" onClick={() => setMobileMenuOpen(false)}>Why Us</a>
              <a href="#categories" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#about-us" onClick={() => setMobileMenuOpen(false)}>About Us</a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
            </nav>
            <div className="mobile-nav-actions">
              <button className="btn btn-outline w-full" onClick={() => setMobileMenuOpen(false)}>Login</button>
              <button className="btn btn-filled w-full" onClick={() => { setBookingModalOpen(true); setMobileMenuOpen(false); }}>Sign Up</button>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="section hero-section glow-effect">
        <div className="container hero-grid">
          {/* Left Column: Heading and CTAs */}
          <div className="hero-content">
            <h1 className="hero-title">
              Recycle Today,<br />
              Create a Better<br />
              <span className="green-highlight">Tomorrow.</span>
            </h1>
            <p className="hero-description">
              We make e-waste disposal easy by connecting users with certified recyclers. 
              Schedule pickups, receive instant valuation, earn rewards, and help build a greener future.
            </p>
            <div className="hero-ctas">
              <button className="btn btn-filled btn-large" onClick={() => setBookingModalOpen(true)}>
                <Calendar size={18} className="btn-icon-left" />
                Schedule a Pickup
              </button>
              <a href="#estimator" className="btn btn-outline btn-large">
                Check E-Waste Value
              </a>
            </div>
            <div className="hero-social-proof">
              <div className="avatars-group">
                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Customer" className="avatar-img" />
                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" alt="Customer" className="avatar-img" />
                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100" alt="Customer" className="avatar-img" />
              </div>
              <div className="social-proof-info">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p className="social-proof-text">Trusted by <span className="highlight-dark">10,000+</span> happy customers</p>
              </div>
            </div>
          </div>

          {/* Right Column: 3D Illustration & Floating Cards */}
          <div className="hero-visual">
            <div className="illustration-container animate-float-slow">
              <img 
                src="/ewaste_bin.png" 
                alt="Green recycling bin overflowing with electronics" 
                className="main-3d-illustration" 
              />
              
              {/* Floating Cards */}
              <div className="floating-card card-1 animate-float">
                <span className="card-emoji">💰</span>
                <div className="card-text">
                  <h4>Get Paid</h4>
                  <p>Earn money for your e-waste.</p>
                </div>
              </div>

              <div className="floating-card card-2 animate-float-delayed">
                <span className="card-emoji">♻️</span>
                <div className="card-text">
                  <h4>Certified Recycling</h4>
                  <p>100% environmentally safe disposal.</p>
                </div>
              </div>

              <div className="floating-card card-3 animate-float">
                <span className="card-emoji">🚚</span>
                <div className="card-text">
                  <h4>Free Pickup</h4>
                  <p>Doorstep collection available.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section id="why-us" className="section why-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Why Choose E-Waste Connect?</h2>
            <div className="title-bar"></div>
          </div>

          <div className="why-grid">
            {/* Card 1: Safe & Secure */}
            <div className="why-card">
              <div className="icon-wrapper">
                <Shield size={28} />
              </div>
              <h3>Safe & Secure</h3>
              <p>Your personal data is securely wiped before recycling.</p>
            </div>

            {/* Card 2: Best Price */}
            <div className="why-card">
              <div className="icon-wrapper">
                <Coins size={28} />
              </div>
              <h3>Best Price</h3>
              <p>Get the highest market value based on weight and condition.</p>
            </div>

            {/* Card 3: Doorstep Pickup */}
            <div className="why-card">
              <div className="icon-wrapper">
                <Truck size={28} />
              </div>
              <h3>Doorstep Pickup</h3>
              <p>Convenient pickup at your preferred time.</p>
            </div>

            {/* Card 4: Eco-Friendly */}
            <div className="why-card">
              <div className="icon-wrapper">
                <Leaf size={28} />
              </div>
              <h3>Eco-Friendly</h3>
              <p>Reduce pollution through responsible recycling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section how-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">How It Works</h2>
            <div className="title-bar"></div>
          </div>

          <div className="timeline-container">
            {/* Step 1 */}
            <div className="timeline-step">
              <div className="step-number">1</div>
              <div className="timeline-icon">
                <Calendar size={32} />
              </div>
              <h4>Schedule Pickup</h4>
              <p>Choose date and address.</p>
            </div>

            <div className="timeline-arrow">
              <ArrowRight size={24} />
            </div>

            {/* Step 2 */}
            <div className="timeline-step">
              <div className="step-number">2</div>
              <div className="timeline-icon">
                <Truck size={32} />
              </div>
              <h4>Pickup</h4>
              <p>Executive collects e-waste.</p>
            </div>

            <div className="timeline-arrow">
              <ArrowRight size={24} />
            </div>

            {/* Step 3 */}
            <div className="timeline-step">
              <div className="step-number">3</div>
              <div className="timeline-icon">
                <Scale size={32} />
              </div>
              <h4>Inspection</h4>
              <p>Items weighed & evaluated.</p>
            </div>

            <div className="timeline-arrow">
              <ArrowRight size={24} />
            </div>

            {/* Step 4 */}
            <div className="timeline-step">
              <div className="step-number">4</div>
              <div className="timeline-icon">
                <Coins size={32} />
              </div>
              <h4>Instant Payment</h4>
              <p>Paid instantly via UPI or transfer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* E-Waste Categories & Directory (with Search & Pagination) */}
      <section id="categories" className="section categories-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">E-Waste Categories We Recycle</h2>
            <p className="section-subtitle">Browse through categories to view estimated market valuation rates.</p>
            <div className="title-bar"></div>
          </div>

          {/* Search Controls */}
          <div className="search-bar-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input 
                type="text" 
                placeholder="Search categories... (e.g. Laptop, Battery)" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>

          {/* Categories Grid */}
          <div className="categories-grid">
            {currentCategories.length > 0 ? (
              currentCategories.map((cat) => {
                const IconComponent = cat.icon;
                return (
                  <div key={cat.id} className="category-card hover-lift">
                    <div className="cat-icon-wrapper">
                      <IconComponent size={28} />
                    </div>
                    <h3>{cat.name}</h3>
                    <p className="cat-desc">{cat.desc}</p>
                    <div className="cat-price-badge">
                      <span>Average Price:</span>
                      <strong>{cat.price}</strong>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="no-results">
                <p>No categories found matching "{searchTerm}". Please try another search term.</p>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination-wrapper">
              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft size={20} />
                Prev
              </button>

              <div className="page-numbers">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button 
                    key={pageNum} 
                    className={`page-num-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button 
                className="pagination-btn" 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Instant Price Estimator Section */}
      <section id="estimator" className="section estimator-section glow-effect">
        <div className="container estimator-grid">
          <div className="estimator-content">
            <h2 className="section-title text-left">Instant Price Estimator</h2>
            <p className="section-subtitle text-left">
              Select your device details below to get a real-time price estimation of your e-waste recyclables immediately.
            </p>
            <div className="estimator-benefits">
              <div className="benefit-item">
                <CheckCircle className="green-text" size={18} />
                <span>Fair pricing based on market scrap metal index</span>
              </div>
              <div className="benefit-item">
                <CheckCircle className="green-text" size={18} />
                <span>Calculated instant value for functioning devices</span>
              </div>
              <div className="benefit-item">
                <CheckCircle className="green-text" size={18} />
                <span>Zero service or transport deduction charges</span>
              </div>
            </div>
          </div>

          {/* Calculator Card */}
          <div className="estimator-card glass">
            <form onSubmit={handleEstimate} className="estimator-form">
              <div className="form-group">
                <label>Device Type</label>
                <select 
                  value={estimatorDevice} 
                  onChange={(e) => setEstimatorDevice(e.target.value)}
                  className="form-select"
                >
                  <option value="Smartphones">Smartphones</option>
                  <option value="Laptops">Laptops</option>
                  <option value="Desktops">Desktops & Monitors</option>
                  <option value="Printers">Printers & Scanners</option>
                  <option value="Televisions">Televisions</option>
                  <option value="Refrigerators">Refrigerators</option>
                  <option value="Washing Machines">Washing Machines</option>
                  <option value="Batteries">Batteries</option>
                  <option value="Accessories">Cables & Chargers</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Brand</label>
                  <select 
                    value={estimatorBrand} 
                    onChange={(e) => setEstimatorBrand(e.target.value)}
                    className="form-select"
                  >
                    <option value="Apple">Apple</option>
                    <option value="Samsung">Samsung</option>
                    <option value="Dell">Dell</option>
                    <option value="HP">HP</option>
                    <option value="Lenovo">Lenovo</option>
                    <option value="LG">LG</option>
                    <option value="Acer">Acer</option>
                    <option value="Asus">Asus</option>
                    <option value="Xiaomi">Xiaomi</option>
                    <option value="Generic">Other / Local</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Condition</label>
                  <select 
                    value={estimatorCondition} 
                    onChange={(e) => setEstimatorCondition(e.target.value)}
                    className="form-select"
                  >
                    <option value="Working">Working (Minor wear)</option>
                    <option value="Defective">Defective (Functional issue)</option>
                    <option value="Completely Broken">Completely Broken / Scrap</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Age of Device</label>
                <select 
                  value={estimatorAge} 
                  onChange={(e) => setEstimatorAge(e.target.value)}
                  className="form-select"
                >
                  <option value="Less than 1 year">Less than 1 year</option>
                  <option value="1-3 years">1-3 years</option>
                  <option value="3-5 years">3-5 years</option>
                  <option value="More than 5 years">More than 5 years</option>
                </select>
              </div>

              <button type="submit" className="btn btn-filled w-full btn-large">
                Get Instant Estimate
              </button>
            </form>

            {/* Estimation Results Display */}
            {estimatedValue && (
              <div className="estimate-result-card animate-float">
                <span className="result-label">Estimated Payout Value:</span>
                <span className="result-value">{estimatedValue.min} - {estimatedValue.max}</span>
                <p className="result-notice">Final price may vary based on structural damage and doorstep weight evaluation.</p>
                <button className="btn btn-filled btn-small w-full mt-3" onClick={() => setBookingModalOpen(true)}>
                  Book Pickup at this Price
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why Recycle Section (Earth and Stats) */}
      <section id="about-us" className="section why-recycle-section">
        <div className="container recycle-grid">
          {/* Left Side: Earth visual */}
          <div className="recycle-visual glow-effect">
            <img 
              src="/earth_leaves.png" 
              alt="Planet Earth covered in green leaves" 
              className="earth-illustration animate-float" 
            />
          </div>

          {/* Right Side: Stats */}
          <div className="recycle-content">
            <h2 className="section-title text-left">Why Recycle Electronic Waste?</h2>
            <p className="section-subtitle text-left">
              E-waste is the fastest-growing waste stream globally. Recycling it recovers precious materials and prevents toxic chemicals from entering soil and water.
            </p>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <Leaf className="stat-icon" size={24} />
                </div>
                <div>
                  <h4>250kg CO₂ Saved</h4>
                  <p>Average carbon emissions reduction per recycled computing system.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <Recycle className="stat-icon" size={24} />
                </div>
                <div>
                  <h4>95% Recyclables Recovered</h4>
                  <p>Extract and reuse precious gold, copper, silver, and rare earth metals.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <BatteryCharging className="stat-icon" size={24} />
                </div>
                <div>
                  <h4>Less Electronic Waste</h4>
                  <p>Divert mercury, lead, and cadmium chemicals from municipal landfills.</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrapper">
                  <Shield className="stat-icon" size={24} />
                </div>
                <div>
                  <h4>Cleaner Environment</h4>
                  <p>Actively participate in circular economy manufacturing programs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className="section reviews-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Customer Reviews</h2>
            <div className="title-bar"></div>
          </div>

          <div className="testimonial-carousel-container">
            <button className="carousel-control prev" onClick={prevTestimonial}>
              <ChevronLeft size={24} />
            </button>

            <div className="testimonial-card glass">
              <div className="reviewer-info">
                <img 
                  src={TESTIMONIALS[currentTestimonial].photo} 
                  alt={TESTIMONIALS[currentTestimonial].name} 
                  className="reviewer-img" 
                />
                <div>
                  <h4>{TESTIMONIALS[currentTestimonial].name}</h4>
                  <p className="reviewer-city">{TESTIMONIALS[currentTestimonial].city}</p>
                </div>
                <div className="rating-stars-badge">
                  {Array.from({ length: TESTIMONIALS[currentTestimonial].rating }).map((_, i) => (
                    <Star key={i} size={16} fill="#fbbf24" stroke="#fbbf24" />
                  ))}
                </div>
              </div>
              <p className="testimonial-text">
                "{TESTIMONIALS[currentTestimonial].text}"
              </p>
            </div>

            <button className="carousel-control next" onClick={nextTestimonial}>
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="carousel-indicators">
            {TESTIMONIALS.map((_, index) => (
              <button 
                key={index} 
                className={`indicator-dot ${currentTestimonial === index ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Partner Companies */}
      <section className="section partner-logos-section">
        <div className="container">
          <h4 className="partner-section-title">Our Certified Recycling & Electronics Partners</h4>
          <div className="logos-scroller">
            <div className="logos-slide-track">
              {['Apple', 'Dell', 'HP', 'Lenovo', 'Samsung', 'LG', 'Acer', 'Asus', 'Xiaomi', 'Apple', 'Dell', 'HP', 'Lenovo', 'Samsung', 'LG', 'Acer', 'Asus', 'Xiaomi'].map((brand, i) => (
                <div key={i} className="logo-slide">
                  <span>{brand}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="section faq-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Frequently Asked Questions</h2>
            <div className="title-bar"></div>
          </div>

          <div className="faq-list">
            {FAQS.map((faq, index) => (
              <div key={index} className="faq-item glass">
                <button className="faq-question-btn" onClick={() => toggleFaq(index)}>
                  <span className="faq-question">{faq.question}</span>
                  <span className="faq-toggle-icon">
                    {openFaqIndex === index ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                <div className={`accordion-content ${openFaqIndex === index ? 'open' : ''}`}>
                  <p className="faq-answer">{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Banner */}
      <section className="section cta-section glow-effect">
        <div className="container cta-container-card">
          <div className="cta-grid">
            <div className="cta-plant-wrapper">
              <img 
                src="/potted_plant.png" 
                alt="Green houseplant in white pot" 
                className="cta-plant-illustration animate-float" 
              />
            </div>
            
            <div className="cta-text-content">
              <h2>Ready to Turn Your E-Waste into Cash?</h2>
              <p>Schedule a free pickup today and contribute to a cleaner planet. We operate locally with instant payouts.</p>
              <button className="btn btn-filled btn-white btn-large" onClick={() => setBookingModalOpen(true)}>
                Schedule Pickup Now
                <ArrowRight size={18} className="btn-icon-right" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer-section">
        <div className="container footer-grid">
          {/* Col 1: Logo & Info */}
          <div className="footer-col col-brand">
            <a href="#home" className="nav-logo footer-logo">
              <div className="logo-icon">
                <Recycle size={20} />
              </div>
              <span className="logo-text text-white">E-Waste Connect</span>
            </a>
            <p className="footer-brand-desc">
              Building a cleaner and greener tomorrow by responsible e-waste management.
            </p>
            <div className="social-links">
              <a href="#" className="social-icon"><Facebook size={18} /></a>
              <a href="#" className="social-icon"><Instagram size={18} /></a>
              <a href="#" className="social-icon"><Linkedin size={18} /></a>
              <a href="#" className="social-icon"><Twitter size={18} /></a>
              <a href="#" className="social-icon"><Youtube size={18} /></a>
            </div>
          </div>

          {/* Col 2: Services */}
          <div className="footer-col">
            <h4>Services</h4>
            <ul>
              <li><a href="#home" onClick={() => setBookingModalOpen(true)}>Schedule Pickup</a></li>
              <li><a href="#">Bulk Pickup</a></li>
              <li><a href="#">Corporate Recycling</a></li>
              <li><a href="#estimator">Price Estimator</a></li>
            </ul>
          </div>

          {/* Col 3: Resources */}
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="#">FAQs</a></li>
              <li><a href="#">Help Center</a></li>
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms & Conditions</a></li>
            </ul>
          </div>

          {/* Col 4: Contact */}
          <div className="footer-col">
            <h4>Contact Info</h4>
            <ul className="contact-list">
              <li>📍 104 Green Tech Park, Sector 62, Noida, UP</li>
              <li>📞 +91 98765 43210</li>
              <li>✉ support@ewasteconnect.com</li>
              <li>🌐 www.ewasteconnect.com</li>
            </ul>
          </div>

          {/* Col 5: Newsletter */}
          <div className="footer-col col-newsletter">
            <h4>Newsletter</h4>
            <p>Subscribe to our newsletter for recycling tips and local scrap rate updates.</p>
            <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
              <input 
                type="email" 
                placeholder="Enter your email" 
                value={newsletterEmail} 
                onChange={(e) => setNewsletterEmail(e.target.value)}
                required
                className="newsletter-input"
              />
              <button type="submit" className="newsletter-btn">
                <Send size={16} />
              </button>
            </form>
            {newsletterSubscribed && (
              <span className="newsletter-success-msg">Subscribed successfully!</span>
            )}
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <div className="container footer-bottom-content">
            <p>© 2026 E-Waste Connect. All Rights Reserved.</p>
          </div>
        </div>
      </footer>

      {/* Booking / Pickup Scheduling Modal */}
      {bookingModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card glass animate-float">
            <button className="modal-close-btn" onClick={() => setBookingModalOpen(false)}>
              <X size={20} />
            </button>
            
            {bookingSuccess ? (
              <div className="booking-success-view">
                <div className="success-icon-wrapper">
                  <CheckCircle size={48} className="green-text" />
                </div>
                <h2>Pickup Scheduled!</h2>
                <p>Your pickup request has been successfully booked. Our team will contact you shortly to confirm the slot.</p>
              </div>
            ) : (
              <div className="booking-form-view">
                <h2>Schedule Your E-Waste Pickup</h2>
                <p>Fill out the details below, and our team will arrive for doorside valuation and collection.</p>
                
                <form onSubmit={handleBookingSubmit} className="booking-form">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe"
                      value={bookingForm.name} 
                      onChange={(e) => setBookingForm({...bookingForm, name: e.target.value})}
                      required
                      className="form-select"
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      placeholder="e.g. +91 98765 43210"
                      value={bookingForm.phone} 
                      onChange={(e) => setBookingForm({...bookingForm, phone: e.target.value})}
                      required
                      className="form-select"
                    />
                  </div>

                  <div className="form-group">
                    <label>Device Category</label>
                    <select 
                      value={bookingForm.deviceType} 
                      onChange={(e) => setBookingForm({...bookingForm, deviceType: e.target.value})}
                      className="form-select"
                    >
                      <option value="Smartphones">Smartphones</option>
                      <option value="Laptops">Laptops</option>
                      <option value="Desktops">Desktops / Monitors</option>
                      <option value="Appliances">Home Appliances</option>
                      <option value="Batteries">Batteries</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Pickup Date</label>
                    <input 
                      type="date" 
                      value={bookingForm.pickupDate} 
                      onChange={(e) => setBookingForm({...bookingForm, pickupDate: e.target.value})}
                      required
                      className="form-select"
                    />
                  </div>

                  <div className="form-group">
                    <label>Pickup Address</label>
                    <textarea 
                      placeholder="Enter complete doorstep address"
                      value={bookingForm.address} 
                      onChange={(e) => setBookingForm({...bookingForm, address: e.target.value})}
                      required
                      rows={3}
                      className="form-select"
                    ></textarea>
                  </div>

                  <button type="submit" className="btn btn-filled w-full btn-large">
                    Confirm Pickup Booking
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
