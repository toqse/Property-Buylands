import p1 from "@/assets/property-1.jpg";
import p2 from "@/assets/property-2.jpg";
import p3 from "@/assets/property-3.jpg";
import p4 from "@/assets/property-4.jpg";
import p5 from "@/assets/property-5.jpg";
import p6 from "@/assets/property-6.jpg";

const img = (value: string | { src: string }) => (typeof value === "string" ? value : value.src);

export type PropertyStatus = "Approved" | "Pending" | "Rejected" | "Sold" | "Rented";

export interface Property {
  id: string;
  slug?: string;
  title: string;
  category: "Villa" | "Apartment" | "Penthouse" | "Townhouse" | "Commercial" | "Land";
  type: "For Sale" | "For Rent";
  price: number;
  priceUnit?: string;
  location: string;
  city: string;
  bedrooms: number;
  bathrooms: number;
  area: number; // value in `areaUnit` (defaults to sqft)
  areaUnit?: "sqft" | "sqm" | "acres" | "cents";
  features: string[];
  description: string;
  image: string;
  gallery: string[];
  /** Existing uploaded images with their backend IDs (used for edit/delete). */
  images?: { id: number; url: string }[];
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  /** Backend user id of the listing creator (when exposed by API). */
  createdBy?: number;
  status: PropertyStatus;
  featured?: boolean;
  videoUrl?: string;
  lat: number;
  lng: number;
  createdAt: string;
  /** Optional fields collected from the owner add-property flow */
  ownership?: string;
  state?: string;
  district?: string;
  contactWhatsApp?: string;
  youtubeUrl?: string;
  googleMapUrl?: string;
  googleEmbedHtml?: string;
  builtYear?: string;
  furnishing?: string;
  projectStatus?: string;
  floors?: string;
  sighting?: string;
  areaCent?: string;
  parkingSpaces?: string;
  nearbyPlaces?: { name: string; distanceKm: string }[];
  /** API FK ids for forms */
  featureIds?: number[];
  propertyTypeId?: number;
  stateId?: number;
  districtId?: number;
  cityId?: number;
  videoThumbnail?: string;
  videoProcessingStatus?: "processing" | "ready" | "failed" | null;
}

