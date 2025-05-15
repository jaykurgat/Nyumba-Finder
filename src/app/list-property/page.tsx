
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Image from 'next/image';

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
// Removed Property type import, as it's not directly used here for DB interaction yet

const kenyanLocations = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos", "Meru", "Nyeri", "Kakamega", "Naivasha", "Kitale"
] as const;

const amenitiesList = ["Parking", "Swimming Pool", "Gym", "Security", "Balcony", "Garden", "Internet Ready", "Servant Quarters", "Lift", "Water Included", "Beach Access", "Air Conditioning"] as const;


const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title cannot exceed 100 characters."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description cannot exceed 1000 characters."),
  location: z.string().min(2, "Please specify a location."),
  price: z.coerce.number().positive("Price must be a positive number."),
  bedrooms: z.coerce.number().int().min(0, "Number of bedrooms cannot be negative."),
  bathrooms: z.coerce.number().int().min(1, "Must have at least 1 bathroom."),
  area: z.coerce.number().positive("Area must be a positive number.").optional(),
  amenities: z.array(z.string()).optional(),
  images: z.array(z.string()).optional().default([]), // Expecting array of data URIs
});

export default function ListPropertyPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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
      images: [],
    },
  });

  const watchedImages = form.watch('images');

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      const imagePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });
      try {
        const dataUris = await Promise.all(imagePromises);
        // Append new images to existing ones, or set if empty
        const currentImages = form.getValues('images') || [];
        form.setValue('images', [...currentImages, ...dataUris], { shouldValidate: true, shouldDirty: true });
      } catch (error) {
        console.error("Error reading files:", error);
        toast({
            title: "Image Read Error",
            description: "Could not read the selected image(s). Please try again.",
            variant: "destructive",
         });
      } finally {
        setIsUploading(false);
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    console.log("Submitting property details to API:", values);

    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      console.log("API Response:", result);

      toast({
        title: "Property Listed!",
        description: result.message || "Your property has been successfully submitted.",
        variant: "default",
      });
      router.push('/properties'); // Redirect to properties page to see the (hopefully) updated list

    } catch (error) {
        console.error("Failed to list property via API:", error);
         toast({
            title: "Listing Failed",
            description: error instanceof Error ? error.message : "Could not list your property. Please try again.",
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
                              <Input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange} // Use the updated handler
                                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium file:text-foreground hover:file:bg-accent hover:file:text-accent-foreground disabled:opacity-50"
                                disabled={isUploading}
                              />
                            </FormControl>
                             <FormDescription>
                              Upload high-quality images of the property. Click again to add more.
                            </FormDescription>
                            <FormMessage />
                             {isUploading && (
                                <div className="flex items-center text-sm text-muted-foreground">
                                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Processing images...
                                </div>
                            )}
                          </FormItem>
                        )}
                      />
                    
                    {watchedImages && watchedImages.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Image Previews ({watchedImages.length} selected):</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {watchedImages.map((uri, index) => (
                            <div key={index} className="relative aspect-video rounded-md overflow-hidden border shadow-sm">
                              <Image src={uri} alt={`Preview ${index + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" />
                            </div>
                          ))}
                        </div>
                        {watchedImages.length > 0 && (
                             <Button variant="outline" size="sm" type="button" onClick={() => form.setValue('images', [], { shouldValidate: true, shouldDirty: true })}>Clear Images</Button>
                        )}
                      </div>
                    )}


                  <Button type="submit" className="w-full" disabled={isLoading || isUploading}>
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
