'use client';

import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer } from "recharts"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { File } from "lucide-react"

const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--primary))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--accent))",
  },
}

export default function AdminReportsPage() {
  return (
    <div className="grid gap-6">
        <div className="flex justify-between items-start">
            <div>
                <h1 className="text-3xl font-headline font-bold">Reports & Analytics</h1>
                <p className="text-muted-foreground">
                    Insights into your business performance.
                </p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline"><File className="w-4 h-4 mr-2" /> Export PDF</Button>
                <Button variant="outline"><File className="w-4 h-4 mr-2" /> Export Excel</Button>
            </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
            <CardHeader>
                <CardTitle>Monthly Sales</CardTitle>
                <CardDescription>January - June 2024</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart accessibilityLayer data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                    dataKey="month"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
                    <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
                </BarChart>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="text-muted-foreground">
                Showing total sales for the last 6 months.
                </div>
            </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Top Selling Products</CardTitle>
                    <CardDescription>Your most popular items this month.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        <li className="flex justify-between"><span>Highland Single Malt</span> <strong>120 units</strong></li>
                        <li className="flex justify-between"><span>Artisanal IPA Pack</span> <strong>98 units</strong></li>
                        <li className="flex justify-between"><span>London Dry Gin</span> <strong>75 units</strong></li>
                        <li className="flex justify-between"><span>Caribbean Spiced Rum</span> <strong>62 units</strong></li>
                        <li className="flex justify-between"><span>Napa Valley Cabernet</span> <strong>51 units</strong></li>
                    </ul>
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Top Customers</CardTitle>
                    <CardDescription>Your most valuable business partners.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2 text-sm">
                        <li className="flex justify-between"><span>The Grand Hotel</span> <strong>$12,450</strong></li>
                        <li className="flex justify-between"><span>Williams Fine Dining</span> <strong>$9,820</strong></li>
                        <li className="flex justify-between"><span>City Bistro</span> <strong>$7,300</strong></li>
                        <li className="flex justify-between"><span>The Corner Pub</span> <strong>$5,150</strong></li>
                        <li className="flex justify-between"><span>Seaside Resorts</span> <strong>$4,800</strong></li>
                    </ul>
                </CardContent>
            </Card>

        </div>
    </div>
  )
}
