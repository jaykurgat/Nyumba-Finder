
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin-config'; // Ensure this path is correct
import type { Property } from '@/types/property';

// Helper functions for robust type conversion from client data or Firestore data
const getString = (value: any, defaultValue: string = ''): string => (typeof value === 'string' ? value : defaultValue);
const getOptionalString = (value: any): string | undefined => (typeof value === 'string' && value.trim() !== '' ? value : undefined);

const getNumber = (value: any, defaultValue: number = 0): number => {
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
};
const getOptionalNumber = (value: any): number | undefined => {
    if (value === undefined || value === null || String(value).trim() === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? undefined : num;
};
const getStringArray = (value: any): string[] => (
    Array.isArray(value) && value.every(item => typeof item === 'string') ? value : []
);


export async function GET(request: NextRequest) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [GET /api/properties] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const generalQueryTerm = searchParams.get('q')?.toLowerCase(); // General search query from homepage or search bar
    const locationQuery = searchParams.get('location')?.toLowerCase(); // Specific location filter from sidebar
    const minPrice = getOptionalNumber(searchParams.get('minPrice'));
    const maxPrice = getOptionalNumber(searchParams.get('maxPrice'));
    
    const minBedroomsParam = searchParams.get('minBedrooms');
    const minBedrooms = (minBedroomsParam && minBedroomsParam !== 'all') ? getOptionalNumber(minBedroomsParam) : undefined;
    
    const minBathroomsParam = searchParams.get('minBathrooms');
    const minBathrooms = (minBathroomsParam && minBathroomsParam !== 'all') ? getOptionalNumber(minBathroomsParam) : undefined;
    
    const selectedAmenities = searchParams.getAll('amenities');

    console.log('API_ROUTE_INFO: [GET /api/properties] Filters received:', {
        generalQueryTerm, locationQuery, minPrice, maxPrice, minBedrooms, minBathrooms, selectedAmenities
    });
    
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db.collection('properties');

    // Apply Firestore server-side filters for structured data
    if (minPrice !== undefined) {
      query = query.where('price', '>=', minPrice);
    }
    if (maxPrice !== undefined) {
      query = query.where('price', '<=', maxPrice);
    }
    if (minBedrooms !== undefined) {
      query = query.where('bedrooms', '>=', minBedrooms);
    }
    if (minBathrooms !== undefined) {
      query = query.where('bathrooms', '>=', minBathrooms);
    }
    
    // Default ordering - Firestore requires the first orderBy field to be the same as any inequality filter
    // If you have range filters (like on price), order by price first if possible, or create specific indexes.
    // For simplicity, if a price filter is active, we order by price. Otherwise, by title.
    if (minPrice !== undefined || maxPrice !== undefined) {
        query = query.orderBy('price');
    } else {
        query = query.orderBy('title'); // Fallback ordering
    }


    const snapshot = await query.get();

    let propertiesData: Property[] = snapshot.docs.map(doc => {
      const data = doc.data();
      if (!data) {
        console.warn(`API_ROUTE_WARN: [GET /api/properties] Document ${doc.id} has no data. Skipping.`);
        return null; 
      }
      return {
        id: doc.id,
        title: getString(data.title),
        description: getString(data.description),
        location: getString(data.location),
        price: getNumber(data.price),
        images: getStringArray(data.images), // Will be empty array from DB for now
        bedrooms: getNumber(data.bedrooms),
        bathrooms: getNumber(data.bathrooms, 1),
        area: getOptionalNumber(data.area),
        amenities: getStringArray(data.amenities),
        phoneNumber: getOptionalString(data.phoneNumber),
      };
    }).filter(prop => prop !== null) as Property[];

    // Post-fetch JavaScript filtering for general query term and specific location (if not already covered by general)
    if (generalQueryTerm) {
        propertiesData = propertiesData.filter(prop =>
            prop.title.toLowerCase().includes(generalQueryTerm) ||
            prop.description.toLowerCase().includes(generalQueryTerm) ||
            prop.location.toLowerCase().includes(generalQueryTerm) ||
            (prop.amenities && prop.amenities.some(amenity => amenity.toLowerCase().includes(generalQueryTerm)))
        );
    }
    
    if (locationQuery && locationQuery !== generalQueryTerm) { 
        propertiesData = propertiesData.filter(prop =>
          prop.location.toLowerCase().includes(locationQuery)
        );
    }
    
    if (selectedAmenities.length > 0) {
        propertiesData = propertiesData.filter(prop => {
            const propertyAmenities = prop.amenities || [];
            return selectedAmenities.every(sa => propertyAmenities.includes(sa));
        });
    }

    console.log(`API_ROUTE_SUCCESS: [GET /api/properties] Fetched and filtered ${propertiesData.length} properties.`);
    return NextResponse.json(propertiesData, { status: 200 });

  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [GET /api/properties] Error fetching properties from Firestore:', error);
    if (error.code === 'FAILED_PRECONDITION' && error.message && error.message.includes('index')) {
        console.error(`API_ROUTE_ERROR: Firestore query requires an index. Link: ${error.message}`);
        return NextResponse.json({ 
            message: `Query requires a Firestore index. Please create it using the link from the server logs. Details: ${error.message}`,
            details: error.message 
        }, { status: 500 });
    }
    return NextResponse.json({ message: `Error fetching properties: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [POST /api/properties] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const rawData = await request.json();
    console.log('API_ROUTE_INFO: [POST /api/properties] Received data for new property:', {...rawData, images: rawData.images ? `${rawData.images.length} image data URIs received (not stored)` : 'no images'});

    const propertyData: Omit<Property, 'id'> = {
        title: getString(rawData.title, 'Untitled Property'),
        description: getString(rawData.description),
        location: getString(rawData.location, 'Unknown Location'),
        price: getNumber(rawData.price, 0),
        bedrooms: getNumber(rawData.bedrooms, 0),
        bathrooms: getNumber(rawData.bathrooms, 1),
        area: getOptionalNumber(rawData.area),
        amenities: getStringArray(rawData.amenities),
        images: [], // IMPORTANT: Storing empty array for images to avoid Firestore document size limits.
        phoneNumber: getOptionalString(rawData.phoneNumber),
    };
    
    if (rawData.images && Array.isArray(rawData.images) && rawData.images.length > 0) {
        console.warn('API_ROUTE_WARN: [POST /api/properties] Image data URIs were provided but are NOT being saved to Firestore to prevent size limit errors. Storing empty array for images field. Implement Firebase Storage for proper image handling.');
    }

    if (!propertyData.title || propertyData.title === 'Untitled Property' || propertyData.price <= 0 || !propertyData.location || propertyData.location === 'Unknown Location') {
      console.warn('API_ROUTE_WARN: [POST /api/properties] Missing or invalid required fields for new property:', propertyData);
      return NextResponse.json({ message: 'Missing or invalid required fields: title, price, and location must be valid.' }, { status: 400 });
    }
    
    const docRef = await db.collection('properties').add(propertyData);
    const newProperty: Property = {
        id: docRef.id,
        ...propertyData
    };

    console.log('API_ROUTE_SUCCESS: [POST /api/properties] Property added to Firestore. Document ID:', docRef.id);
    return NextResponse.json({ message: 'Property listed successfully', propertyId: docRef.id, property: newProperty }, { status: 201 });

  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [POST /api/properties] Error listing property to Firestore:', error);
    if (error.code === 'INVALID_ARGUMENT' || (typeof error.message === 'string' && error.message.includes('bytes'))) {
        console.error('API_ROUTE_ERROR: [POST /api/properties] Likely Firestore data size limit exceeded. Error details:', error.details || error.message);
        return NextResponse.json({ message: `Error listing property: Firestore data limit likely exceeded. Ensure images are handled by a storage service. Details: ${error.details || error.message}` }, { status: 400 });
    }
    if (error instanceof SyntaxError) { 
        console.warn('API_ROUTE_WARN: [POST /api/properties] Invalid JSON payload received.');
        return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ message: `Error listing property: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}
