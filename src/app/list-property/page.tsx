"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Expand Kenyan locations or use a different input method later
const kenyanLocations = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos", "Meru", "Nyeri", "Kakamega", "Naivasha", "Kitale"
] as const;

const amenitiesList = ["Parking", "Swimming Pool", "Gym", "Security", "Balcony", "Garden", "Internet Ready", "Servant Quarters", "Lift", "Water Included", "Beach Access", "Air Conditioning"] as const;


const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title cannot exceed 100 characters."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description cannot exceed 1000 characters."),
  location: z.string().min(2, "Please specify a location."),
  price: z.coerce.number().positive("Price must be a positive number."), // coerce converts string input to number
  bedrooms: z.coerce.number().int().min(0, "Number of bedrooms cannot be negative."),
  bathrooms: z.coerce.number().int().min(1, "Must have at least 1 bathroom."),
  area: z.coerce.number().positive("Area must be a positive number.").optional(),
  amenities: z.array(z.string()).optional(),
  images: z.any().optional(), // Handle file uploads later
});

export default function ListPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      price: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      area: undefined,
      amenities: [],
      images: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    console.log("Submitting property details:", values);

    // Simulate API call to save property data
    try {
       // Replace with actual API endpoint call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Handle image uploads separately here in a real scenario

      toast({
        title: "Property Listed!",
        description: "Your property has been successfully listed.",
        variant: "default", // Use Shadcn success style if available, else default
      });
      router.push('/properties'); // Redirect to properties or a 'my listings' page

    } catch (error) {
        console.error("Failed to list property:", error);
         toast({
            title: "Listing Failed",
            description: "Could not list your property. Please try again.",
            variant: "destructive",
         });
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
          <CardHeader>
             <CardTitle className="text-3xl font-bold text-center">List Your Property</CardTitle>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Modern 3 Bedroom Apartment in Kileleshwa" {...field} />
                        </FormControl>
                        <FormDescription>
                          A catchy title for your listing.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe the property in detail..."
                            className="resize-y min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                         <FormDescription>
                           Highlight key features and selling points.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                           <Input placeholder="e.g., Kilimani, Nairobi" {...field} list="list-kenyan-locations" />
                        </FormControl>
                         <datalist id="list-kenyan-locations">
                            {kenyanLocations.map(loc => <option key={loc} value={loc} />)}
                         </datalist>
                         <FormDescription>
                            Specify the neighborhood and city.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Rent (KES)</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 50000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="bedrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bedrooms</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 2 (0 for Studio)" {...field} min="0" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                       <FormField
                        control={form.control}
                        name="bathrooms"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bathrooms</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 1" {...field} min="1"/>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>

                  <FormField
                        control={form.control}
                        name="area"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Area (Square Meters) <span className="text-muted-foreground">(Optional)</span></FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="e.g., 100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                   <FormField
                      control={form.control}
                      name="amenities"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Amenities</FormLabel>
                            <FormDescription>
                              Select all available amenities.
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {amenitiesList.map((item) => (
                            <FormField
                              key={item}
                              control={form.control}
                              name="amenities"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), item])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">
                                      {item}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                        control={form.control}
                        name="images"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Property Images</FormLabel>
                            <FormControl>
                              <Input type="file" multiple accept="image/*"
                                // onChange={(e) => field.onChange(e.target.files)} // Basic handling, needs refinement
                                disabled // Disable until upload logic is implemented
                              />
                            </FormControl>
                             <FormDescription>
                              Upload high-quality images of the property (Implementation Pending).
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         Listing Property...
                        </>
                    ) : (
                       'List Property'
                    )}

                  </Button>
                </form>
              </Form>
          </CardContent>
      </Card>
    </div>
  );
}
