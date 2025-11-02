'use client';

import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ChevronsRight, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Product, PackagingStructure, PackagingType, PalletType, Dimensions } from '@/lib/definitions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { calculateTotalUnits } from '@/lib/product-utils';

const dimensionsSchema = z.object({
  length: z.coerce.number().min(0),
  width: z.coerce.number().min(0),
  height: z.coerce.number().min(0),
});

const fpakkSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  size: z.string().min(1, 'Size is required'),
  variant: z.string().optional(),
  sku: z.string().min(1, 'SKU is required'),
  ean: z.string().min(1, 'EAN is required'),
  weight: z.coerce.number().min(0),
  deposit: z.coerce.number().min(0),
  pricePerUnit: z.coerce.number().min(0),
  dimensions: dimensionsSchema,
});

const mellompakkSchema = z.object({
  type: z.enum(['homogeneous', 'mixed']),
  name: z.string().min(1, 'Name is required'),
  quantityPerBox: z.coerce.number().min(1),
  ean: z.string().min(1, 'EAN is required'),
  pricePerBox: z.coerce.number().min(0),
  weight: z.coerce.number().min(0),
  dimensions: dimensionsSchema,
  contents: z.array(z.object({ fpakkId: z.string(), name: z.string(), quantity: z.coerce.number() })).optional(),
});

const toppakkSchema = z.object({
  type: z.enum(['homogeneous', 'mixed']),
  palletType: z.enum(['full', 'half', 'quarter', 'custom']),
  name: z.string().min(1, 'Name is required'),
  boxesPerPallet: z.coerce.number().min(1),
  totalUnits: z.coerce.number().min(0),
  pricePerPallet: z.coerce.number().min(0),
  ean: z.string().optional(),
  weight: z.coerce.number().min(0),
  dimensions: dimensionsSchema,
  contents: z.array(z.object({ mellompakkId: z.string(), name: z.string(), quantity: z.coerce.number() })).optional(),
});

const inventorySchema = z.object({
  fpakk: z.coerce.number().min(0),
  mellompakk: z.coerce.number().min(0),
  toppakk: z.coerce.number().min(0),
  totalUnits: z.coerce.number().min(0),
  lowStockThreshold: z.object({
    fpakk: z.coerce.number().min(0),
    mellompakk: z.coerce.number().min(0),
    toppakk: z.coerce.number().min(0),
  }),
});

const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  country: z.string().min(1, 'Country is required'),
  producer: z.string().optional(),
  alcoholPercent: z.coerce.number().min(0).optional(),
  type: z.string().optional(),
  metadata: z.object({
    status: z.enum(['Active', 'Draft', 'Archived']),
    featured: z.boolean().optional(),
  }),
  structure: z.enum(['simple', 'hierarchical']),
  fpakk: fpakkSchema,
  mellompakk: mellompakkSchema.optional(),
  toppakk: toppakkSchema.optional(),
  inventory: inventorySchema,
  pricing: z.object({
    standard: z.object({
      fpakk: z.coerce.number().min(0),
      mellompakk: z.coerce.number().min(0),
      toppakk: z.coerce.number().min(0),
    }),
  }),
});

type ProductFormData = z.infer<typeof productSchema>;

const SectionCard = ({ title, description, children, className }: { title: string, description?: string, children: React.ReactNode, className?: string }) => (
    <Card className={className}>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent className="grid gap-6">
            {children}
        </CardContent>
    </Card>
)

