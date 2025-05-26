
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Search, FilterX, Filter } from "lucide-react"; // Added Filter icon

const kenyanLocations = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos", "Meru", "Nyeri", "Kakamega", "Naivasha", "Kitale"
] as const;

const amenitiesList = ["Parking", "Swimming Pool", "Gym", "Security", "Balcony", "Garden", "Internet Ready", "Servant Quarters", "Lift", "Water Included", "Beach Access", "Air Conditioning"] as const;

const formSchema = z.object({
  location: z.string().optional(),
  minPrice: z.coerce.number().positive("Min price must be positive").optional().or(z.literal("")),
  maxPrice: z.coerce.number().positive("Max price must be positive").optional().or(z.literal("")),
  minBedrooms: z.string().optional(),
  minBathrooms: z.string().optional(),
  amenities: z.array(z.string()).optional(),
}).refine(data => {
  if (data.minPrice && data.maxPrice && Number(data.minPrice) > Number(data.maxPrice)) {
    return false;
  }
  return true;
}, {
  message: "Max price cannot be less than min price",
  path: ["maxPrice"],
});

interface PropertySearchFormProps {
  onFormSubmit?: () => void; // Callback to close sheet on mobile
  isInSheet?: boolean; // To adjust styling or behavior if inside a sheet
}

export function PropertySearchForm({ onFormSubmit, isInSheet }: PropertySearchFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: searchParams.get('location') || "",
      minPrice: searchParams.get('minPrice') || "",
      maxPrice: searchParams.get('maxPrice') || "",
      minBedrooms: searchParams.get('minBedrooms') || "all",
      minBathrooms: searchParams.get('minBathrooms') || "all",
      amenities: searchParams.getAll('amenities') || [],
    },
  });

  // Effect to reset form when searchParams change (e.g., URL is updated directly or filters cleared)
  useEffect(() => {
    form.reset({
      location: searchParams.get('location') || "",
      minPrice: searchParams.get('minPrice') || "",
      maxPrice: searchParams.get('maxPrice') || "",
      minBedrooms: searchParams.get('minBedrooms') || "all",
      minBathrooms: searchParams.get('minBathrooms') || "all",
      amenities: searchParams.getAll('amenities') || [],
    });
  }, [searchParams, form]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const params = new URLSearchParams();
    if (values.location) params.set('location', values.location);
    if (values.minPrice) params.set('minPrice', String(values.minPrice));
    if (values.maxPrice) params.set('maxPrice', String(values.maxPrice));
    if (values.minBedrooms && values.minBedrooms !== "all") params.set('minBedrooms', values.minBedrooms);
    if (values.minBathrooms && values.minBathrooms !== "all") params.set('minBathrooms', values.minBathrooms);
    if (values.amenities && values.amenities.length > 0) {
      values.amenities.forEach(amenity => params.append('amenities', amenity));
    }
    router.push(`/properties?${params.toString()}`);
    if (onFormSubmit) {
      onFormSubmit(); // Call the callback if provided (e.g., to close mobile sheet)
    }
  }

  function clearFilters() {
    form.reset({
      location: "",
      minPrice: "",
      maxPrice: "",
      minBedrooms: "all",
      minBathrooms: "all",
      amenities: [],
    });
    router.push('/properties'); // Navigate to properties page with no filters
     if (onFormSubmit) {
      onFormSubmit(); // Call the callback if provided
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        suppressHydrationWarning // For potential browser extension interference
      >
        {/* Location Field */}
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Nairobi, Kilimani"
                  {...field}
                  value={field.value ?? ""}
                  list="kenyan-locations-filter"
                  suppressHydrationWarning
                />
              </FormControl>
              <datalist id="kenyan-locations-filter">
                {kenyanLocations.map(loc => <option key={loc} value={loc} />)}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Price Range Fields */}
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="minPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Price (KES)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 30000" {...field} value={field.value ?? ""} suppressHydrationWarning />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="maxPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Price (KES)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 100000" {...field} value={field.value ?? ""} suppressHydrationWarning />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Bedrooms and Bathrooms Selects */}
        <div className="grid grid-cols-1 gap-4">
          <FormField
            control={form.control}
            name="minBedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Bedrooms</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "all"}>
                  <FormControl>
                    <SelectTrigger suppressHydrationWarning>
                      <SelectValue placeholder="Any Bedrooms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">Any Bedrooms</SelectItem>
                    <SelectItem value="0">Studio (0)</SelectItem>
                    <SelectItem value="1">1+ Bedroom</SelectItem>
                    <SelectItem value="2">2+ Bedrooms</SelectItem>
                    <SelectItem value="3">3+ Bedrooms</SelectItem>
                    <SelectItem value="4">4+ Bedrooms</SelectItem>
                    <SelectItem value="5">5+ Bedrooms</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="minBathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Bathrooms</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "all"}>
                  <FormControl>
                    <SelectTrigger suppressHydrationWarning>
                      <SelectValue placeholder="Any Bathrooms" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">Any Bathrooms</SelectItem>
                    <SelectItem value="1">1+ Bathroom</SelectItem>
                    <SelectItem value="2">2+ Bathrooms</SelectItem>
                    <SelectItem value="3">3+ Bathrooms</SelectItem>
                    <SelectItem value="4">4+ Bathrooms</SelectItem>
                    <SelectItem value="5">5+ Bathrooms</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Amenities Accordion */}
        <Accordion type="single" collapsible className="w-full" defaultValue="amenities">
          <AccordionItem value="amenities">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center text-foreground">
                {/* You can add an icon here if desired, e.g., <ListChecks className="mr-2 h-4 w-4" /> */}
                Amenities
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-1 max-h-60 overflow-y-auto">
                {amenitiesList.map((item) => (
                  <FormField
                    key={item}
                    control={form.control}
                    name="amenities"
                    render={({ field }) => {
                      const isChecked = field.value?.includes(item);
                      const checkboxId = `amenity-${item.replace(/\s+/g, '-').toLowerCase()}`;
                      return (
                        <FormItem
                          className="flex flex-row items-center space-x-3 space-y-0 py-1"
                        >
                          <FormControl>
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                const newValue = checked
                                  ? [...(field.value || []), item]
                                  : field.value?.filter(
                                      (value) => value !== item
                                    );
                                field.onChange(newValue);
                              }}
                              id={checkboxId}
                            />
                          </FormControl>
                          <FormLabel
                            htmlFor={checkboxId}
                            className="font-normal text-sm cursor-pointer flex-grow hover:text-primary"
                          >
                            {item}
                          </FormLabel>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-4">
          <Button type="submit" className="w-full truncate">
            <Search className="mr-2 h-4 w-4" /> Apply Filters
          </Button>
           <Button type="button" variant="outline" onClick={clearFilters} className="w-full truncate">
            <FilterX className="mr-2 h-4 w-4" /> Clear All Filters
          </Button>
        </div>
      </form>
    </Form>
  );
}
