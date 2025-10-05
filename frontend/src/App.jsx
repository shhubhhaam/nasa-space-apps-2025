import React, { useState, useMemo } from 'react';
import Dashboard from './Dashboard';

// --- Global Data Definitions ---

// Content for the Shark Tracking Challenge (for Home page)
const sharkChallengeDetails = {
    summary: `Earth’s ocean is one of the most powerful habitats in our universe, supporting a range of life that sustains ecosystems and habitability across the globe. It is common to measure photosynthetic activity in the ocean from space, but far more challenging to track top predators. Your challenge is to create a mathematical framework for identifying sharks and predicting their foraging habitats using NASA satellite data, and also to suggest a new conceptual model of a tag (a small electronic device that can be attached to an animal to track and study its movement) that could measure not only where sharks are, but also what they are eating, and in real time transmit that data back to users to enable development of predictive models.`,
    background: `Sharks are important apex predators, regulating prey levels and ensuring species diversity needed for healthy ecosystems. Sharks are also facing unprecedented fishing pressure and determining where sharks feed and move is critical to protect crucial shark habitats. It would be useful to be able to identify foraging hotspots and quantify the ecological links between physical oceanographic features, phytoplankton communities, and predator movement patterns. Data from the Surface Water and Ocean Topography (SWOT) mission as well as the Plankton, Aerosols, Clouds, and Ecosystems (PACE) mission can be used to track eddies in the ocean where sharks may choose to live.
    
    There are several trophic steps (i.e., steps in the food chain) between phytoplankton (readily visible from PACE data) and sharks, so a mathematical/physically realistic model for shark foraging behavior must take that into consideration. There are also several variables that potentially affect shark behavior. For example, when are sharks at the surface, and when may they want to be deeper in the ocean? What role might temperature play? What are the ecological consequences of their locations and behavior?`,
    objectives: [
        "Create a mathematical framework for identifying sharks and predicting their foraging habitats using NASA satellite data.",
        "Suggest a new conceptual model of a tag that could measure not only where sharks are, but also what they are eating, and in real time transmit that data to users.",
        "Identify foraging hotspots and quantify the ecological links between physical oceanographic features, phytoplankton communities, and predator movement patterns. (Bonus: Suggest a new satellite measurement!)"
    ],
    considerations: [
        "Explain to a high school audience: Why do sharks matter, and why does predicting their location matter?",
        "How can improved predictions of shark location affect decisions made by humans?",
        "For data and resources related to this challenge, refer to the Resources tab."
    ],
    projectIdeas: [
        "Present your hypotheses and data-driven preliminary results in a short video.",
        "Build and run a simple mathematical model that uses satellite data as input and outputs graphical products.",
        "Develop global maps of expected shark activity (must use NASA satellite products as input!)."
    ]
};

