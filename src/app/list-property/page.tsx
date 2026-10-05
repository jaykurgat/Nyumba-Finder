
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import { PropertyImage } from "@/components/properties/PropertyImage";
import { InteractiveLocationMap } from "@/components/properties/InteractiveLocationMap";

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
import { Loader2, Trash2, Home, MapPin, Navigation, Search, X } from "lucide-react";
import type { Property } from "@/types/property";

const amenitiesList = ["Parking", "Swimming Pool", "Gym", "Security", "Balcony", "Garden", "Internet Ready", "Servant Quarters", "Lift", "Water Included", "Beach Access", "Air Conditioning"] as const;

const phoneRegex = new RegExp(
  /^([+]?[\s0-9]+)?(\d{3}|[(]?[0-9]+[)])?([-]?[\s]?[0-9])+$/
);

const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title cannot exceed 100 characters."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description cannot exceed 1000 characters."),
  countyId: z.string().min(1, "Please select a county."),
  location: z.string().min(2, "Please specify a location."),
  locationNodeId: z.string().min(1, "Please select a Town / City."),
  propertyType: z.string().min(2, "Please select a property type."),
  listingType: z.enum(["FOR_RENT", "FOR_SALE", "SHORT_STAY"]),
  price: z.coerce.number().positive("Price must be a positive number."),
  shortStayMinNights: z.coerce.number().int().positive().optional().or(z.literal("")),
  shortStayMaxNights: z.coerce.number().int().positive().optional().or(z.literal("")),
  cleaningFee: z.preprocess((val) => (val === undefined || val === null || String(val).trim() === "" ? undefined : Number(val)), z.number().nonnegative().optional()),
  securityDeposit: z.preprocess((val) => (String(val).trim() === "" ? undefined : Number(val)), z.number().nonnegative().optional()),
  maxGuests: z.coerce.number().int().positive().optional().or(z.literal("")),
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
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [counties, setCounties] = useState<any[]>([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState<string | null>(null);
  const [selectedTownId, setSelectedTownId] = useState("");
  const [towns, setTowns] = useState<any[]>([]);
  const [townsLoading, setTownsLoading] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [areasLoading, setAreasLoading] = useState(false);
  const [mapPosition, setMapPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] = useState<"USER_SELECTED" | "BROWSER_GEOLOCATION">("USER_SELECTED");

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      countyId: "",
      location: "",
      locationNodeId: "",
      propertyType: "Apartment",
      listingType: "FOR_RENT",
      shortStayMinNights: "",
      shortStayMaxNights: "",
      maxGuests: "",
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
  const watchedLocation = form.watch('location');
  const watchedCountyId = form.watch('countyId');
  const watchedListingType = form.watch('listingType');

  useEffect(() => {
    let cancelled = false;

    async function loadCounties() {
      setCountiesLoading(true);
      setCountiesError(null);

      try {
        const response = await fetch('/api/counties', { cache: 'no-store' });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'County request failed (' + response.status + ')');
        }

        if (!Array.isArray(data.counties)) {
          throw new Error('County API returned an invalid response.');
        }

        if (!cancelled) setCounties(data.counties);
      } catch (error) {
        console.error('Failed to load counties:', error);
        if (!cancelled) {
          setCounties([]);
          setCountiesError(error instanceof Error ? error.message : 'Could not load counties.');
        }
      } finally {
        if (!cancelled) setCountiesLoading(false);
      }
    }

    loadCounties();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!watchedCountyId) {
      setTowns([]);
      setAreas([]);
      setSelectedTownId("");
      form.setValue('location', '', { shouldValidate: true, shouldDirty: true });
      form.setValue('locationNodeId', '', { shouldValidate: true, shouldDirty: true });
      return;
    }

    let cancelled = false;
    setTownsLoading(true);

    fetch('/api/locations?' + new URLSearchParams({
      countyId: watchedCountyId,
      level: 'TOWN',
    }).toString(), { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to load towns and cities.');
        return data;
      })
      .then((data) => {
        if (!cancelled) setTowns(Array.isArray(data.locations) ? data.locations : []);
      })
      .catch((error) => {
        console.error('Failed to load towns and cities:', error);
        if (!cancelled) setTowns([]);
      })
      .finally(() => {
        if (!cancelled) setTownsLoading(false);
      });

    return () => { cancelled = true; };
  }, [watchedCountyId, form]);

  useEffect(() => {
    if (!selectedTownId) {
      setAreas([]);
      return;
    }
    let cancelled = false;
    setAreasLoading(true);
    fetch('/api/locations?' + new URLSearchParams({ parentId: selectedTownId, level: 'AREA' }).toString(), { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to load area suggestions.');
        return data;
      })
      .then((data) => {
        if (!cancelled) setAreas(Array.isArray(data.locations) ? data.locations : []);
      })
      .catch((error) => {
        console.error('Failed to load area suggestions:', error);
        if (!cancelled) setAreas([]);
      })
      .finally(() => { if (!cancelled) setAreasLoading(false); });
    return () => { cancelled = true; };
  }, [selectedTownId]);

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
            countyId: data.countyId || "",
            price: data.price || ("" as unknown as number),
            bedrooms: data.bedrooms === undefined || data.bedrooms === null ? ("" as unknown as number) : data.bedrooms,
            bathrooms: data.bathrooms || ("" as unknown as number),
            area: data.area === undefined || data.area === null ? ("" as unknown as number) : data.area,
            phoneNumber: data.phoneNumber || "",
            images: data.images || [],
            locationNodeId: data.locationNodeId || "",
          });
          setSelectedTownId(data.locationNodeId || "");
          setMapPosition(data.latitude != null && data.longitude != null ? { lat: data.latitude, lng: data.longitude } : null);
          setLocationSource("USER_SELECTED");
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
             countyId: "",
             location: "",
             locationNodeId: "",
             propertyType: "Apartment",
             listingType: "FOR_RENT",
             shortStayMinNights: "",
             shortStayMaxNights: "",
             cleaningFee: "",
             securityDeposit: "",
             maxGuests: "",
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


  const compressImage = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const image = new Image();
        image.onload = () => {
          const maxDimension = 1400;
          const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) {
            reject(new Error('Could not process image.'));
            return;
          }
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.72));
        };
        image.onerror = () => reject(new Error('Could not load image.'));
        image.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('Could not read image.'));
      reader.readAsDataURL(file);
    });

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setIsUploading(true);
      try {
        const currentImages = form.getValues('images') || [];
        const dataUris = await Promise.all(Array.from(files).map(compressImage));
        form.setValue('images', [...currentImages, ...dataUris].slice(0, 5), { shouldValidate: true, shouldDirty: true });
      } catch (error) {
        console.error("Error processing files:", error);
        toast({
          title: "Image Processing Error",
          description: "Could not process the selected image(s). Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
        event.target.value = '';
      }
    }
  };

  async function onSubmit(values: FormSchemaType) {
    setIsLoading(true);

    try {
      const apiUrl = isEditMode && propertyIdToEdit
        ? `/api/properties/${propertyIdToEdit}`
        : '/api/properties';

      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('countyId', values.countyId);
      formData.append('location', values.location);
      formData.append('locationNodeId', values.locationNodeId);
      if (mapPosition) {
        formData.append('latitude', String(mapPosition.lat));
        formData.append('longitude', String(mapPosition.lng));
      }
      formData.append('locationSource', locationSource);
      formData.append('propertyType', values.propertyType);
      formData.append('listingType', values.listingType);
      formData.append('pricePeriod', values.listingType === 'FOR_SALE' ? 'ONE_TIME' : values.listingType === 'SHORT_STAY' ? 'NIGHT' : 'MONTH');
      formData.append('price', String(Number(values.price)));
      formData.append('bedrooms', String(Number(values.bedrooms)));
      formData.append('bathrooms', String(Number(values.bathrooms)));
      if (values.shortStayMinNights !== '' && values.shortStayMinNights !== undefined) formData.append('shortStayMinNights', String(Number(values.shortStayMinNights)));
      if (values.shortStayMaxNights !== '' && values.shortStayMaxNights !== undefined) formData.append('shortStayMaxNights', String(Number(values.shortStayMaxNights)));
      if (values.cleaningFee !== undefined && String(values.cleaningFee) !== '') formData.append('cleaningFee', String(Number(values.cleaningFee)));
      if (values.securityDeposit !== undefined && String(values.securityDeposit) !== '') formData.append('securityDeposit', String(Number(values.securityDeposit)));
      if (values.maxGuests !== '' && values.maxGuests !== undefined) formData.append('maxGuests', String(Number(values.maxGuests)));
      if (values.area !== undefined && values.area !== null && String(values.area) !== '') formData.append('area', String(Number(values.area)));
      formData.append('phoneNumber', values.phoneNumber || '');
      formData.append('amenities', JSON.stringify(values.amenities || []));

      const existingImages: string[] = [];
      for (const image of values.images || []) {
        if (image.startsWith('data:')) {
          const [meta, base64] = image.split(',');
          const mimeType = meta.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
          const binary = atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          formData.append('images', new File([bytes], `property-image-${Date.now()}-${existingImages.length}.jpg`, { type: mimeType }));
        } else if (image) {
          existingImages.push(image);
        }
      }

      if (isEditMode) {
        formData.append('existingImages', JSON.stringify(existingImages));
      }

      const response = await fetch(apiUrl, {
        method: isEditMode ? 'PUT' : 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred with the server." }));
        throw new Error(errorData.message || `Server responded with ${response.status}`);
      }

      const result = await response.json();
      toast({
        title: isEditMode ? "Property Updated!" : "Property Listed!",
        description: result.message || `Your property has been successfully ${isEditMode ? 'updated' : 'submitted'}.`,
      });

      router.push(isEditMode && propertyIdToEdit ? `/properties/${propertyIdToEdit}` : `/properties/${result.propertyId || ''}`);
      router.refresh();
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
    <div className="min-h-screen bg-muted/20">
      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-8 max-w-2xl">
          <p className="mb-2 text-sm font-medium text-primary">NyumbaFinder</p>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{pageTitle}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">Add the details tenants need to discover and compare your property. We’ll use the location you choose to make it easier to find in relevant searches.</p>
        </div>
        <Card className="overflow-hidden rounded-3xl border bg-background shadow-sm">
          <CardHeader className="border-b bg-background px-5 py-5 md:px-7">
            <CardTitle className="text-base font-semibold">Property information</CardTitle>
          </CardHeader>
          <CardContent className="px-5 py-6 md:px-7 md:py-8">
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

                  <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">Where is the property?</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Choose the county, then select the town or city and enter the local area.</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <FormField control={form.control} name="countyId" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-foreground">County <span className="text-primary">*</span></FormLabel>
                          <select
                            value={field.value}
                            disabled={countiesLoading || !!countiesError}
                            onChange={(event) => {
                              const value = event.target.value;
                              field.onChange(value);
                              setSelectedTownId("");
                              setTowns([]);
                              form.setValue('location', '', { shouldValidate: true, shouldDirty: true });
                              form.setValue('locationNodeId', '', { shouldValidate: true, shouldDirty: true });
                              setMapPosition(null);
                            }}
                            className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">{countiesLoading ? 'Loading counties...' : countiesError ? 'Unable to load counties' : 'Select a county'}</option>
                            {counties.map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}
                          </select>
                          {countiesError && <p className="text-xs text-destructive">{countiesError}</p>}
                          {!countiesLoading && !countiesError && counties.length === 0 && <p className="text-xs text-destructive">No counties were returned by the server.</p>}
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <FormLabel>Town / City <span className="text-primary">*</span></FormLabel>
                          <select
                            value={selectedTownId}
                            disabled={!watchedCountyId || townsLoading}
                            onChange={(event) => {
                              const townId = event.target.value;
                              const town = towns.find((item) => item.id === townId);
                              setSelectedTownId(townId);
                              form.setValue('locationNodeId', townId, { shouldValidate: true, shouldDirty: true });
                              // Town / City and Area / Estate are separate fields.
                              // Selecting a town must never copy the town name into the area field.
                              form.setValue('location', '', { shouldValidate: true, shouldDirty: true });
                              setMapPosition(town?.latitude != null && town?.longitude != null ? { lat: town.latitude, lng: town.longitude } : null);
                              setLocationSource("USER_SELECTED");
                            }}
                            className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">{!watchedCountyId ? 'Select county first' : townsLoading ? 'Loading towns and cities...' : towns.length ? 'Select a town or city' : 'No towns or cities available'}</option>
                            {towns.map((town) => (
                              <option key={town.id} value={town.id}>{town.name}</option>
                            ))}
                          </select>
                          <p className="text-xs text-muted-foreground">Choose the town or city where the property is located.</p>
                          {form.formState.errors.locationNodeId && (
                            <p className="text-xs text-primary">
                              {form.formState.errors.locationNodeId.message}
                            </p>
                          )}
                        </div>

                        <FormField control={form.control} name="location" render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-foreground">Area / Estate / Neighborhood <span className="text-primary">*</span></FormLabel>
                            <FormControl>
                              <Input
                                list="property-area-suggestions"
                                placeholder={areasLoading ? "Loading area suggestions..." : "e.g., Kilimani, Kapsoya, Milimani"}
                                value={field.value}
                                disabled={!selectedTownId}
                                onChange={(event) => field.onChange(event.target.value)}
                              />
                            </FormControl>
                            {areas.length > 0 && (
                              <datalist id="property-area-suggestions">
                                {areas.map((area) => <option key={area.id} value={area.name} />)}
                              </datalist>
                            )}
                            <FormDescription>Enter the local area tenants would normally use when describing the property.</FormDescription>
                            {form.formState.errors.location?.message && (
                              <p className="text-xs text-primary">
                                {form.formState.errors.location.message}
                              </p>
                            )}
                          </FormItem>
                        )} />
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                              <Navigation className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">Property map location <span className="font-normal text-muted-foreground">(Optional)</span></p>
                              <p className="mt-1 text-xs leading-5 text-muted-foreground">Place the pin where the property is located. You can use your current location or move the pin manually. The map location helps tenants find the property in the right area.</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 rounded-lg"
                            onClick={() => {
                              if (!navigator.geolocation) {
                                toast({ title: "Location unavailable", description: "Your browser does not support location access.", variant: "destructive" });
                                return;
                              }
                              navigator.geolocation.getCurrentPosition(
                                (position) => {
                                  setMapPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
                                  setLocationSource("BROWSER_GEOLOCATION");
                                },
                                () => toast({ title: "Location not available", description: "Allow location access or continue using the selected area.", variant: "destructive" }),
                                { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
                              );
                            }}
                          >
                            Use my location
                          </Button>
                        </div>

                        <div className="mt-4">
                          <InteractiveLocationMap
                            value={mapPosition}
                            onChange={(position) => {
                              setMapPosition(position);
                              setLocationSource("USER_SELECTED");
                            }}
                            heightClassName="h-64 md:h-72"
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                          <span>{mapPosition ? "Location pin selected. Drag the pin to adjust it." : "Set the property location by dragging the pin or tapping the map."}</span>
                          {mapPosition && (
                            <button type="button" className="shrink-0 hover:text-foreground" onClick={() => setMapPosition(null)}>
                              Remove pin
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>


                  <FormField
                    control={form.control}
                    name="listingType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listing Type</FormLabel>
                        <FormControl>
                          <select {...field} className="h-11 w-full rounded-xl border bg-background px-3 text-sm">
                            <option value="FOR_RENT">For Rent</option>
                            <option value="FOR_SALE">For Sale</option>
                            <option value="SHORT_STAY">Short Stay</option>
                          </select>
                        </FormControl>
                        <FormDescription>
                          Choose whether you are renting, selling, or offering the property for short stays.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="propertyType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Property Type</FormLabel>
                        <FormControl>
                          <select {...field} className="h-10 w-full border bg-background px-3 text-sm">
                            {['Apartment', 'Bedsitter', 'Single Room', 'Maisonette', 'Townhouse', 'Bungalow', 'Villa', 'House', 'Shared accommodation'].map((type) => <option key={type}>{type}</option>)}
                          </select>
                        </FormControl>
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
                            <FormLabel>{watchedListingType === 'FOR_SALE' ? 'Sale Price (KES)' : watchedListingType === 'SHORT_STAY' ? 'Nightly Price (KES)' : 'Monthly Rent (KES)'}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder={watchedListingType === 'FOR_SALE' ? 'e.g., 15000000' : watchedListingType === 'SHORT_STAY' ? 'e.g., 5000' : 'e.g., 50000'} {...field} value={field.value ?? ""} suppressHydrationWarning />
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

                  {watchedListingType === 'SHORT_STAY' && (
                    <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
                      <h2 className="text-base font-semibold">Short-stay details</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Optional details for furnished, holiday, serviced, or Airbnb-style stays.</p>
                      <div className="mt-5 grid gap-4 md:grid-cols-3">
                        <FormField control={form.control} name="shortStayMinNights" render={({ field }) => (
                          <FormItem><FormLabel>Minimum nights</FormLabel><FormControl><Input type="number" min="1" placeholder="e.g., 1" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="shortStayMaxNights" render={({ field }) => (
                          <FormItem><FormLabel>Maximum nights <span className="text-muted-foreground">(Optional)</span></FormLabel><FormControl><Input type="number" min="1" placeholder="e.g., 30" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="maxGuests" render={({ field }) => (
                          <FormItem><FormLabel>Maximum guests <span className="text-muted-foreground">(Optional)</span></FormLabel><FormControl><Input type="number" min="1" placeholder="e.g., 4" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="cleaningFee" render={({ field }) => (
                          <FormItem><FormLabel>Cleaning fee (KES) <span className="text-muted-foreground">(Optional)</span></FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 1000" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="securityDeposit" render={({ field }) => (
                          <FormItem><FormLabel>Security deposit (KES) <span className="text-muted-foreground">(Optional)</span></FormLabel><FormControl><Input type="number" min="0" placeholder="e.g., 5000" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                        )} />
                      </div>
                    </div>
                  )}

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
                            <FormLabel>Property Images</FormLabel>
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
                              Upload up to 5 images. Images are compressed before being saved with the property.
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
                          <p className="text-sm font-medium">Property Images ({watchedImages.length} selected):</p>
                          <Button variant="outline" size="sm" type="button" onClick={() => form.setValue('images', [], { shouldValidate: true, shouldDirty: true })}>
                            <Trash2 className="mr-2 h-4 w-4" /> Clear All Images
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {watchedImages.map((uri, index) => (
                            <div key={uri + index} className="relative overflow-hidden rounded-md border shadow-sm">
                              <PropertyImage
                                src={uri}
                                alt={`Preview ${index + 1}`}
                                sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                                minHeightClassName="min-h-[150px]"
                                maxHeightClassName="max-h-[240px]"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute right-2 top-2 h-8 w-8"
                                onClick={() => {
                                  const nextImages = (form.getValues('images') || []).filter((_, imageIndex) => imageIndex !== index);
                                  form.setValue('images', nextImages, { shouldValidate: true, shouldDirty: true });
                                }}
                                aria-label={`Remove image ${index + 1}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
    </div>
  );
}