export const PROPERTIES: Property[] = [
  {
    id: "p1",
    title: "Azure Bay Infinity Villa",
    category: "Villa",
    type: "For Sale",
    price: 2450000,
    location: "Palm Jumeirah",
    city: "Dubai",
    bedrooms: 5,
    bathrooms: 6,
    area: 8200,
    features: ["Swimming Pool", "Private Beach", "Smart Home", "Garden", "Garage"],
    description:
      "An architectural masterpiece on Palm Jumeirah with uninterrupted sea views, infinity pool, and bespoke interiors crafted by award-winning designers.",
    image: "/villa.jpg",
    gallery: ["/villa.jpg", img(p2), img(p3), img(p1)],
    ownerName: "Layla Hassan",
    ownerPhone: "+971501234567",
    ownerEmail: "layla@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.1124, lng: 55.139,
    createdAt: "2025-04-12",
  },
  {
    id: "p2",
    title: "Casa Mediterranean Estate",
    category: "Villa",
    type: "For Sale",
    price: 1890000,
    location: "Emirates Hills",
    city: "Dubai",
    bedrooms: 6,
    bathrooms: 7,
    area: 9400,
    features: ["Swimming Pool", "Garden", "Maid Room", "Garage", "Gym"],
    description: "Mediterranean villa with terracotta roofing, lush gardens, and a glass-edged pool overlooking the lake.",
    image: "/estate.webp",
    gallery: ["/estate.webp", img(p4), img(p3)],
    ownerName: "Marco Devereaux",
    ownerPhone: "+971502221111",
    ownerEmail: "marco@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.0568, lng: 55.1696,
    createdAt: "2025-04-10",
  },
  {
    id: "p3",
    title: "Skyline Penthouse Residence",
    category: "Penthouse",
    type: "For Sale",
    price: 3200000,
    location: "Downtown",
    city: "Dubai",
    bedrooms: 4,
    bathrooms: 5,
    area: 5600,
    features: ["Sky Lounge", "Smart Home", "Concierge", "Gym", "Balcony"],
    description: "Floor-to-ceiling glass penthouse with skyline panoramas and a private rooftop terrace.",
    image: img(p3),
    gallery: [img(p3), img(p1), img(p4)],
    ownerName: "Sara Iqbal",
    ownerPhone: "+971503334444",
    ownerEmail: "sara@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.1972, lng: 55.2744,
    createdAt: "2025-04-02",
  },
  {
    id: "p4",
    title: "Marina Crest Apartment",
    category: "Apartment",
    type: "For Rent",
    price: 14500,
    priceUnit: "/month",
    location: "Dubai Marina",
    city: "Dubai",
    bedrooms: 2,
    bathrooms: 2,
    area: 1450,
    features: ["Sea View", "Gym", "Pool", "Parking", "Balcony"],
    description: "Bright two-bedroom marina apartment with floor-to-ceiling windows and resort amenities.",
    image: img(p1),
    gallery: [img(p1), img(p3)],
    ownerName: "Daniel Wright",
    ownerPhone: "+971504445555",
    ownerEmail: "daniel@buylandsindia.com",
    status: "Approved",
    lat: 25.0805, lng: 55.1403,
    createdAt: "2025-03-28",
  },
  {
    id: "p5",
    title: "Heritage Lane Townhouse",
    category: "Townhouse",
    type: "For Sale",
    price: 980000,
    location: "Jumeirah",
    city: "Dubai",
    bedrooms: 3,
    bathrooms: 4,
    area: 2800,
    features: ["Garden", "Garage", "Storage", "Balcony"],
    description: "Classic brick townhouse with timeless detailing, mature gardens and a quiet lane setting.",
    image: img(p5),
    gallery: [img(p5), img(p2)],
    ownerName: "Hannah Lee",
    ownerPhone: "+971505556666",
    ownerEmail: "hannah@buylandsindia.com",
    status: "Pending",
    lat: 25.2048, lng: 55.2708,
    createdAt: "2025-04-22",
  },
  {
    id: "p6",
    title: "Meridian Tower Office Floor",
    category: "Commercial",
    type: "For Rent",
    price: 42000,
    priceUnit: "/month",
    location: "DIFC",
    city: "Dubai",
    bedrooms: 0,
    bathrooms: 4,
    area: 6500,
    features: ["Reception", "Meeting Rooms", "Server Room", "Parking"],
    description: "Premium grade-A office floor in DIFC with skyline views and turn-key fit out.",
    image: img(p6),
    gallery: [img(p6), img(p3)],
    ownerName: "Buylands India",
    ownerPhone: "+971506667777",
    ownerEmail: "office@buylandsindia.com",
    status: "Approved",
    lat: 25.2145, lng: 55.2799,
    createdAt: "2025-03-19",
  },
  {
    id: "p7",
    title: "Crystal Cove Beachfront Villa",
    category: "Villa",
    type: "For Sale",
    price: 2780000,
    location: "Saadiyat Island",
    city: "Abu Dhabi",
    bedrooms: 5,
    bathrooms: 6,
    area: 17,
    areaUnit: "cents",
    features: ["Private Beach", "Swimming Pool", "Smart Home", "Garden", "Garage"],
    description:
      "Secluded beachfront villa with floor-to-ceiling glass, terraced gardens, and direct access to a pristine private cove.",
    image: img(p4),
    gallery: [img(p4), img(p2), img(p5), img(p1)],
    ownerName: "Reema Al Hashimi",
    ownerPhone: "+971507778888",
    ownerEmail: "reema@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 24.5375, lng: 54.4302,
    createdAt: "2025-04-30",
  },
  {
    id: "p8",
    title: "Aurora Heights Sky Apartment",
    category: "Apartment",
    type: "For Sale",
    price: 1450000,
    location: "Business Bay",
    city: "Dubai",
    bedrooms: 3,
    bathrooms: 4,
    area: 6,
    areaUnit: "cents",
    features: ["Skyline View", "Concierge", "Smart Home", "Gym", "Pool"],
    description:
      "Refined three-bedroom sky residence with sweeping Burj Khalifa views, double-height ceilings, and a private wraparound balcony.",
    image: img(p3),
    gallery: [img(p3), img(p1), img(p4), img(p6)],
    ownerName: "Yusuf Karim",
    ownerPhone: "+971508889999",
    ownerEmail: "yusuf@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.1857, lng: 55.2766,
    createdAt: "2025-04-27",
  },
  {
    id: "p9",
    title: "Verdant Acres Country Estate",
    category: "Villa",
    type: "For Sale",
    price: 3450000,
    location: "Al Barari",
    city: "Dubai",
    bedrooms: 6,
    bathrooms: 7,
    area: 25,
    areaUnit: "cents",
    features: ["Private Garden", "Swimming Pool", "Home Cinema", "Wine Cellar", "Smart Home"],
    description:
      "Architect-designed country estate set within mature botanical grounds, featuring a glass-walled pavilion, infinity pool and bespoke wellness suite.",
    image: img(p5),
    gallery: [img(p5), img(p2), img(p3), img(p1)],
    ownerName: "Anya Petrova",
    ownerPhone: "+971509990000",
    ownerEmail: "anya@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.0937, lng: 55.3267,
    createdAt: "2025-04-29",
  },
  {
    id: "p10",
    title: "Lakeview Garden Villa",
    category: "Villa",
    type: "For Sale",
    price: 1750000,
    location: "Meadows",
    city: "Dubai",
    bedrooms: 4,
    bathrooms: 5,
    area: 4200,
    features: ["Garden", "Pool", "Lake View", "Maid Room", "Garage"],
    description:
      "Family villa overlooking a quiet lake with mature landscaping, a covered patio and direct lake-walk access.",
    image: img(p2),
    gallery: [img(p2), img(p1), img(p5)],
    ownerName: "Ibrahim Noor",
    ownerPhone: "+971501020304",
    ownerEmail: "ibrahim@buylandsindia.com",
    status: "Approved",
    lat: 25.0532, lng: 55.1492,
    createdAt: "2025-05-02",
  },
  {
    id: "p11",
    title: "Harbor Light Studio Apartment",
    category: "Apartment",
    type: "For Rent",
    price: 7800,
    priceUnit: "/month",
    location: "JBR",
    city: "Dubai",
    bedrooms: 1,
    bathrooms: 1,
    area: 720,
    features: ["Sea View", "Gym", "Pool", "Balcony"],
    description:
      "Compact studio with full-height windows opening onto Jumeirah Beach Residence and direct boardwalk access.",
    image: img(p4),
    gallery: [img(p4), img(p3)],
    ownerName: "Priya Menon",
    ownerPhone: "+971502030405",
    ownerEmail: "priya@buylandsindia.com",
    status: "Approved",
    lat: 25.0779, lng: 55.1335,
    createdAt: "2025-05-05",
  },
  {
    id: "p12",
    title: "Backwater Heritage Plot",
    category: "Land",
    type: "For Sale",
    price: 620000,
    location: "Kumarakom",
    city: "Kottayam",
    bedrooms: 0,
    bathrooms: 0,
    area: 32,
    areaUnit: "cents",
    features: ["Water Front", "Road Access", "Coconut Grove"],
    description:
      "Tranquil 32-cent plot fronting the Kumarakom backwaters — ideal for a private retreat or boutique homestay.",
    image: img(p6),
    gallery: [img(p6), img(p2)],
    ownerName: "Rohit Varma",
    ownerPhone: "+919447112233",
    ownerEmail: "rohit@buylandsindia.com",
    status: "Approved",
    lat: 9.6173, lng: 76.4287,
    createdAt: "2025-05-08",
  },
  {
    id: "p13",
    title: "Cedarwood Family Townhouse",
    category: "Townhouse",
    type: "For Sale",
    price: 1180000,
    location: "Arabian Ranches",
    city: "Dubai",
    bedrooms: 4,
    bathrooms: 4,
    area: 3100,
    features: ["Garden", "Garage", "Community Pool", "Park View"],
    description:
      "Spacious end-unit townhouse on a quiet cul-de-sac with extended garden and direct access to a community pool.",
    image: img(p5),
    gallery: [img(p5), img(p3), img(p1)],
    ownerName: "Khaled Al Saadi",
    ownerPhone: "+971503040506",
    ownerEmail: "khaled@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.0521, lng: 55.2685,
    createdAt: "2025-05-10",
  },
  {
    id: "p14",
    title: "Riverside Boutique Office",
    category: "Commercial",
    type: "For Rent",
    price: 18000,
    priceUnit: "/month",
    location: "Marasi Drive",
    city: "Dubai",
    bedrooms: 0,
    bathrooms: 2,
    area: 1850,
    features: ["Open Plan", "Meeting Room", "Pantry", "Parking"],
    description:
      "Bright canal-side office unit ready for fit-out, with open-plan layout, glazed boardroom and dedicated parking bays.",
    image: img(p3),
    gallery: [img(p3), img(p6)],
    ownerName: "Marwa Saleh",
    ownerPhone: "+971504050607",
    ownerEmail: "marwa@buylandsindia.com",
    status: "Approved",
    lat: 25.1857, lng: 55.2640,
    createdAt: "2025-05-12",
  },
  {
    id: "p15",
    title: "Hill Crest Modern Villa",
    category: "Villa",
    type: "For Sale",
    price: 1420000,
    location: "Vellayambalam",
    city: "Trivandrum",
    bedrooms: 4,
    bathrooms: 5,
    area: 18,
    areaUnit: "cents",
    features: ["Garden", "Garage", "Home Office", "Solar"],
    description:
      "Contemporary hillside villa with cross-ventilated living spaces, rooftop terrace, and integrated solar power.",
    image: img(p1),
    gallery: [img(p1), img(p4), img(p2)],
    ownerName: "Anand Pillai",
    ownerPhone: "+919447998877",
    ownerEmail: "anand@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 8.5167, lng: 76.9514,
    createdAt: "2025-05-14",
  },
  {
    id: "p16",
    title: "Backwater Heritage Rental Villa",
    category: "Villa",
    type: "For Rent",
    price: 45000,
    priceUnit: "/month",
    location: "Marine Drive",
    city: "Kochi",
    bedrooms: 4,
    bathrooms: 4,
    area: 3600,
    features: ["Sea View", "Garden", "Balcony", "Parking"],
    description:
      "Fully furnished heritage-style villa fronting the Kochi backwaters, with shaded courtyards and a private boat jetty.",
    image: img(p2),
    gallery: [img(p2), img(p5)],
    ownerName: "Neha Krishnan",
    ownerPhone: "+919447223344",
    ownerEmail: "neha@buylandsindia.com",
    status: "Approved",
    lat: 9.9710, lng: 76.2740,
    createdAt: "2025-05-15",
  },
  {
    id: "p17",
    title: "Indiranagar Designer Apartment",
    category: "Apartment",
    type: "For Rent",
    price: 32000,
    priceUnit: "/month",
    location: "Indiranagar",
    city: "Bangalore",
    bedrooms: 2,
    bathrooms: 2,
    area: 1280,
    features: ["Gym", "Parking", "Balcony", "Smart Home"],
    description:
      "Light-filled designer apartment in the heart of Indiranagar — walk to cafes, restaurants and 100 Ft Road.",
    image: img(p3),
    gallery: [img(p3), img(p1)],
    ownerName: "Karthik Iyer",
    ownerPhone: "+919447334455",
    ownerEmail: "karthik@buylandsindia.com",
    status: "Approved",
    lat: 12.9719, lng: 77.6412,
    createdAt: "2025-05-16",
  },
  {
    id: "p18",
    title: "Bandra West Sky Penthouse",
    category: "Penthouse",
    type: "For Rent",
    price: 185000,
    priceUnit: "/month",
    location: "Bandra West",
    city: "Mumbai",
    bedrooms: 4,
    bathrooms: 5,
    area: 4200,
    features: ["Sea View", "Concierge", "Gym", "Pool", "Smart Home"],
    description:
      "Sea-facing four-bedroom penthouse with a wraparound terrace, private plunge pool and dedicated lift access.",
    image: img(p5),
    gallery: [img(p5), img(p4), img(p3)],
    ownerName: "Aditi Shah",
    ownerPhone: "+919819445566",
    ownerEmail: "aditi@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 19.0596, lng: 72.8295,
    createdAt: "2025-05-17",
  },
  {
    id: "p19",
    title: "Vellayambalam Family Townhouse",
    category: "Townhouse",
    type: "For Rent",
    price: 38000,
    priceUnit: "/month",
    location: "Vellayambalam",
    city: "Trivandrum",
    bedrooms: 3,
    bathrooms: 3,
    area: 2100,
    features: ["Garden", "Garage", "Storage", "Balcony"],
    description:
      "Quiet end-unit townhouse with a private garden, covered parking and easy access to schools and the city centre.",
    image: img(p4),
    gallery: [img(p4), img(p2)],
    ownerName: "Suresh Menon",
    ownerPhone: "+919447556677",
    ownerEmail: "suresh@buylandsindia.com",
    status: "Approved",
    lat: 8.5046, lng: 76.9495,
    createdAt: "2025-05-18",
  },
  {
    id: "p20",
    title: "Beach Crest Studio Apartment",
    category: "Apartment",
    type: "For Rent",
    price: 18000,
    priceUnit: "/month",
    location: "Calicut Beach",
    city: "Calicut",
    bedrooms: 1,
    bathrooms: 1,
    area: 620,
    features: ["Sea View", "Balcony", "Parking"],
    description:
      "Compact sea-facing studio walkable to Calicut Beach — ideal for working professionals or long-stay visitors.",
    image: img(p6),
    gallery: [img(p6), img(p3)],
    ownerName: "Fathima Rasheed",
    ownerPhone: "+919447667788",
    ownerEmail: "fathima@buylandsindia.com",
    status: "Approved",
    lat: 11.2476, lng: 75.7804,
    createdAt: "2025-05-19",
  },
  {
    id: "p21",
    title: "Dubai Hills Family Villa",
    category: "Villa",
    type: "For Rent",
    price: 28000,
    priceUnit: "/month",
    location: "Dubai Hills Estate",
    city: "Dubai",
    bedrooms: 4,
    bathrooms: 5,
    area: 4400,
    features: ["Garden", "Pool", "Garage", "Smart Home", "Park View"],
    description:
      "Four-bedroom family villa overlooking the Dubai Hills park, with a private pool, landscaped garden and double garage.",
    image: img(p1),
    gallery: [img(p1), img(p2), img(p5)],
    ownerName: "Omar Al Marri",
    ownerPhone: "+971506667788",
    ownerEmail: "omar@buylandsindia.com",
    status: "Approved",
    featured: true,
    lat: 25.1043, lng: 55.2475,
    createdAt: "2025-05-20",
  },
];