// Content for the new 'Sharks' page
const SHARK_INFO = {
    title: "Apex Predators: The World of Sharks",
    subtitle: "Essential ecology, species profiles, and conservation status for our research.",
    ecology: {
        title: "General Shark Ecology",
        points: [
            "Apex Predators: Sharks regulate the food chain (trophic cascades), ensuring ecosystem balance.",
            "Physiology: Most sharks rely on ram ventilation (constant movement) or buccal pumping to breathe.",
            "Sensory Abilities: Possess specialized senses, including the Ampullae of Lorenzini to detect electromagnetic fields, crucial for navigating and hunting in nutrient-rich ocean eddies (which we track with SWOT).",
            "Lifespan: Varies wildly; some species, like the Greenland Shark, can live for hundreds of years."
      ,
      "Feeding Behavior: Sharks use a variety of foraging strategies — from filter feeding (e.g., whale sharks) to ambush and active pursuit — often linked to prey distributions and oceanographic features.",
      "Reproduction & Vulnerability: Many shark species mature late and have low fecundity (few pups per litter), which makes populations slow to recover from overexploitation.",
	  
        ]
    },
    keySpecies: {
        title: "Focus Species (Highly Migratory Apex Predators)",
        species: [
			{ 
				name: "Whale Shark", 
				status: "Endangered", 
				migration: "Filters plankton in surface waters (high PACE relevance).",
				// UPDATED: Using the provided image URL for the Whale Shark
				imgUrl: "uploaded:WhatsApp Image 2025-10-05 at 09.45.56_2aba9316.jpg-684ea47b-0156-4fe4-9905-6b3c26b6a64e" 
			},
      { 
        name: "Great White Shark", 
        status: "Vulnerable", 
        migration: "Transoceanic, deep dives up to 1,200m.", 
        imgUrl: "/Great White Shark.jpeg.jpg"
      },
      { 
        name: "Oceanic Whitetip Shark", 
        status: "Critically Endangered", 
        migration: "Pelagic, often found near deep-ocean eddies.",
        imgUrl: "/Oceanic Whitetip Shark.jpeg.jpg"
      },
      { 
        name: "Mako Shark", 
        status: "Endangered", 
        migration: "Fastest shark, highly migratory across open oceans.",
        imgUrl: "/Mako Shark.webp"
	  },
      { 
        name: "Hammer head", 
        status: "Endangered", 
        migration: "Tropical and warm temperate waters worldwide",
        imgUrl: "/Hammerhead Shark.webp"
      },
        ]
    },
    conservation: {
        title: "Conservation Status & Human Impact",
        metrics: [
			
        ],
        chartUrl: "https://placehold.co/600x300/DC2626/ffffff?text=STATISTICAL+CHART:+Global+Shark+Population+Decline" // Placeholder Chart Image
    }
};

// Define the content structure for each placeholder page
const pageContent = {
  Home: {
    title: "The Apex Predator Tracking Challenge",
    description: "Harnessing NASA satellite data to track and predict shark foraging habitats.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600">
        <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3.3-5.5.4-.9.6-1.8.3-2.7a.5.5 0 0 0-.1-.1c-.9-.3-1.8-.1-2.7.3-1.6-2.3-3.5-3.3-5.5-3.3a7 7 0 0 0-7 7c0 4 3 7 7 7zM12 4v4M4 12h4" />
      </svg>
    )
  },
  Sharks: { // NEW PAGE ENTRY
    title: "Shark Biology & Conservation",
    description: "In-depth information on the key species and ecological role of apex predators.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-cyan-600">
        {/* Simplified shark fin / tooth icon */}
        <polygon points="12 2 22 12 12 22 2 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M12 5l6 6-6 6-6-6 6-6z" fill="currentColor"/>
      </svg>
    )
  },
  Dashboard: {
    title: "Prediction & Model Metrics",
    description: "Real-time overview of the predictive model's performance and ocean variables.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-teal-500">
        <path d="M12 20V10" />
        <path d="M18 20V4" />
        <path d="M6 20v-4" />
      </svg>
    )
  },
  Contact: { // Renamed from Projects
    title: "Get In Touch with Shark Bytes",
    description: "Connect with our team for collaboration, inquiries, or feedback on our NASA Space Apps Challenge project.",
    icon: ( // Mail/Contact icon
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-orange-500">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    )
  }
};

// --- Custom Components for Home Page (kept as is) ---

// 1. Hero Section
// Accept an onExplore callback so parent can control navigation (e.g., setCurrentPage)
const HeroSection = ({ onExplore }) => (
  <div className="relative h-[400px] sm:h-[500px] w-full bg-black overflow-hidden rounded-3xl shadow-2xl flex items-center justify-center text-center">
    {/* Background Placeholder - Could be replaced by video/image */}
    {/* <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('https://placehold.co/1200x600/0F172A/ffffff?text=Deep+Ocean+Satellite+View')" }} /> */}
    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/90 to-transparent" />
    
    <div className="relative z-10 p-6 max-w-4xl">
      <h1 className="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-4 tracking-tighter">
        Sharks from Space
      </h1>
      <p className="text-xl sm:text-2xl text-blue-200 mb-8 font-light">
        Using NASA satellite data to predict shark foraging habitats and protect marine ecosystems.
      </p>
      <button
        onClick={() => onExplore && onExplore('Dashboard')}
        className="px-10 py-4 bg-indigo-500 text-white text-lg font-bold rounded-full shadow-lg hover:bg-indigo-600 transition-all duration-300 transform hover:scale-105"
      >
        Explore Our Ocean Insights
      </button>
    </div>
  </div>
);

