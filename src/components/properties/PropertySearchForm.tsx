"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';

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
import { Search } from "lucide-react";

// Define Kenyan locations - expand this list as needed
const kenyanLocations = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos", "Meru", "Nyeri", "Kakamega", "Naivasha", "Kitale"
] as const;

const formSchema = z.object({
  location: z.string().min(2, {
    message: "Location must be at least 2 characters.",
  }),
  // Add price range later if needed
  // minPrice: z.number().optional(),
  // maxPrice: z.number().optional(),
});

export function PropertySearchForm() {
  const router = useRouter();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      location: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Construct search query parameters
    const params = new URLSearchParams();
    params.set('location', values.location);
    // if (values.minPrice) params.set('minPrice', values.minPrice.toString());
    // if (values.maxPrice) params.set('maxPrice', values.maxPrice.toString());

    // Redirect to properties page with search parameters
    router.push(`/properties?${params.toString()}`);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4">
        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem className="flex-grow">
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Nairobi, Mombasa, Kilimani" {...field} list="kenyan-locations" />
              </FormControl>
              <datalist id="kenyan-locations">
                {kenyanLocations.map(loc => <option key={loc} value={loc} />)}
              </datalist>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Add Price Filters Later */}
        {/* <FormField ... for minPrice /> */}
        {/* <FormField ... for maxPrice /> */}
        <Button type="submit" className="w-full md:w-auto">
          <Search className="mr-2 h-4 w-4" /> Search
        </Button>
      </form>
    </Form>
  );
}
