import React from 'react';
import { Button } from "@/components/ui/button";
import { CityCombobox } from './city-combobox';
import { City } from '@/lib/data/cities';
import { Plus, X } from "lucide-react";
import { Label } from "@/components/ui/label";

interface MultiCitySelectorProps {
  countryCode: string;
  selectedCities: City[];
  onChange: (cities: City[]) => void;
  maxCities?: number;
  excludeCity?: string;
}

export function MultiCitySelector({
  countryCode,
  selectedCities,
  onChange,
  maxCities = 5,
  excludeCity
}: MultiCitySelectorProps) {
  const handleAddCity = () => {
    if (selectedCities.length >= maxCities) return;
    onChange([...selectedCities, {} as City]);
  };

  const handleRemoveCity = (index: number) => {
    const newCities = selectedCities.filter((_, i) => i !== index);
    onChange(newCities);
  };

  const handleCityChange = (city: City | null, index: number) => {
    if (!city) return;
    const newCities = [...selectedCities];
    newCities[index] = city;
    onChange(newCities.filter(Boolean));
  };

  return (
    <div className="space-y-2">
      {selectedCities.map((city, index) => (
        <div key={index} className="flex gap-2">
          <div className="flex-1">
            <CityCombobox
              countryCode={countryCode}
              value={city}
              onChange={(newCity) => handleCityChange(newCity, index)}
              excludeCities={[
                ...(excludeCity ? [excludeCity] : []),
                ...selectedCities
                  .filter((_, i) => i !== index)
                  .map(c => c.code)
                  .filter(Boolean)
              ]}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemoveCity(index)}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      {selectedCities.length < maxCities && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddCity}
          className="w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add City
        </Button>
      )}
    </div>
  );
} 