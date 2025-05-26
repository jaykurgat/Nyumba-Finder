
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import NextImage from 'next/image';

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
import { Loader2, Trash2, Home } from "lucide-react"; // Added Home icon
import type { Property } from "@/types/property";

const kenyanLocations = [
  "Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika", "Kiambu", "Machakos", "Meru", "Nyeri", "Kakamega", "Naivasha", "Kitale"
] as const;

const amenitiesList = ["Parking", "Swimming Pool", "Gym", "Security", "Balcony", "Garden", "Internet Ready", "Servant Quarters", "Lift", "Water Included", "Beach Access", "Air Conditioning"] as const;

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title cannot exceed 100 characters."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description cannot exceed 1000 characters."),
  location: z.string().min(2, "Please specify a location."),
  price: z.coerce.number().positive("Price must be a positive number."),
  bedrooms: z.coerce.number().int().min(0, "Number of bedrooms cannot be negative."),
  bathrooms: z.coerce.number().int().min(1, "Must have at least 1 bathroom."),
  area: z.preprocess(
    (val) => (String(val).trim() === "" || val === undefined || val === null ? undefined : Number(val)),
    z.number().positive("Area must be a positive number if provided.").optional()
  ),
  phoneNumber: z.string()
    .refine(val => val === "" || val === undefined || val === null || phoneRegex.test(val), { message: "Invalid phone number format." })
    .optional()
    .or(z.literal('')),
  amenities: z.array(z.string()).optional().default([]),
  images: z.array(z.string()).optional().default([]), // For client-side preview only
});

type FormSchemaType = z.infer<typeof formSchema>;

