import { Product, Customer, Order } from "@/lib/definitions";
import { PlaceHolderImages } from "./placeholder-images";

const findImage = (id: string) => PlaceHolderImages.find(p => p.id === id);

const whiskeyImage = findImage('whiskey-bottle');
const wineImage = findImage('wine-bottle');
const beerImage = findImage('beer-cans');
const ginImage = findImage('gin-bottle');
const vodkaImage = findImage('vodka-bottle');
const rumImage = findImage('rum-bottle');


export const mockProducts: Product[] = [
  {
    id: "PROD001",
    name: "Highland Single Malt",
    category: "Whiskey",
    description: "Aged 12 years, this single malt offers a rich, smoky flavor with notes of honey and vanilla.",
    price: 75.99,
    stock: 120,
    imageUrl: whiskeyImage?.imageUrl || '',
    imageHint: whiskeyImage?.imageHint || 'whiskey bottle'
  },
  {
    id: "PROD002",
    name: "Napa Valley Cabernet",
    category: "Wine",
    description: "A full-bodied red wine with deep berry flavors and a smooth, lingering finish. Perfect for pairing with red meat.",
    price: 45.50,
    stock: 80,
    imageUrl: wineImage?.imageUrl || '',
    imageHint: wineImage?.imageHint || 'wine bottle'
  },
  {
    id: "PROD003",
    name: "Artisanal IPA Pack",
    category: "Beer",
    description: "A 6-pack of handcrafted India Pale Ale, bursting with hoppy bitterness and citrus aromas.",
    price: 18.00,
    stock: 250,
    imageUrl: beerImage?.imageUrl || '',
    imageHint: beerImage?.imageHint || 'beer cans'
  },
  {
    id: "PROD004",
    name: "London Dry Gin",
    category: "Gin",
    description: "A classic dry gin with strong juniper notes, ideal for a perfect gin and tonic.",
    price: 32.99,
    stock: 150,
    imageUrl: ginImage?.imageUrl || '',
    imageHint: ginImage?.imageHint || 'gin bottle'
  },
  {
    id: "PROD005",
    name: "Premium Polish Vodka",
    category: "Vodka",
    description: "Quadruple-distilled for exceptional smoothness and a clean taste. Serve chilled.",
    price: 28.75,
    stock: 200,
    imageUrl: vodkaImage?.imageUrl || '',
    imageHint: vodkaImage?.imageHint || 'vodka bottle'
  },
  {
    id: "PROD006",
    name: "Caribbean Spiced Rum",
    category: "Rum",
    description: "A dark rum infused with a secret blend of spices, offering a warm and complex flavor profile.",
    price: 38.00,
    stock: 110,
    imageUrl: rumImage?.imageUrl || '',
    imageHint: rumImage?.imageHint || 'rum bottle'
  }
];

export const mockCustomers: Customer[] = [
  {
    id: "CUST001",
    name: "Alice Johnson",
    email: "alice.j@example.com",
    companyName: "The Grand Hotel",
    phone: "123-456-7890",
    address: "123 Main St, Anytown, USA",
    status: "Approved",
    registrationDate: "2023-01-15",
  },
  {
    id: "CUST002",
    name: "Bob Williams",
    email: "bob.w@example.net",
    companyName: "Williams Fine Dining",
    phone: "987-654-3210",
    address: "456 Oak Ave, Anytown, USA",
    status: "Approved",
    registrationDate: "2023-02-20",
  },
  {
    id: "CUST003",
    name: "Charlie Brown",
    email: "charlie.b@example.org",
    companyName: "Brown's Bar & Grill",
    phone: "555-123-4567",
    address: "789 Pine Ln, Anytown, USA",
    status: "Pending Approval",
    registrationDate: "2023-03-10",
  },
    {
    id: "CUST004",
    name: "Diana Prince",
    email: "diana.p@example.com",
    companyName: "Themyscira Events",
    phone: "555-555-5555",
    address: "1 Paradise Island, DC",
    status: "Rejected",
    registrationDate: "2023-03-12",
  },
];

export const mockOrders: Order[] = [
  {
    id: "ORD-2024-001",
    customerId: "CUST001",
    customerName: "Alice Johnson",
    date: "2024-07-20",
    status: "Delivered",
    total: 348.97,
    items: [
      { productId: "PROD001", productName: "Highland Single Malt", quantity: 3, price: 75.99 },
      { productId: "PROD002", productName: "Napa Valley Cabernet", quantity: 2, price: 45.50 },
    ],
  },
  {
    id: "ORD-2024-002",
    customerId: "CUST002",
    customerName: "Bob Williams",
    date: "2024-07-21",
    status: "Shipped",
    total: 212.97,
    items: [
      { productId: "PROD004", productName: "London Dry Gin", quantity: 3, price: 32.99 },
      { productId: "PROD005", productName: "Premium Polish Vodka", quantity: 4, price: 28.75 },
    ],
  },
  {
    id: "ORD-2024-003",
    customerId: "CUST001",
    customerName: "Alice Johnson",
    date: "2024-07-22",
    status: "Processing",
    total: 108.00,
    items: [
      { productId: "PROD003", productName: "Artisanal IPA Pack", quantity: 6, price: 18.00 },
    ],
  },
  {
    id: "ORD-2024-004",
    customerId: "CUST002",
    customerName: "Bob Williams",
    date: "2024-07-23",
    status: "Pending",
    total: 76.00,
    items: [
        { productId: "PROD006", productName: "Caribbean Spiced Rum", quantity: 2, price: 38.00 },
    ]
  },
];
