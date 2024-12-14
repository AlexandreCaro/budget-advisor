"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_EXPENSE_CATEGORIES } from '@/lib/cost-estimation/perplexity';
import { countries } from '@/lib/countries';
import { format } from 'date-fns';

export function HistoricalEstimatesView() {
  const [filters, setFilters] = useState({
    category: '',
    country: '',
    tier: '',
    days: '30'
  });

  const [estimates, setEstimates] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  const loadEstimates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams(
        Object.entries(filters).filter(([_, v]) => v)
      );
      const response = await fetch(`/api/estimates/history?${params}`);
      const data = await response.json();
      setEstimates(data.estimates);
      setStatistics(data.statistics);
    } catch (error) {
      console.error('Error loading estimates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEstimates();
  }, [filters]);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Historical Estimates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.key} value={cat.key}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.country}
                onValueChange={(value) => setFilters(prev => ({ ...prev, country: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Countries</SelectItem>
                  {countries.map(country => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select
                value={filters.tier}
                onValueChange={(value) => setFilters(prev => ({ ...prev, tier: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Tiers</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Input
                type="number"
                placeholder="Days"
                value={filters.days}
                onChange={(e) => setFilters(prev => ({ ...prev, days: e.target.value }))}
              />
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Object.entries(statistics).map(([category, stats]: [string, any]) => (
              <Card key={category}>
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2 capitalize">{category}</h3>
                  <div className="space-y-1 text-sm">
                    <p>Count: {stats.count}</p>
                    <p>Average Cost: {formatCurrency(stats.avgCost, 'USD')}</p>
                    <p>Range: {formatCurrency(stats.minCost, 'USD')} - {formatCurrency(stats.maxCost, 'USD')}</p>
                    <p>Confidence: {(stats.avgConfidence * 100).toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Estimates Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Average Cost</TableHead>
                <TableHead>Range</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {estimates.map((estimate) => (
                <TableRow key={estimate.id}>
                  <TableCell className="capitalize">{estimate.category}</TableCell>
                  <TableCell>{estimate.country}</TableCell>
                  <TableCell className="capitalize">{estimate.tier}</TableCell>
                  <TableCell>{formatCurrency(estimate.avgCost, estimate.currency)}</TableCell>
                  <TableCell>
                    {formatCurrency(estimate.minCost, estimate.currency)} - {formatCurrency(estimate.maxCost, estimate.currency)}
                  </TableCell>
                  <TableCell>{(estimate.confidence * 100).toFixed(1)}%</TableCell>
                  <TableCell>{format(new Date(estimate.createdAt), 'PPP')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
} 