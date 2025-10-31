import { Product, Customer, Order } from "@/lib/definitions";
import { PlaceHolderImages } from "./placeholder-images";

const findImage = (id: string) => PlaceHolderImages.find(p => p.id === id);

// This file is now clean of mock data.
// All data should be fetched from Firestore.