export const CATEGORIES = ["All", "Villa", "Apartment", "Penthouse", "Townhouse", "Commercial", "Land"] as const;
export const FEATURES_LIST = [
  "Swimming Pool", "Gym", "Parking", "Balcony", "Garden", "Smart Home",
  "Sea View", "Concierge", "Maid Room", "Storage", "Private Beach", "Garage",
];

export interface Enquiry {
  id: string;
  propertyId: string;
  propertyTitle: string;
  fromName: string;
  fromEmail: string;
  fromPhone: string;
  message: string;
  createdAt: string;
  status: "New" | "Replied" | "Closed";
}

export const ENQUIRIES: Enquiry[] = [
  {
    id: "e1",
    propertyId: "p1",
    propertyTitle: "Azure Bay Infinity Villa",
    fromName: "Omar Khalid",
    fromEmail: "omar@example.com",
    fromPhone: "+971509998888",
    message: "Interested in scheduling a private viewing this weekend.",
    createdAt: "2025-04-25",
    status: "New",
  },
  {
    id: "e2",
    propertyId: "p3",
    propertyTitle: "Skyline Penthouse Residence",
    fromName: "Aisha Rahman",
    fromEmail: "aisha@example.com",
    fromPhone: "+971501112222",
    message: "Could I get more details on payment plans?",
    createdAt: "2025-04-24",
    status: "Replied",
  },
];

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  active: boolean;
  propertyCount: number;
}

