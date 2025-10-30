import type { Timestamp } from "firebase/firestore";

export type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  images: {
    url: string;
    alt: string;
  };
  sku: string;
  eanNumber: string;
  country: string;
  size: string;
  alcoholPercentage: number;
  productType: string;
  manufacturer: string;
  variants: any[];
  pricing: {
    basePrice: number;
    currency: string;
  };
  packaging: any;
  stock: {
    quantity: number;
    lowStockThreshold: number;
  };
  metadata: {
      status: 'Active' | 'Draft' | 'Archived'
  };
  searchKeywords: string[];
};

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
    contactPerson: {
        firstName: string;
        lastName: string;
    };
    billingAddress: any;
    visitingAddress: any;
    shippingAddresses: any[];
    pricing: any;
    active: boolean;
    approved: boolean;
    registeredAt: Timestamp;
    approvedAt: Timestamp | null;
    approvedBy: string | null;
    adminNotes: string;
}

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
};
