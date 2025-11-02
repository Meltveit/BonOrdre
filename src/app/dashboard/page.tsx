'use client';
import Image from "next/image";
import Link from "next/link";
import { PlusCircle, File, ListFilter } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Product } from "@/lib/definitions";

export default function DashboardPage() {
    const firestore = useFirestore();
    const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
    const { data: products, isLoading } = useCollection<Product>(productsRef);

  return (
    <Tabs defaultValue="all">
      <div className="flex items-center">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="Whiskey">Whiskey</TabsTrigger>
          <TabsTrigger value="Wine">Wine</TabsTrigger>
          <TabsTrigger value="Beer">Beer</TabsTrigger>
        </TabsList>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Filter
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked>
                Active
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>Draft</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>
                Archived
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="outline" className="h-7 gap-1">
            <File className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Export
            </span>
          </Button>
          <Button size="sm" className="h-7 gap-1 bg-accent hover:bg-accent/90">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add to Cart
            </span>
          </Button>
        </div>
      </div>
      <TabsContent value="all">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-4">
            {isLoading && Array.from({ length: 6 }).map((_, i) => <Card key={i}><CardHeader><div className="w-full h-48 bg-muted animate-pulse rounded-t-lg" /></CardHeader><CardContent className="p-4 grid gap-2"><div className="w-3/4 h-6 bg-muted animate-pulse rounded" /><div className="w-1/2 h-4 bg-muted animate-pulse rounded" /></CardContent><CardFooter className="p-4 pt-0"><div className="w-full h-10 bg-muted animate-pulse rounded" /></CardFooter></Card>)}
            {!isLoading && products?.length === 0 && <p>No products found.</p>}
            {products?.map((product) => (
                <Card key={product.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <CardHeader className="p-0">
                        {(product.images?.main || product.fpakk?.image) && <Image
                            src={product.images?.main || product.fpakk?.image || ''}
                            alt={product.name}
                            width={400}
                            height={400}
                            className="object-cover rounded-t-lg aspect-square"
                        />}
                    </CardHeader>
                    <CardContent className="p-4 grid gap-2">
                        <CardTitle className="font-headline text-lg">{product.name}</CardTitle>
                        <CardDescription className="text-sm">{product.category}</CardDescription>
                        <p className="font-semibold text-base">{product.pricing?.standard?.fpakk?.toFixed(2) || 'N/A'} kr</p>
                    </CardContent>
                    <CardFooter className="p-4 pt-0">
                        <Button className="w-full">Add to Cart</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}