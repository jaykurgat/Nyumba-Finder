
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, use } from 'react';
import { PropertyImage } from "@/components/properties/PropertyImage";

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
import { Loader2, Trash2, Home, MapPin, Navigation, Search, CheckCircle2, X } from "lucide-react";
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
  locationNodeId: z.string().min(1, "Please select a location or county from the suggestions."),
  propertyType: z.string().min(2, "Please select a property type."),
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
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [locationSearching, setLocationSearching] = useState(false);
  const [counties, setCounties] = useState<any[]>([]);
  const [selectedTownId, setSelectedTownId] = useState("");
  const [townSuggestions, setTownSuggestions] = useState<any[]>([]);
  const [townSearching, setTownSearching] = useState(false);
  const [showTownSuggestions, setShowTownSuggestions] = useState(false);
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

  useEffect(() => {
    fetch('/api/counties')
      .then((response) => response.json())
      .then((data) => setCounties(data.counties || []))
      .catch(() => setCounties([]));
  }, []);

  useEffect(() => {
    const query = watchedLocation?.trim() || '';
    if (query.length < 2) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLocationSearching(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (watchedCountyId) params.set('countyId', watchedCountyId);
        if (selectedTownId) params.set('parentId', selectedTownId);
        const response = await fetch('/api/locations?' + params.toString());
        const data = await response.json();
        setLocationSuggestions(data.locations || []);
        setShowLocationSuggestions(true);
      } catch {
        setLocationSuggestions([]);
      } finally {
        setLocationSearching(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [watchedLocation, watchedCountyId, selectedTownId]);

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
      formData.append('price', String(Number(values.price)));
      formData.append('bedrooms', String(Number(values.bedrooms)));
      formData.append('bathrooms', String(Number(values.bathrooms)));
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

                  <div className="rounded-2xl border bg-card p-5 shadow-sm md:p-6">
                    <div className="mb-5 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-5 w-5" /></div>
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight">Where is the property?</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Choose the county first, then narrow the location. You don't need to know the official administrative name.</p>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <FormField control={form.control} name="countyId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>County</FormLabel>
                          <select
                            value={field.value}
                            onChange={(event) => {
                              const value = event.target.value;
                              field.onChange(value);
                              setSelectedTownId("");
                              setTownSuggestions([]);
                              form.setValue('location', '', { shouldValidate: true, shouldDirty: true });
                              form.setValue('locationNodeId', '', { shouldValidate: true, shouldDirty: true });
                              setMapPosition(null);
                            }}
                            className="flex h-11 w-full rounded-xl border bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/20"
                          >
                            <option value="">Select a county</option>
                            {counties.map((county) => <option key={county.id} value={county.id}>{county.name}</option>)}
                          </select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid gap-5 md:grid-cols-2">
                        <div className="space-y-2">
                          <FormLabel>Town / City <span className="font-normal text-muted-foreground">(Optional)</span></FormLabel>
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={townSuggestions.find((town) => town.id === selectedTownId)?.name || ""}
                              disabled={!watchedCountyId}
                              placeholder={watchedCountyId ? "Search a town or city" : "Select a county first"}
                              className="h-11 rounded-xl pl-9 pr-9"
                              autoComplete="off"
                              onChange={(event) => {
                                setSelectedTownId("");
                                const query = event.target.value.trim();
                                if (!watchedCountyId || query.length < 2) { setTownSuggestions([]); setShowTownSuggestions(false); return; }
                                setTownSearching(true);
                                fetch('/api/locations?' + new URLSearchParams({ q: query, countyId: watchedCountyId, level: 'TOWN' }).toString())
                                  .then((response) => response.json()).then((data) => { setTownSuggestions(data.locations || []); setShowTownSuggestions(true); }).catch(() => setTownSuggestions([])).finally(() => setTownSearching(false));
                              }}
                              onFocus={() => townSuggestions.length > 0 && setShowTownSuggestions(true)}
                            />
                            {selectedTownId && <button type="button" onClick={() => { setSelectedTownId(""); setTownSuggestions([]); }} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground" aria-label="Clear town"><X className="h-4 w-4" /></button>}
                            {showTownSuggestions && (
                              <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border bg-background shadow-xl">
                                {townSearching && <div className="px-4 py-3 text-sm text-muted-foreground">Searching...</div>}
                                {!townSearching && townSuggestions.map((town) => <button key={town.id} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSelectedTownId(town.id); setShowTownSuggestions(false); form.setValue('location', '', { shouldValidate: true }); form.setValue('locationNodeId', '', { shouldValidate: true }); }} className="block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60"><span className="block font-medium">{town.name}</span><span className="text-xs text-muted-foreground">{town.typeLabel} · {town.countyName}</span></button>)}
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">Optional. It only narrows the locality suggestions.</p>
                        </div>

                        <FormField control={form.control} name="location" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Area / Locality</FormLabel>
                            <div className="relative">
                              <FormControl><Input placeholder={watchedCountyId ? "Kileleshwa, South B, Kapsoya..." : "Select a county first"} {...field} disabled={!watchedCountyId} autoComplete="off" className="h-11 rounded-xl" onFocus={() => locationSuggestions.length > 0 && setShowLocationSuggestions(true)} onChange={(event) => { field.onChange(event); form.setValue('locationNodeId', '', { shouldValidate: true }); }} /></FormControl>
                              {showLocationSuggestions && (
                                <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border bg-background shadow-xl">
                                  {locationSearching && <div className="px-4 py-3 text-sm text-muted-foreground">Searching recognized locations...</div>}
                                  {!locationSearching && locationSuggestions.length === 0 && <div className="px-4 py-4"><p className="text-sm font-medium">No exact locality found</p><p className="mt-1 text-xs text-muted-foreground">You can use the county as the listing location or choose a nearby recognized location.</p></div>}
                                  {!locationSearching && locationSuggestions.map((location) => <button key={location.id} type="button" className="block w-full border-b px-4 py-3 text-left last:border-0 hover:bg-muted/60" onMouseDown={(event) => event.preventDefault()} onClick={() => { form.setValue('location', location.name, { shouldValidate: true, shouldDirty: true }); form.setValue('locationNodeId', location.id, { shouldValidate: true, shouldDirty: true }); setMapPosition(location.latitude != null && location.longitude != null ? { lat: location.latitude, lng: location.longitude } : null); setLocationSource("USER_SELECTED"); setShowLocationSuggestions(false); }}><span className="block font-medium">{location.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{location.typeLabel}{location.parentName ? ' · ' + location.parentName : ''} · {location.countyName}</span></button>)}
                                </div>
                              )}
                            </div>
                            <FormDescription>Search estates, neighborhoods, villages, towns, centres and administrative locations.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      {watchedCountyId && !form.watch('locationNodeId') && (
                        <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div><p className="text-sm font-medium">Can't find the exact area?</p><p className="mt-1 text-xs text-muted-foreground">You can list the property under the whole county. Tenants can still discover it through broader location searches.</p></div>
                            <Button type="button" variant="outline" size="sm" onClick={() => { const county = counties.find((item) => item.id === watchedCountyId); if (!county?.locationNodeId) return; form.setValue('location', county.name, { shouldValidate: true, shouldDirty: true }); form.setValue('locationNodeId', county.locationNodeId, { shouldValidate: true, shouldDirty: true }); setSelectedTownId(""); setShowLocationSuggestions(false); setLocationSource("USER_SELECTED"); }}>Use county</Button>
                          </div>
                        </div>
                      )}

                      <div className="rounded-xl border bg-muted/20 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3"><div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary shadow-sm"><Navigation className="h-4 w-4" /></div><div><p className="text-sm font-medium">Property map location <span className="font-normal text-muted-foreground">(Optional)</span></p><p className="mt-1 text-xs leading-5 text-muted-foreground">A location pin helps tenants find properties near the areas they search for. Your exact pin is used for search and is not shown publicly as a precise address.</p></div></div>
                          <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-lg" onClick={() => { if (!navigator.geolocation) { toast({ title: "Location unavailable", description: "Your browser does not support location access.", variant: "destructive" }); return; } navigator.geolocation.getCurrentPosition((position) => { setMapPosition({ lat: position.coords.latitude, lng: position.coords.longitude }); setLocationSource("BROWSER_GEOLOCATION"); }, () => toast({ title: "Location not available", description: "Allow location access or continue using the selected area.", variant: "destructive" }), { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }); }}>Use my location</Button>
                        </div>
                        {mapPosition && <div className="mt-4 overflow-hidden rounded-xl border bg-background"><iframe title="Property location map" className="h-48 w-full border-0" loading="lazy" src={`https://www.openstreetmap.org/export/embed.html?bbox=${mapPosition.lng - 0.01}%2C${mapPosition.lat - 0.01}%2C${mapPosition.lng + 0.01}%2C${mapPosition.lat + 0.01}&layer=mapnik&marker=${mapPosition.lat}%2C${mapPosition.lng}`} /><div className="flex items-center justify-between gap-3 px-3 py-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-primary" />Location pin captured</span><button type="button" className="hover:text-foreground" onClick={() => setMapPosition(null)}>Remove pin</button></div></div>}
                      </div>
                    </div>
                  </div>

                  <FormField control={form.control} name="locationNodeId" render={() => <FormItem><FormMessage /></FormItem>} />

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
  );
}