export default function ListPropertyPage() {
  const router = useRouter();
  const searchParamsHook = useSearchParams();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [propertyIdToEdit, setPropertyIdToEdit] = useState<string | null>(null);
  const [pageTitle, setPageTitle] = useState("List Your Property");

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      price: "" as unknown as number, // Keep as empty string for controlled input
      bedrooms: "" as unknown as number,
      bathrooms: "" as unknown as number,
      area: "" as unknown as number,
      phoneNumber: "",
      amenities: [],
      images: [],
    },
  });

  const watchedImages = form.watch('images');

  useEffect(() => {
    const editId = searchParamsHook.get('edit');
    if (editId) {
      setIsEditMode(true);
      setPropertyIdToEdit(editId);
      setPageTitle("Edit Property");
      setIsLoading(true);
      const fetchPropertyData = async () => {
        try {
          const response = await fetch(`/api/properties/${editId}`);
          if (!response.ok) {
            throw new Error("Failed to fetch property data for editing.");
          }
          const data: Property = await response.json();
          form.reset({
            ...data,
            price: data.price || ("" as unknown as number),
            bedrooms: data.bedrooms === undefined || data.bedrooms === null ? ("" as unknown as number) : data.bedrooms,
            bathrooms: data.bathrooms || ("" as unknown as number),
            area: data.area === undefined || data.area === null ? ("" as unknown as number) : data.area,
            phoneNumber: data.phoneNumber || "",
            images: [], // Images are not fetched from DB, user would re-upload if changing
          });
        } catch (error) {
          console.error("Error fetching property to edit:", error);
          toast({
            title: "Error Loading Property",
            description: "Could not load property data for editing. Please try again.",
            variant: "destructive",
          });
          router.push('/list-property'); // Or perhaps back to the properties page
        } finally {
          setIsLoading(false);
        }
      };
      fetchPropertyData();
    } else {
        setIsEditMode(false);
        setPropertyIdToEdit(null);
        setPageTitle("List Your Property");
        form.reset({ // Reset to default empty values if not in edit mode
             title: "",
             description: "",
             location: "",
             price: "" as unknown as number,
             bedrooms: "" as unknown as number,
             bathrooms: "" as unknown as number,
             area: "" as unknown as number,
             phoneNumber: "",
             amenities: [],
             images: [],
        });
    }
  }, [searchParamsHook, form, router, toast]);


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
        const currentImages = form.getValues('images') || [];
        form.setValue('images', [...currentImages, ...dataUris].slice(0, 5), { shouldValidate: true, shouldDirty: true });
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

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);

    const submissionValues = {
      ...values,
      price: Number(values.price),
      bedrooms: Number(values.bedrooms),
      bathrooms: Number(values.bathrooms),
      area: values.area ? Number(values.area) : undefined,
      phoneNumber: values.phoneNumber || "", // Ensure phoneNumber is an empty string if undefined/null
      images: [], // IMPORTANT: Do not send image data URIs to backend to avoid Firestore size limits
    };

    try {
      const apiUrl = isEditMode && propertyIdToEdit
        ? `/api/properties/${propertyIdToEdit}`
        : '/api/properties';
      const method = isEditMode && propertyIdToEdit ? 'PUT' : 'POST';

      const response = await fetch(apiUrl, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionValues),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred with the server." }));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const result = await response.json();

      toast({
        title: isEditMode ? "Property Updated!" : "Property Listed!",
        description: result.message || `Your property has been successfully ${isEditMode ? 'updated' : 'submitted'}.`,
        variant: "default",
      });

      router.push(isEditMode && propertyIdToEdit ? `/properties/${propertyIdToEdit}` : `/properties/${result.propertyId || ''}`);
      router.refresh(); // Ensure the property list is refreshed

    } catch (error) {
        console.error(`Failed to ${isEditMode ? 'update' : 'list'} property via API:`, error);
         toast({
            title: isEditMode ? "Update Failed" : "Listing Failed",
            description: error instanceof Error ? error.message : `Could not ${isEditMode ? 'update' : 'list'} your property. Please try again.`,
            variant: "destructive",
         });
    } finally {
        setIsLoading(false);
    }
  }

  // Show loading state specifically when fetching data for edit mode before form is dirty or submitted
  if (isEditMode && isLoading && !form.formState.isDirty && !form.formState.isSubmitted) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl flex flex-col justify-center items-center min-h-[50vh]">
        <Home className="h-16 w-16 text-primary animate-pulse-slow" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Card>
          <CardHeader>
             <CardTitle className="text-3xl font-bold text-center">{pageTitle}</CardTitle>
          </CardHeader>
          <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" suppressHydrationWarning>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Title</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Modern 3 Bedroom Apartment in Kileleshwa" {...field} suppressHydrationWarning />
                        </FormControl>
                        <FormDescription>A catchy title for your listing.</FormDescription>
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
                            suppressHydrationWarning
                          />
                        </FormControl>
                         <FormDescription>Highlight key features and selling points.</FormDescription>
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
                           <Input placeholder="e.g., Kilimani, Nairobi" {...field} list="list-kenyan-locations" suppressHydrationWarning />
                        </FormControl>
                         <datalist id="list-kenyan-locations">
                            {kenyanLocations.map(loc => <option key={loc} value={loc} />)}
                         </datalist>
                         <FormDescription>Specify the neighborhood and city.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number <span className="text-muted-foreground">(Optional)</span></FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="e.g., 0712345678 or +254712345678" {...field} value={field.value ?? ""} suppressHydrationWarning />
                        </FormControl>
                        <FormDescription>Contact phone number for interested parties.</FormDescription>
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
                              <Input type="number" placeholder="e.g., 50000" {...field} value={field.value ?? ""} suppressHydrationWarning />
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
                              <Input type="number" placeholder="e.g., 2 (0 for Studio)" {...field} min="0" value={field.value ?? ""} suppressHydrationWarning/>
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
                              <Input type="number" placeholder="e.g., 1" {...field} min="1" value={field.value ?? ""} suppressHydrationWarning/>
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
                           <Input type="number" placeholder="e.g., 100" {...field} value={field.value ?? ""} suppressHydrationWarning />
                        </FormControl>
                        <FormDescription>Enter the size of the property.</FormDescription>
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
                            <FormDescription>Select all available amenities.</FormDescription>
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
                                        suppressHydrationWarning
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
                        render={() => (
                          <FormItem>
                            <FormLabel>Property Images (Previews Only)</FormLabel>
                            <FormControl>
                              <Input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-input file:bg-background file:text-sm file:font-medium file:text-foreground hover:file:bg-accent hover:file:text-accent-foreground disabled:opacity-50"
                                disabled={isUploading || (watchedImages && watchedImages.length >= 5)}
                                suppressHydrationWarning
                              />
                            </FormControl>
                             <FormDescription>
                              Upload up to 5 images. Images are for preview and NOT saved to the database.
                              {watchedImages && watchedImages.length >= 5 && " Maximum images reached."}
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
                        <div className="flex justify-between items-center">
                          <p className="text-sm font-medium">Image Previews ({watchedImages.length} selected):</p>
                          <Button variant="outline" size="sm" type="button" onClick={() => form.setValue('images', [], { shouldValidate: true, shouldDirty: true })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Clear All Images
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {watchedImages.map((uri, index) => (
                            <div key={index} className="relative aspect-video rounded-md overflow-hidden border shadow-sm">
                              <NextImage src={uri} alt={`Preview ${index + 1}`} fill className="object-cover" sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}


                  <Button type="submit" className="w-full" disabled={isLoading || isUploading}>
                    {isLoading ? (
                        <>
                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                         {isEditMode ? 'Updating Property...' : 'Listing Property...'}
                        </>
                    ) : (
                       isEditMode ? 'Update Property' : 'List Property'
                    )}
                  </Button>
                </form>
              </Form>
          </CardContent>
      </Card>
    </div>
  );
}