const DimensionsInput = ({ control, namePrefix }: { control: any, namePrefix: `fpakk.dimensions` | `mellompakk.dimensions` | `toppakk.dimensions` }) => (
    <div className="grid grid-cols-3 gap-4">
        <FormField control={control} name={`${namePrefix}.length`} render={({ field }) => (<FormItem><FormLabel>Length (cm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name={`${namePrefix}.width`} render={({ field }) => (<FormItem><FormLabel>Width (cm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={control} name={`${namePrefix}.height`} render={({ field }) => (<FormItem><FormLabel>Height (cm)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
    </div>
);


export default function EditProductPage() {
  const { id } = useParams();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isNewProduct = id === 'new';

  const productRef = useMemoFirebase(() => !isNewProduct && firestore ? doc(firestore, 'products', id as string) : null, [isNewProduct, firestore, id]);
  const { data: product, isLoading: isLoadingProduct } = useDoc<Product>(productRef);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      country: '',
      producer: '',
      alcoholPercent: 0,
      type: '',
      metadata: { status: 'Draft', featured: false },
      structure: 'simple',
      fpakk: { name: '', size: '', variant: '', sku: '', ean: '', weight: 0, deposit: 0, pricePerUnit: 0, dimensions: { length: 0, width: 0, height: 0 } },
      inventory: { fpakk: 0, mellompakk: 0, toppakk: 0, totalUnits: 0, lowStockThreshold: { fpakk: 10, mellompakk: 5, toppakk: 1 } },
      pricing: { standard: { fpakk: 0, mellompakk: 0, toppakk: 0 } },
    },
  });

  const structure = form.watch('structure');
  
  const inventoryValues = form.watch('inventory');
  const mellompakkValues = form.watch('mellompakk');
  const toppakkValues = form.watch('toppakk');


  useEffect(() => {
    if (product) {
      form.reset(product as any); // Type assertion to match form data structure
    }
  }, [product, form]);
  
  useEffect(() => {
    const total = calculateTotalUnits(inventoryValues, structure, mellompakkValues?.quantityPerBox, toppakkValues?.boxesPerPallet);
    if(total !== inventoryValues.totalUnits) {
        form.setValue('inventory.totalUnits', total, { shouldValidate: true });
    }
  }, [inventoryValues, structure, mellompakkValues, toppakkValues, form]);


  const onSubmit: SubmitHandler<ProductFormData> = async (data) => {
    if (!firestore) return;

    toast({ title: isNewProduct ? 'Creating product...' : 'Updating product...'});

    // Clean up optional fields based on structure
    if (data.structure === 'simple') {
      delete data.mellompakk;
      delete data.toppakk;
      data.inventory.mellompakk = 0;
      data.inventory.toppakk = 0;
      data.pricing.standard.mellompakk = 0;
      data.pricing.standard.toppakk = 0;
    }

    try {
      if (isNewProduct) {
        const newDocRef = await addDoc(collection(firestore, 'products'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        toast({ title: 'Product Created!', description: `${data.name} has been added.` });
        router.push(`/admin/products/edit/${newDocRef.id}`);
      } else {
        await setDoc(doc(firestore, 'products', id as string), { ...data, updatedAt: serverTimestamp() }, { merge: true });
        toast({ title: 'Product Updated!', description: `${data.name} has been saved.` });
        router.push('/admin/products');
      }
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        variant: 'destructive',
        title: 'Error saving product',
        description: error.message,
      });
    }
  };

  if (isLoadingProduct) return <p>Loading product...</p>;
  if (!isNewProduct && !product) return <p>Product not found.</p>;

  return (
    <div>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold font-headline">{isNewProduct ? 'Create New Product' : 'Edit Product'}</h1>
                        <p className="text-muted-foreground">Manage product details, packaging, inventory, and pricing.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/products')}>Cancel</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? 'Saving...' : 'Save Product'}
                        </Button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-2 grid gap-8">
                        <SectionCard title="Product Information">
                            <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Product Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="category" render={({ field }) => (<FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="type" render={({ field }) => (<FormItem><FormLabel>Product Type</FormLabel><FormControl><Input placeholder='e.g., Beer, Wine, Spirit' {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="producer" render={({ field }) => (<FormItem><FormLabel>Producer</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="alcoholPercent" render={({ field }) => (<FormItem><FormLabel>Alcohol %</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </div>
                        </SectionCard>
                        
                        <SectionCard title="Packaging Hierarchy" description="Define how this product is packaged and sold.">
                            <FormField
                                control={form.control}
                                name="structure"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                    <FormLabel>Product Structure</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={(value) => {
                                            field.onChange(value);
                                            if (value === 'hierarchical' && !form.getValues('mellompakk')) {
                                                form.setValue('mellompakk', { type: 'homogeneous', name: '', quantityPerBox: 24, ean: '', pricePerBox: 0, weight: 0, dimensions: { length: 0, width: 0, height: 0 } });
                                                form.setValue('toppakk', { type: 'homogeneous', palletType: 'full', name: '', boxesPerPallet: 30, totalUnits: 0, pricePerPallet: 0, weight: 0, dimensions: { length: 0, width: 0, height: 0 } });
                                            }
                                        }}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                        >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="simple" /></FormControl>
                                            <FormLabel className="font-normal">Simple Product (Sold per unit)</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl><RadioGroupItem value="hierarchical" /></FormControl>
                                            <FormLabel className="font-normal">Hierarchical Product (e.g., Bottle → Case → Pallet)</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                                />

                        </SectionCard>

                        <div className="grid gap-8">
                            <SectionCard title="Fpakk (Base Unit)" description="The smallest individual unit of the product (e.g., one bottle, one can).">
                                <FormField control={form.control} name="fpakk.name" render={({ field }) => (<FormItem><FormLabel>Unit Name</FormLabel><FormControl><Input placeholder='e.g., Bottle, Can' {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <div className="grid md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="fpakk.size" render={({ field }) => (<FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder='e.g., 0.33L' {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="fpakk.variant" render={({ field }) => (<FormItem><FormLabel>Variant</FormLabel><FormControl><Input placeholder='e.g., IPA, Lager' {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="fpakk.sku" render={({ field }) => (<FormItem><FormLabel>SKU</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="fpakk.ean" render={({ field }) => (<FormItem><FormLabel>EAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="fpakk.weight" render={({ field }) => (<FormItem><FormLabel>Weight (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                    <FormField control={form.control} name="fpakk.deposit" render={({ field }) => (<FormItem><FormLabel>Deposit (kr)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                </div>
                                <DimensionsInput control={form.control} namePrefix="fpakk.dimensions" />
                            </SectionCard>
                            
                            {structure === 'hierarchical' && (
                                <>
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <ChevronsRight className="h-8 w-8" />
                                    </div>
                                    <SectionCard title="Mellompakk (Inner Pack)" description="A case or box containing multiple base units (e.g., a 24-pack of bottles).">
                                        <FormField control={form.control} name="mellompakk.name" render={({ field }) => (<FormItem><FormLabel>Pack Name</FormLabel><FormControl><Input placeholder="e.g., Case 24x0.33L" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="mellompakk.quantityPerBox" render={({ field }) => (<FormItem><FormLabel>Units per Pack</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="mellompakk.ean" render={({ field }) => (<FormItem><FormLabel>EAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="mellompakk.weight" render={({ field }) => (<FormItem><FormLabel>Weight (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <DimensionsInput control={form.control} namePrefix="mellompakk.dimensions" />
                                    </SectionCard>

                                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                                        <ChevronsRight className="h-8 w-8" />
                                    </div>

                                    <SectionCard title="Toppakk (Outer Case / Pallet)" description="The largest packaging unit, typically a pallet.">
                                        <FormField control={form.control} name="toppakk.name" render={({ field }) => (<FormItem><FormLabel>Pallet Name</FormLabel><FormControl><Input placeholder="e.g., Full Pallet" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <FormField control={form.control} name="toppakk.boxesPerPallet" render={({ field }) => (<FormItem><FormLabel>Packs per Pallet</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="toppakk.palletType" render={({ field }) => (
                                                <FormItem><FormLabel>Pallet Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="full">Full</SelectItem>
                                                        <SelectItem value="half">Half</SelectItem>
                                                        <SelectItem value="quarter">Quarter</SelectItem>
                                                        <SelectItem value="custom">Custom</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )} />
                                            <FormField control={form.control} name="toppakk.ean" render={({ field }) => (<FormItem><FormLabel>EAN</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                                            <FormField control={form.control} name="toppakk.weight" render={({ field }) => (<FormItem><FormLabel>Weight (kg)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                        </div>
                                        <DimensionsInput control={form.control} namePrefix="toppakk.dimensions" />
                                    </SectionCard>
                                </>
                            )}
                        </div>
                </div>
                <div className="lg:col-span-1 grid gap-8">
                    <SectionCard title="Status">
                        <FormField control={form.control} name="metadata.status" render={({ field }) => (
                            <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Active">Active</SelectItem>
                                    <SelectItem value="Draft">Draft</SelectItem>
                                    <SelectItem value="Archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )} />
                    </SectionCard>

                    <SectionCard title="Inventory" description="Current stock levels for each packaging unit.">
                        <FormField control={form.control} name="inventory.fpakk" render={({ field }) => (<FormItem><FormLabel>Fpakk (units)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        {structure === 'hierarchical' && (
                            <>
                                <FormField control={form.control} name="inventory.mellompakk" render={({ field }) => (<FormItem><FormLabel>Mellompakk (packs)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="inventory.toppakk" render={({ field }) => (<FormItem><FormLabel>Toppakk (pallets)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            </>
                        )}
                        <hr/>
                        <div>
                            <Label className="text-muted-foreground">Total Stock (Units)</Label>
                            <p className="text-2xl font-bold">{form.getValues('inventory.totalUnits') || 0}</p>
                        </div>
                    </SectionCard>
                    
                    <SectionCard title="Pricing (NOK)" description="Standard prices for each packaging unit.">
                        <FormField control={form.control} name="pricing.standard.fpakk" render={({ field }) => (<FormItem><FormLabel>Fpakk Price (per unit)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        {structure === 'hierarchical' && (
                            <>
                                <FormField control={form.control} name="pricing.standard.mellompakk" render={({ field }) => (<FormItem><FormLabel>Mellompakk Price (per pack)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>)} />
                                <FormField control={form.control} name="pricing.standard.toppakk" render={({ field }) => (<FormItem><FormLabel>Toppakk Price (per pallet)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormMessage /></FormItem>)} />
                            </>
                        )}
                    </SectionCard>

                </div>
                </div>
            </form>
        </Form>
    </div>
  );
}
