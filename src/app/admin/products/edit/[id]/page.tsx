'use client';

import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, addDoc, collection } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
  stock: z.coerce.number().min(0, 'Stock must be a positive number'),
  status: z.enum(['Active', 'Draft', 'Archived']),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isNewProduct = id === 'new';

  const productRef = !isNewProduct && firestore ? doc(firestore, 'products', id as string) : null;
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      sku: '',
      category: '',
      description: '',
      price: 0,
      stock: 0,
      status: 'Draft',
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku,
        category: product.category,
        description: product.description,
        price: product.pricing?.basePrice || 0,
        stock: product.stock?.quantity || 0,
        status: product.metadata?.status || 'Draft',
      });
    }
  }, [product, form]);

  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    if (!firestore) return;

    toast({ title: 'Saving product...' });
    
    const productData = {
      name: data.name,
      sku: data.sku,
      category: data.category,
      description: data.description || '',
      pricing: { basePrice: data.price, currency: 'NOK' },
      stock: { quantity: data.stock, lowStockThreshold: 10 },
      metadata: { status: data.status },
      // Setting default/empty values for other required fields
      images: { url: '', alt: '' },
      eanNumber: '',
      country: '',
      size: '',
      alcoholPercentage: 0,
      productType: '',
      manufacturer: '',
      variants: [],
      packaging: {},
      searchKeywords: [],
    };

    try {
      if (isNewProduct) {
        const newProdRef = await addDoc(collection(firestore, 'products'), productData);
        toast({ title: 'Product Created!', description: `${data.name} has been added.` });
        router.push(`/admin/products/edit/${newProdRef.id}`);
      } else {
        await setDoc(doc(firestore, 'products', id as string), productData, { merge: true });
        toast({ title: 'Product Updated!', description: `${data.name} has been saved.` });
      }
      router.push('/admin/products');
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving product',
        description: error.message,
      });
    }
  };

  if (isLoadingProduct) {
    return <p>Loading product...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isNewProduct ? 'Add New Product' : 'Edit Product'}</CardTitle>
        <CardDescription>Fill in the details below to {isNewProduct ? 'add a new' : 'update the'} product.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Highland Single Malt" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., BON-WHI-001" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., Whiskey" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A short description of the product." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Price (NOK)</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Initial Stock Quantity</FormLabel>
                    <FormControl>
                        <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="Draft">Draft</SelectItem>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save Product'}
                </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
