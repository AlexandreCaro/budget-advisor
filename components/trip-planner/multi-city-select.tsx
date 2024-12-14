import React from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";
import { City, getAvailableCities } from '@/lib/data/cities';
import { CityCombobox } from './city-combobox';

interface MultiCitySelectProps {
  countryCode: string;
  selectedCities: City[];
  onChange: (cities: City[]) => void;
  maxCities?: number;
}

export function MultiCitySelect({
  countryCode,
  selectedCities,
  onChange,
  maxCities = 5
}: MultiCitySelectProps) {
  const handleAddCity = () => {
    if (selectedCities.length >= maxCities) return;
  };

  const handleRemoveCity = (index: number) => {
    const newCities = [...selectedCities];
    newCities.splice(index, 1);
    onChange(newCities);
  };

  const handleCityChange = (city: City | null, index: number) => {
    if (!city) return;
    
    const newCities = [...selectedCities];
    newCities[index] = city;
    onChange(newCities);
  };

  return (
    <div className="space-y-4">
      {selectedCities.map((city, index) => (
        <div key={index} className="flex items-center gap-2">
          <CityCombobox
            countryCode={countryCode}
            value={city}
            onChange={(newCity) => handleCityChange(newCity, index)}
            excludeCities={selectedCities.map(c => c.code)}
          />
          
          {index > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRemoveCity(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      {selectedCities.length < maxCities && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddCity}
          className="w-full"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Add City
        </Button>
      )}
    </div>
  );
} 