// Icon for Why It Matters
const IconBlock = ({ icon, title, description }) => (
  <div className="p-4 rounded-xl flex flex-col items-center text-center bg-white border border-gray-100 shadow-md transition-all duration-300 hover:shadow-lg hover:border-indigo-200">
    <div className="p-3 mb-3 text-white rounded-full bg-indigo-500">
      {icon}
    </div>
    <h4 className="text-lg font-semibold text-gray-800 mb-1">{title}</h4>
    <p className="text-sm text-gray-500">{description}</p>
  </div>
);

// --- Shared Components ---

// Button component for clean navigation tabs
const NavButton = ({ name, currentPage, setCurrentPage, icon }) => {
  const isActive = name === currentPage;
  return (
    <button
      onClick={() => setCurrentPage(name)}
      className={`
        flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300
        ${isActive
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
          : 'text-gray-600 hover:bg-gray-100 hover:text-indigo-600'
        }
      `}
    >
      {icon}
      <span>{name}</span>
    </button>
  );
};

// Generic card component (modified to be simpler for content sections)
const ContentCard = ({ title, description, className = '', children }) => (
  <div className="p-6 bg-white border border-gray-100 rounded-3xl shadow-xl">
    <h2 className={`text-3xl font-extrabold text-gray-800 mb-4 ${className}`}>{title}</h2>
    {description && <p className="text-gray-600 leading-relaxed mb-4">{description}</p>}
    {children}
  </div>
);

// --- Dashboard Component Enhancements ---

