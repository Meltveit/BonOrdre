export type Product = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  imageHint: string;
  variants?: {
    size: string;
    price: number;
    stock: number;
  }[];
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  date: string;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  total: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
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

export type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
};
