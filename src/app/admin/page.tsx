'use client';

import {
  Activity,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, query, where, limit } from "firebase/firestore";
import type { Order, Company } from "@/lib/definitions";
import { useMemo, useState, useEffect } from "react";

export default function AdminDashboardPage() {
    const firestore = useFirestore();

    // Data for charts and summaries
    const [salesData, setSalesData] = useState<any[]>([]);

    // Fetch recent orders
    const recentOrdersQuery = useMemoFirebase(() => 
        firestore 
            ? query(collection(firestore, 'orders'), limit(5)) 
            : null, 
        [firestore]
    );
    const { data: recentOrders, isLoading: isLoadingOrders } = useCollection<Order>(recentOrdersQuery);

    // Fetch all orders for stats
     const allOrdersQuery = useMemoFirebase(() => 
        firestore 
            ? collection(firestore, 'orders')
            : null, 
        [firestore]
    );
    const { data: allOrders } = useCollection<Order>(allOrdersQuery);

    // Fetch all companies for stats
    const companiesQuery = useMemoFirebase(() => 
        firestore 
            ? collection(firestore, 'companies')
            : null, 
        [firestore]
    );
    const { data: companies } = useCollection<Company>(companiesQuery);


    const totalRevenue = useMemo(() => {
        return allOrders?.reduce((acc, order) => acc + order.pricing.total, 0) || 0;
    }, [allOrders]);

    const totalSales = useMemo(() => allOrders?.length || 0, [allOrders]);
    
    const newCustomersThisMonth = useMemo(() => {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        return companies?.filter(c => c.registeredAt.toDate() > oneMonthAgo).length || 0;
    }, [companies]);

    const pendingOrdersCount = useMemo(() => {
        return allOrders?.filter(o => o.status === 'Pending').length || 0;
    }, [allOrders]);


     // Generate random sales data for the chart
    useEffect(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const data = monthNames.map(name => ({
        name,
        total: Math.floor(Math.random() * 4000) + 1000,
        }));
        setSalesData(data);
    }, []);

  return (
    <div className="grid gap-4 md:gap-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on all orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newCustomersThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              In the last 30 days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{totalSales}</div>
            <p className="text-xs text-muted-foreground">
              Total number of orders placed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{pendingOrdersCount}</div>
            <p className="text-xs text-muted-foreground">
              Total pending orders
            </p>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={salesData}>
                <XAxis
                  dataKey="name"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value}`}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>
                Your 5 most recent orders.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/admin/orders">
                View All
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingOrders && <TableRow><TableCell colSpan={2}>Loading...</TableCell></TableRow>}
                {recentOrders?.map(order => (
                    <TableRow key={order.id}>
                        <TableCell>
                            <div className="font-medium">{order.customer.name}</div>
                            <div className="hidden text-sm text-muted-foreground md:inline">
                                {order.orderNumber}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">${order.pricing.total.toFixed(2)}</TableCell>
                    </TableRow>
                ))}
                 {!isLoadingOrders && recentOrders?.length === 0 && <TableRow><TableCell colSpan={2}>No recent orders.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