export const USERS: AppUser[] = [
  { id: "u1", name: "Layla Hassan", email: "layla@buylandsindia.com", phone: "+971501234567", joinedAt: "2025-01-12", active: true, propertyCount: 4 },
  { id: "u2", name: "Marco Devereaux", email: "marco@buylandsindia.com", phone: "+971502221111", joinedAt: "2025-02-04", active: true, propertyCount: 2 },
  { id: "u3", name: "Sara Iqbal", email: "sara@buylandsindia.com", phone: "+971503334444", joinedAt: "2025-02-19", active: true, propertyCount: 1 },
  { id: "u4", name: "Daniel Wright", email: "daniel@buylandsindia.com", phone: "+971504445555", joinedAt: "2025-03-02", active: false, propertyCount: 1 },
];

export const TESTIMONIALS = [
  { name: "Savannah N.", role: "Property Investor", quote: "The entire process was flawless. Their attention to detail and modern aesthetic is second to none." },
  { name: "Rashid A.", role: "Homeowner", quote: "Found our dream home faster than we ever thought possible. Genuinely premium service." },
  { name: "Elena V.", role: "Tenant", quote: "Verified listings, real photos and zero pressure. A pleasure from start to finish." },
];

export const ANNOUNCEMENTS = [
  { id: "a1", title: "Spring Collection Now Live", body: "Discover 40+ new luxury homes added this week.", date: "May 1, 2026" },
  { id: "a2", title: "Zero Commission Week", body: "List your property this week with no platform fee.", date: "Apr 28, 2026" },
];