const MetricCard = ({ title, value, change, icon, iconColor, unit = '' }) => (
    <div className="p-5 bg-white rounded-2xl shadow-lg border-t-4 border-indigo-400">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-4xl font-extrabold text-gray-900 mt-1">
                    {value}{unit}
                </p>
            </div>
            <div className={`p-3 rounded-full ${iconColor} bg-opacity-20`}>
                {icon}
            </div>
        </div>
        <p className={`mt-3 text-sm font-medium ${change.includes('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change}
            <span className="text-gray-500 ml-1 font-normal">vs last week</span>
        </p>
    </div>
);

// Mock data for Dashboard
const dashboardMetrics = [
    { 
        title: "Model Accuracy", 
        value: "89.4", 
        unit: '%',
        change: "+3.1%",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v10M18.8 6.8l-2.8 2.8M5.2 6.8l2.8 2.8M12 22v-4" /></svg>
        ),
        iconColor: 'text-indigo-600'
    },
    { 
        title: "Predicted Hotspots", 
        value: "14", 
        unit: '',
        change: "+2 new",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/></svg>
        ),
        iconColor: 'text-orange-600'
    },
    { 
        title: "PACE Data Latency", 
        value: "4.5", 
        unit: ' hrs',
        change: "-0.2 hrs",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12A10 10 0 1 1 12 2V22M16 16l-4-4"/></svg>
        ),
        iconColor: 'text-teal-600'
    },
    { 
        title: "Avg. SST Anomaly", 
        value: "+0.8", 
        unit: ' °C',
        change: "+0.1 °C",
        icon: (
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v7c0 2.2 1.8 4 4 4s4-1.8 4-4V6a4 4 0 0 0-4-4zM12 17v4M8 21h8"/></svg>
        ),
        iconColor: 'text-red-600'
    },
];

// --- Page Logic ---

const PageRenderer = ({ currentPage, setCurrentPage }) => {
  const [openAnswers, setOpenAnswers] = useState({});
  // Contact form state (local storage + download fallback)
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactStatus, setContactStatus] = useState('');

  const submitContact = (e) => {
    e.preventDefault();
    setContactStatus('');
    // Basic validation
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactStatus('Please fill name, email and message.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(contactEmail)) {
      setContactStatus('Please enter a valid email address.');
      return;
    }

    const submission = {
      name: contactName.trim(),
      email: contactEmail.trim(),
      message: contactMessage.trim(),
      ts: new Date().toISOString(),
    };

    try {
      // Save to localStorage as a simple persistence layer
      const existing = JSON.parse(localStorage.getItem('contactSubmissions') || '[]');
      existing.push(submission);
      localStorage.setItem('contactSubmissions', JSON.stringify(existing));

      // Trigger a file download with the submission JSON (user can save/upload to Drive)
      const blob = new Blob([JSON.stringify(submission, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contact-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setContactSubmitted(true);
      setContactStatus('Thanks! Your inquiry was saved locally and a JSON file was downloaded. You can upload that file to Google Drive or share it with the team.');
      // clear form
      setContactName('');
      setContactEmail('');
      setContactMessage('');
    } catch (err) {
      console.error('Contact submit error', err);
      setContactStatus('An error occurred while saving your inquiry. Please try again.');
    }
  };

  const getPageContent = (pageName) => {
    switch (pageName) {
      case 'Home':
        // Home page content
        const ChallengeSection = ({ title, children, colorClass = 'text-indigo-600' }) => (
            <div className="bg-white p-6 rounded-3xl shadow-lg border-t-4 border-indigo-400">
              <h3 className={`text-xl font-extrabold mb-3 ${colorClass}`}>{title}</h3>
              <div className="text-gray-600 space-y-3">
                {children}
              </div>
            </div>
          );
        
        return (
          <div className="space-y-12">
            {/* 1. Hero Section */}
            <HeroSection onExplore={setCurrentPage} />

            {/* 2. Problem Statement */}
            <ContentCard title="Problem Statement" className="text-blue-600">
                <p className="text-l text-gray-700 font-medium">
                    Earth’s ocean supports life across the planet — yet top predators like sharks remain one of the hardest species to track. Our mission is to build a mathematical framework that identifies shark habitats and predicts their feeding behavior using real NASA satellite data.
                </p>
            </ContentCard>

            {/* 3. Why It Matters */}
            <ContentCard title="Why It Matters?" className="text-green-600">
                <p className="text-lg text-gray-700 mb-6">
                    Sharks are vital apex predators that keep marine ecosystems balanced. Understanding where and when they feed helps us achieve critical conservation goals:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Protect Species Icon */}
                  <IconBlock
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 18a.5.5 0 0 0 .5-.5V14a.5.5 0 0 0-.5-.5H5a.5.5 0 0 0-.5.5v3.5a.5.5 0 0 0 .5.5z"/><path d="M12 21v-3"/></svg>}
                    title="Protect Species"
                    description="Safeguard endangered shark populations from human impact."
                  />
                  {/* Prevent Overfishing Icon */}
                  <IconBlock
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 22v-8.5" /></svg>}
                    title="Prevent Overfishing"
                    description="Inform sustainable fishing zones to protect crucial foraging areas."
                  />
                  {/* Improve Policies Icon */}
                  <IconBlock
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
                    title="Improve Policies"
                    description="Provide data-driven insights for effective marine conservation policies."
                  />
                  {/* Ocean Health Icon */}
                  <IconBlock
                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                    title="Ocean Health"
                    description="Educate communities globally about the importance of apex predators."
                  />
                </div>
            </ContentCard>

            {/* 4. Our Approach / Solution */}
            <ContentCard title="Our Approach: Predictive Modeling" className="text-orange-600">
                <p className="text-lg text-gray-700 mb-6">
                    We combine NASA’s <strong>PACE</strong> (ocean color & phytoplankton data) and <strong>SWOT</strong> (sea surface height & eddies) datasets to identify likely shark foraging hotspots.
                </p>
                
                {/* Flowchart Diagram */}
                <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0 lg:space-x-4 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="flex-1 p-4 bg-white rounded-xl shadow-lg text-center font-bold text-indigo-700">NASA Data (PACE/SWOT)</div>
                    <svg className="w-8 h-8 text-gray-500 transform lg:rotate-0 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    <div className="flex-1 p-4 bg-white rounded-xl shadow-lg text-center font-bold text-teal-700">ML Model (SST, Chlorophyll, Depth)</div>
                    <svg className="w-8 h-8 text-gray-500 transform lg:rotate-0 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                    <div className="flex-1 p-4 bg-white rounded-xl shadow-lg text-center font-bold text-pink-700">Heatmap Predictions <br/>(Shark Presence-Migration-Activity)</div>
                </div>

                <ul className="list-disc pl-5 mt-6 text-gray-600 space-y-2">
                    <li>Analyzes sea surface temperature, salinity, chlorophyll, and oceanographic features.</li>
                    <li>Predicts shark presence using machine learning and physically realistic oceanographic modeling.</li>
                    <li>Displays results as interactive heatmaps and habitat predictions.</li>
                </ul>
            </ContentCard>

            {/* 5. Innovative Shark Tag Concept */}
            <ContentCard title="Innovative Shark Tag Concept" className="text-purple-600">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="text-lg text-gray-700 mb-4">
                            We propose a next-generation BioTelemetry Shark Tag capable of providing real-time data far beyond simple location tracking.
                        </p>
            <ul className="list-disc pl-5 text-gray-600 space-y-2">
              <li><strong>Real-time Diet Analysis:</strong> Measures not just location, but also feeding activity & prey type.</li>
              <li><strong>Mini-Spectrometry/Sensors:</strong> Uses advanced stomach sensors for real-time diet verification.</li>
              <li><strong>Satellite Uplink:</strong> Transmits live data instantly for AI-driven predictive modeling updates.</li>
            </ul>
                    </div>
                    {/* 3D Render/Sketch Placeholder */}
          <div
		//    className="h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 border-dashed border-2 border-gray-300"
		   >
            <img
              src="/-l-shark-migrate.webp"
              alt="Shark migration concept"
              className="h-full object-contain rounded-md h-64 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400"
              onError={(e) => { e.target.onerror = null; e.target.src = 'Tag.jpg'; }}
            />
          </div>
                </div>
            </ContentCard>
			
			

            {/* 8. Impact and Future Vision */}
            <ContentCard title="Impact and Future Vision" className="text-indigo-600">
                <p className="text-lg text-gray-700 mb-4">
                    Our goal is to empower ocean researchers, conservationists, and students with predictive intelligence about marine life movements and ecosystem health.
                </p>
                <div className="mt-4 space-y-3">
                  {(
                    [
                      {
                        id: 'goal',
                        q: 'What is the ultimate goal of predicting shark habitats?',
                        a: (
                          <p>The ultimate goal is to create a dynamic, predictive tool that empowers us to protect marine ecosystems. By understanding where sharks feed, we can move from a reactive to a proactive approach in conservation, safeguarding these crucial predators and, in turn, ensuring the stability of the entire ocean food web.</p>
                        ),
                      },
                      {
                        id: 'impact',
                        q: 'How can improved predictions of shark locations affect decisions made by humans?',
                        a: (
                          <div>
                            <p><strong>Fisheries Management:</strong> Commercial fleets can receive advisories to avoid foraging hotspots, reducing accidental bycatch and supporting sustainable fishing.</p>
                            <p><strong>Conservation Policy:</strong> Governments and international bodies can use predictive maps to better place and manage MPAs.</p>
                            <p><strong>Public Safety:</strong> Coastal communities can adapt beach safety protocols and awareness campaigns without harming shark populations.</p>
                            <p><strong>Scientific Research:</strong> Offers researchers tools to study links between climate, ocean dynamics, and animal behavior at scale.</p>
                          </div>
                        ),
                      },
                      {
                        id: 'users',
                        q: 'Who are the primary users of this technology?',
                        a: <p>Marine biologists, conservation groups, policymakers, fisheries regulators, educators and students — all benefit from predictive habitat maps.</p>,
                      },
                      {
                        id: 'vision',
                        q: 'What is the long-term vision for this project?',
                        a: <p>Expand the framework beyond sharks into a comprehensive "ocean intelligence" platform modeling habitats for multiple species by integrating NASA datasets — producing near-real-time biodiversity hotspot maps and climate response forecasts.</p>,
                      },
                      {
                        id: 'tag',
                        q: 'What are the next steps for the conceptual "smart tag"?',
                        a: <p>Move from concept to prototype: partner with bio-engineers to miniaturize prey-sensing tech, integrate satellite uplinks, and field-test tags to collect real-time diet data to validate models.</p>,
                      },
                      {
                        id: 'climate',
                        q: 'Can this model help us understand the effects of climate change?',
                        a: <p>Yes. By monitoring shifts in ocean temperature and currents via satellites, the model can predict habitat shifts for sharks and prey, identifying vulnerable species and informing conservation priorities.</p>,
                      },
                    ]
                  ).map((item) => (
                    <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-800">{item.q}</div>
                        <button
                          onClick={() => setOpenAnswers((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                          className="ml-4 px-2 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                          aria-expanded={!!openAnswers[item.id]}
                          aria-controls={`ans-${item.id}`}
                        >
                          {openAnswers[item.id] ? '−' : '+'}
                        </button>
                      </div>
                      {openAnswers[item.id] && (
                        <div id={`ans-${item.id}`} className="mt-2 text-sm text-gray-700">
                          {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            </ContentCard>
          </div>
        );

      case 'Sharks': // UPDATED PAGE IMPLEMENTATION
        return (
          <div className="space-y-8">
            <ContentCard
                title={SHARK_INFO.title}
                description={SHARK_INFO.subtitle}
                className="text-cyan-600"
            />
            
            {/* General Ecology */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ContentCard title={SHARK_INFO.ecology.title} className="text-indigo-600" description="How these apex predators function and thrive in the marine environment.">
                    <ul className="list-disc pl-5 text-gray-700 space-y-3 mt-4 text-base">
                        {SHARK_INFO.ecology.points.map((point, index) => (
                            <li key={index} className="font-medium">{point}</li>
                        ))}
                    </ul>
                </ContentCard>

                {/* Conservation Status and Statistical Image */}
                <ContentCard title={SHARK_INFO.conservation.title} className="text-red-600" >
                    <div className="space-y-4 mt-4">
                        {SHARK_INFO.conservation.metrics.map((metric, index) => (
                            <div key={index} className="p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
                                <p className="font-semibold text-red-800">{metric.label}:</p>
                                <p className="text-gray-700">{metric.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-8">
                        <h4 className="text-xl font-semibold text-gray-700 mb-3">Population Trend Visualization </h4>
                        <img 
                            src="./decline.png" 
                            alt="Statistical Chart: Global Shark Population Decline" 
                            className="w-full h-auto rounded-lg shadow-md border border-gray-200"
                        />
                    </div>
                </ContentCard>
            </div>


              {/* Whale Shark Details Card: image left, details right */}
              <ContentCard title="Whale Shark — Species Details" className="text-cyan-600">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  <div className="flex items-center justify-center">
                    <img
                      src="/whale_shark_main2.jpg"
                      alt="Whale Shark Closeup"
                      className="w-full max-w-md h-auto object-cover rounded-lg shadow-lg"
                      onError={(e) => { e.target.onerror = null; e.target.src = "/Whale Shark Map.png"; }}
                    />
                  </div>

                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Rhinocodon typus</h3>
                    <p className="text-gray-700 mb-4">The whale shark is the largest fish in the sea and a filter-feeding gentle giant. It plays an important role in marine ecosystems by consuming plankton and small nekton, often aggregating where productivity is high.</p>

                    <ul className="list-disc pl-5 space-y-2 text-gray-700">
                      <li><strong>Size:</strong> Typically 4–12 m, with reports of individuals larger than 12 m.</li>
                      <li><strong>Diet:</strong> Planktivorous — consumes plankton, small fish and squid via filter feeding.</li>
                      <li><strong>Habitat:</strong> Tropical and warm-temperate surface waters, often near productive coastal upwellings and oceanic fronts.</li>
                      <li><strong>Conservation:</strong> IUCN: Endangered — threats include bycatch, vessel strikes, and habitat disturbance.</li>
                    </ul>
					
                  </div>
                </div>
                <div className="mb-8 m-10 p-6 bg-gray-50 rounded-2xl border border-gray-200">
          <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-cyan-500 mr-2"><path d="M12 22s-8-4-8-10C4 5.383 7.58 2 12 2s8 3.383 8 10c0 6-8 10-8 10z"/></svg>
                        Rhinocodon Typus (Whale Shark) Global Range Prediction
                    </h3>
          {/* Main whale shark image (centered above the global range map) */}
                    <img 
            src="/Whale Shark Map.png"
                        alt="Rhinocodon Typus (Whale Shark) Global Range Prediction Map" 
                        className="w-full h-auto rounded-lg shadow-xl"
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/1200x800/94A3B8/ffffff?text=Whale+Shark+Map+Image+Error"; }}
                    />
				</div>
              </ContentCard>
            {/* Key Species Section with Images (Refactored to Card Grid) */}
            <ContentCard title={SHARK_INFO.keySpecies.title} className="text-orange-600" 
			>
                
                {/* Other Species Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-4">
                    {SHARK_INFO.keySpecies.species.filter(s => s.name !== "Whale Shark").map((species, index) => (
                        <div key={index} className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
                            {/* Shark Image */}
                            <img 
                                src={species.imgUrl} 
                                alt={species.name} 
                                className="w-full h-36 object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/300x200/94A3B8/ffffff?text=Image+Missing"; }}
                            />
                            <div className="p-4">
                                <h4 className="text-lg font-bold text-gray-900 mb-2">{species.name}</h4>
                                
                                {/* Status Chip */}
                                <span className={`px-3 py-1 text-xs leading-5 font-semibold rounded-full mb-3 inline-block
                                    ${species.status === 'Critically Endangered' ? 'bg-red-100 text-red-800' : species.status === 'Endangered' ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`
                                }>
                                    {species.status}
                                </span>

                                <p className="text-sm text-gray-600 mt-2">
                                    <span className="font-semibold">Migration:</span> {species.migration}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </ContentCard>
          </div>
        );


      case 'Dashboard':
        // Dashboard Content (Metrics and Health Status)
        return (
          <div className="space-y-8">
            <Dashboard />
          </div>
        );

      case 'Contact': // Renamed from Projects
        return (
          <div className="space-y-8">
            <ContentCard
                title={pageContent.Contact.title}
                description={pageContent.Contact.description}
                className="text-orange-600"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                    {/* Contact Form Placeholder (Left/Center Column) */}
                    <div className="lg:col-span-2 p-6 bg-gray-50 rounded-2xl shadow-inner">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Send Us a Message</h3>
                        <form className="space-y-4" onSubmit={submitContact}>
                            <input 
                                type="text" 
                                placeholder="Your Name" 
                                value={contactName}
                                onChange={(e) => setContactName(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
                                required
                            />
                            <input 
                                type="email" 
                                placeholder="Your Email" 
                                value={contactEmail}
                                onChange={(e) => setContactEmail(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500" 
                                required
                            />
                            <textarea 
                                placeholder="Your Message or Inquiry" 
                                rows="4" 
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                required
                            ></textarea>
                            <div className="flex items-center space-x-4">
                              <button 
                                  type="submit" 
                                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300"
                              >
                                  Submit Inquiry
                              </button>
                              <button type="button" className="px-4 py-2 border rounded-lg text-sm" onClick={() => { setContactName(''); setContactEmail(''); setContactMessage(''); setContactStatus(''); }}>Clear</button>
                            </div>
                            {contactStatus && (
                              <p className={`mt-3 text-sm ${contactSubmitted ? 'text-green-700' : 'text-red-600'}`}>{contactStatus}</p>
                            )}
                         </form>
                    </div>

                    {/* Team Info / Quick Links (Right Column) */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="p-6 bg-white border border-gray-200 rounded-2xl shadow-md">
                            <h3 className="text-xl font-bold text-gray-800 mb-3">Team Details</h3>
                            <p className="text-gray-600 mb-4">
                            	<strong>Team Name:</strong> Shark Bytes<br/>
                                <strong>Event:</strong> NASA Space Apps Challenge {new Date().getFullYear()}
                            </p>
                            <h4 className="font-semibold text-gray-700 mb-2">Connect:</h4>
                            <ul className="space-y-2 text-indigo-600">
                                <li><a href="#" className="hover:underline flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 3c0-.14 2 1.5 2 4.77m-2 4.46V12h-2V9.89L14 9l-.5-.5H8v8h4v-3.89z"/></svg>GitHub Repository</a></li>
                                <li><a href="#" className="hover:underline flex items-center"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M15 4c0-2-2-4-4-4S7 2 7 4V6H5v14h14V6h-4zM9 4a2 2 0 0 1 2-2 2 2 0 0 1 2 2v2H9V4z"/></svg>Project Demo Link</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </ContentCard>
          </div>
        );
      default:
        return <p className="text-red-500">Page not found.</p>;
    }
  };

  return (
    <div className="animate-fadeIn p-4 sm:p-6 transition-opacity duration-500">
      {getPageContent(currentPage)}
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  const [currentPage, setCurrentPage] = useState('Home');
  // NOTE: Object.keys naturally preserves insertion order in modern JS, ensuring 'Contact' appears last.
  const pages = useMemo(() => Object.keys(pageContent), []);

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased flex flex-col">
      {/* --- Global Header / Navigation --- */}
  <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row justify-between items-center">
          <button
            onClick={() => setCurrentPage('Home')}
            aria-label="Go to Home"
            className="text-3xl font-extrabold text-indigo-700 tracking-tight mb-4 sm:mb-0 cursor-pointer hover:text-indigo-800 transition-colors"
          >
            Sharks from Space
          </button>

          {/* Navigation Bar */}
          <nav className="flex space-x-3 p-1 bg-gray-100 rounded-2xl shadow-inner">
            {pages.map(page => (
              <NavButton
                key={page}
                name={page}
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                icon={pageContent[page].icon}
              />
            ))}
          </nav>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      {/* Add top padding to avoid overlap with sticky header */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 pt-20">
        <PageRenderer currentPage={currentPage} setCurrentPage={setCurrentPage} />
      </main>

      {/* 9. Footer */}
      <footer className="w-full text-center py-4 text-xs text-gray-400 border-t border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-sm font-semibold text-gray-600 mb-1">
                A project by Team: <span className="text-indigo-600">Shark Bytes</span>
            </p>
            <p className="text-xs">
                NASA Space Apps Challenge {new Date().getFullYear()} | Designed with React & Tailwind CSS.
                <span className="ml-4 text-gray-500 hover:text-indigo-500 cursor-pointer">
                    Contact | GitHub | Demo
                </span>
            </p>
        </div>
      </footer>
    </div>
  );
}
