import { Product, Customer, Order } from "@/lib/definitions";
import { PlaceHolderImages } from "./placeholder-images";

const findImage = (id: string) => PlaceHolderImages.find(p => p.id === id);

const whiskeyImage = findImage('whiskey-bottle');
const wineImage = findImage('wine-bottle');
const beerImage = findImage('beer-cans');
const ginImage = findImage('gin-bottle');
const vodkaImage = findImage('vodka-bottle');
const rumImage = findImage('rum-bottle');

// Mock data is now removed. Data will be fetched from Firestore.
export const mockProducts: Product[] = [];
export const mockCustomers: Customer[] = [];
export const mockOrders: Order[] = [];
