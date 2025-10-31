'use client';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, updateDoc, increment } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { collection } from 'firebase/firestore';
import type { Product } from '@/lib/definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const stockReceptionSchema = z.object({
  productId: z.string().min(1, 'You must select a product.'),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1.'),
});

type StockReceptionFormData = z.infer<typeof stockReceptionSchema>;

export default function StockPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const productsRef = useMemoFirebase(() => firestore ? collection(firestore, 'products') : null, [firestore]);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

  const form = useForm<StockReceptionFormData>({
    resolver: zodResolver(stockReceptionSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
    },
  });

  const onSubmit: SubmitHandler<StockReceptionFormData> = async (data) => {
    if (!firestore) return;

    toast({ title: 'Registering stock reception...' });

    const productDocRef = doc(firestore, 'products', data.productId);
    const selectedProductName = products?.find(p => p.id === data.productId)?.name || 'Product';

    try {
      await updateDoc(productDocRef, {
        'stock.quantity': increment(data.quantity)
      });
      toast({
        title: 'Stock Updated!',
        description: `${data.quantity} units of ${selectedProductName} have been added to stock.`,
      });
      form.reset();
    } catch (error: any) {
      console.error('Error updating stock:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Could not update stock. ${error.message}`,
      });
    }
  };

  return (
    <div className="grid gap-6">
      <Card className="max-w-2xl mx-auto w-full">
        <CardHeader>
          <CardTitle className="font-headline">Varemottak (Stock Reception)</CardTitle>
          <CardDescription>Register incoming goods to update your stock levels.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingProducts ? "Loading products..." : "Select a product"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {!isLoadingProducts && products?.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} (SKU: {product.sku})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity Received</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting || isLoadingProducts}>
                {form.formState.isSubmitting ? 'Registering...' : 'Register Reception'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
