"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity';
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { ExternalLink, Star, Calendar } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';

interface CategoryReference {
  id: string;
  name: string;
  price: number;
  description: string;
  url?: string;
  tier: string;
  status: string;
  createdAt: Date;
  tripName: string;
  tripId: string;
  currency: string;
}

interface CategoryTrip {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  currency: string;
  budgetValue: number;
  selectedTier: string;
}

export function CategoriesView() {
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_EXPENSE_CATEGORIES[0].key);
  const [references, setReferences] = useState<CategoryReference[]>([]);
  const [trips, setTrips] = useState<CategoryTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadCategoryData = async () => {
      setIsLoading(true);
      try {
        // Fetch saved references for the category
        const refsResponse = await fetch(`/api/references/favorites?category=${selectedCategory}`);
        const refsData = await refsResponse.json();

        // Fetch trips that include this category
        const tripsResponse = await fetch(`/api/trip-plans?category=${selectedCategory}`);
        const tripsData = await tripsResponse.json();

        setReferences(refsData);
        setTrips(tripsData);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load category data",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadCategoryData();
  }, [selectedCategory]);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Categories Overview</h1>
      
      <div className="grid grid-cols-12 gap-6">
        {/* Categories Sidebar */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-2">
                {DEFAULT_EXPENSE_CATEGORIES.map((category) => (
                  <Button
                    key={category.key}
                    variant={selectedCategory === category.key ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category.key)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="col-span-9">
          <Card>
            <CardHeader>
              <CardTitle>
                {DEFAULT_EXPENSE_CATEGORIES.find(c => c.key === selectedCategory)?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="saved">
                <TabsList>
                  <TabsTrigger value="saved">Saved References</TabsTrigger>
                  <TabsTrigger value="trips">Related Trips</TabsTrigger>
                </TabsList>

                <TabsContent value="saved" className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : references.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {references.map((ref) => (
                        <Card key={ref.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium">{ref.name}</h3>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {formatCurrency(ref.price, ref.currency)}
                                </span>
                                <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                                  {ref.tier}
                                </span>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {ref.description}
                            </p>
                            <div className="flex justify-between items-center">
                              <div className="text-xs text-muted-foreground">
                                From trip: {ref.tripName}
                              </div>
                              {ref.url && (
                                <Button variant="ghost" size="sm" asChild>
                                  <a href={ref.url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No saved references for this category
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="trips" className="space-y-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                  ) : trips.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {trips.map((trip) => (
                        <Card key={trip.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium">{trip.name}</h3>
                              <span className="text-sm text-muted-foreground">
                                {formatCurrency(trip.budgetValue, trip.currency)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                              <Calendar className="h-4 w-4" />
                              <span>
                                {format(new Date(trip.startDate), 'MMM d')} - {format(new Date(trip.endDate), 'MMM d, yyyy')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full capitalize">
                                {trip.selectedTier}
                              </span>
                              <Button variant="ghost" size="sm" asChild>
                                <a href={`/trip-planner/${trip.id}`}>
                                  View Trip
                                </a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      No trips found for this category
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 