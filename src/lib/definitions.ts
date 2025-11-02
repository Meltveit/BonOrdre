import type { Timestamp } from "firebase/firestore";

// --- START: Packaging & Product Hierarchy Types ---

export type PackagingStructure = 'simple' | 'hierarchical';
export type PackagingType = 'homogeneous' | 'mixed';
export type PalletType = 'full' | 'half' | 'quarter' | 'custom';

export interface Dimensions {
  length: number;  // cm
  width: number;   // cm
  height: number;  // cm
}

export interface FpakkContent {
  fpakkId: string;
  name: string;
  quantity: number;
}

export interface MellompakkContent {
  mellompakkId: string;
  name: string;
  quantity: number;
}

export interface Fpakk {
  name: string;
  size: string;              // f.eks. "0.33L", "0.5L"
  variant: string;           // f.eks. "Original", "IPA"
  sku: string;
  ean: string;
  weight: number;            // gram
  deposit: number;           // pant i kr
  pricePerUnit: number;
  dimensions: Dimensions;
  image?: string;            // Firebase Storage URL
}

export interface Mellompakk {
  type: PackagingType;       // 'homogeneous' eller 'mixed'
  name: string;
  quantityPerBox: number;    // antall Fpakk i mellompakk
  ean: string;
  pricePerBox: number;
  weight: number;            // gram
  dimensions: Dimensions;
  contents?: FpakkContent[]; // Kun for mixed type
}

export interface Toppakk {
  type: PackagingType;       // 'homogeneous' eller 'mixed'
  palletType: PalletType;
  name: string;
  boxesPerPallet: number;    // antall Mellompakk på pall
  totalUnits: number;        // autoberegnes: boxesPerPallet × quantityPerBox
  pricePerPallet: number;
  ean?: string;
  weight: number;            // gram
  dimensions: Dimensions;
  contents?: MellompakkContent[]; // Kun for mixed type
}

export interface Inventory {
  fpakk: number;             // løse enheter
  mellompakk: number;        // hele kasser
  toppakk: number;           // hele paller
  totalUnits: number;        // autoberegnes
  lowStockThreshold: {
    fpakk: number;
    mellompakk: number;
    toppakk: number;
  };
  lastUpdated: Timestamp;
}

export interface PricingTier {
  fpakk: number;
  mellompakk: number;
  toppakk: number;
}

export interface CustomerSpecificPricing {
  [customerId: string]: PricingTier;
}

export interface CampaignPricing {
  active: boolean;
  startDate: Timestamp;
  endDate: Timestamp;
  discountPercent: number;
}

export interface ProductPricing {
  standard: PricingTier;
  customerSpecific?: CustomerSpecificPricing;
  campaign?: CampaignPricing;
}

// --- END: Packaging & Product Hierarchy Types ---

// --- START: Company Approval Types ---

export interface CompanyApplication {
  id: string;
  userId: string;
  companyName: string;
  orgNumber: string;
  companyType: string;
  contactEmail: string;
  contactPhone: string;
  contactPerson: {
    firstName: string;
    lastName: string;
  };
  visitingAddress: {
    street: string;
    zip: string;
    city: string;
  };
  billingAddress: {
    street: string;
    zip: string;
    city: string;
  };
  deliveryAddress: {
    street: string;
    zip: string;
    city: string;
  };
  comments?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  rejectionReason?: string;
}

// --- END: Company Approval Types ---


export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  country: string;
  producer?: string;
  alcoholPercent?: number;
  type?: string;              // øl, vin, brennevin, cider
  
  // Emballasjestruktur
  structure: PackagingStructure; // 'simple' eller 'hierarchical'
  
  // Emballasjehierarki (kun hvis structure = 'hierarchical')
  fpakk?: Fpakk;
  mellompakk?: Mellompakk;
  toppakk?: Toppakk;
  
  // Lager
  inventory: Inventory;
  
  // Priser
  pricing: ProductPricing;
  
  // Bilder
  images?: {
    main?: string;           // Firebase Storage URL
    gallery?: string[];
  };
  
  // Metadata
  metadata?: {
    status: 'Active' | 'Draft' | 'Archived';
    featured?: boolean;
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  companyId: string;
  customer: {
      name: string;
      email: string;
  };
  items: any[];
  shipping: any;
  pricing: {
      total: number;
      subtotal: number;
      tax: number;
      shipping: number;
  };
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  timeline: { status: string; date: Timestamp }[];
  comments: any[];
  documents: any;
  metadata: any;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  companyName: string;
  phone: string;
  address: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  registrationDate: string;
};

export type Company = {
  id: string;
  name: string;
  orgNumber: string;
  companyType: string;
  contactEmail: string;
  contactPhone: string;
  visitingAddress: {
    street: string;
    zip: string;
    city: string;
  };
  billingAddress: {
    street: string;
    zip: string;
    city: string;
  };
  deliveryAddresses: Array<{
    id: string;
    label: string;
    street: string;
    zip: string;
    city: string;
    isDefault: boolean;
  }>;
  active: boolean;
  registeredAt: Timestamp;
  userId: string; // Link to users collection
}

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
};
