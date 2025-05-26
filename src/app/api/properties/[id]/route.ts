
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin-config';
import type { Property } from '@/types/property';
import admin from 'firebase-admin'; // Import admin for FieldValue

// Helper functions for robust type conversion from Firestore data or client data
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [GET /api/properties/:id] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const propertyId = params.id;
    if (!propertyId) {
      console.warn('API_ROUTE_WARN: [GET /api/properties/:id] Property ID is missing from params.');
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }
    console.log(`API_ROUTE_INFO: [GET /api/properties/:id] Attempting to fetch property with ID: ${propertyId}`);

    const docRef = db.collection('properties').doc(propertyId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.warn(`API_ROUTE_WARN: [GET /api/properties/:id] Property with ID ${propertyId} not found in Firestore.`);
      return NextResponse.json({ message: `Property with ID ${propertyId} not found in Firestore.` }, { status: 404 });
    }

    console.log(`API_ROUTE_SUCCESS: [GET /api/properties/:id] Property with ID ${propertyId} found in Firestore.`);
    const data = docSnap.data();
    if (!data) {
        console.error(`API_ROUTE_ERROR: [GET /api/properties/:id] Property data is missing for ID ${propertyId} even though document exists.`);
        return NextResponse.json({ message: 'Property data is missing' }, { status: 404 }); // Should not happen if docSnap.exists
    }

    const propertyData: Property = {
      id: docSnap.id,
      title: getString(data.title),
      description: getString(data.description),
      location: getString(data.location),
      price: getNumber(data.price),
      images: getStringArray(data.images), // Will be empty array from DB for now
      bedrooms: getNumber(data.bedrooms),
      bathrooms: getNumber(data.bathrooms, 1),
      area: getOptionalNumber(data.area),
      amenities: getStringArray(data.amenities),
      phoneNumber: getOptionalString(data.phoneNumber), // Use optional string helper
    };

    return NextResponse.json(propertyData, { status: 200 });
  } catch (error: any) {
    console.error(`API_ROUTE_ERROR: [GET /api/properties/:id] Error fetching property ${params.id} from Firestore:`, error);
    return NextResponse.json({ message: `Error fetching property details: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}


export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [PUT /api/properties/:id] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const propertyId = params.id;
    if (!propertyId) {
      console.warn('API_ROUTE_WARN: [PUT /api/properties/:id] Property ID is missing from params.');
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const rawData = await request.json();
    // Log received data, but be mindful of large data like images if they were ever sent
    console.log(`API_ROUTE_INFO: [PUT /api/properties/:id] Received data for updating property ${propertyId}:`, {...rawData, images: 'Images not logged'});

    // IMPORTANT: Images are NOT saved to Firestore from the update.
    // The 'images' field in rawData should be an empty array from the client if it follows current logic.
    // We will not update the 'images' field in Firestore to avoid size issues.

    const propertyDataToUpdate: Partial<Omit<Property, 'id' | 'images'>> = {};

    // Only include fields in the update object if they are present in the rawData
    // This prevents accidentally overwriting fields with undefined if they weren't sent
    if (rawData.hasOwnProperty('title')) propertyDataToUpdate.title = getString(rawData.title, 'Untitled Property');
    if (rawData.hasOwnProperty('description')) propertyDataToUpdate.description = getString(rawData.description);
    if (rawData.hasOwnProperty('location')) propertyDataToUpdate.location = getString(rawData.location, 'Unknown Location');
    if (rawData.hasOwnProperty('price')) propertyDataToUpdate.price = getNumber(rawData.price, 0);
    if (rawData.hasOwnProperty('bedrooms')) propertyDataToUpdate.bedrooms = getNumber(rawData.bedrooms, 0);
    if (rawData.hasOwnProperty('bathrooms')) propertyDataToUpdate.bathrooms = getNumber(rawData.bathrooms, 1);
    if (rawData.hasOwnProperty('amenities')) propertyDataToUpdate.amenities = getStringArray(rawData.amenities);

    // Handle optional fields carefully to avoid sending 'undefined'
    if (rawData.hasOwnProperty('phoneNumber')) {
        propertyDataToUpdate.phoneNumber = getString(rawData.phoneNumber); // getString ensures empty string if null/undefined
    }

    if (rawData.hasOwnProperty('area')) {
        const areaValue = getOptionalNumber(rawData.area);
        if (areaValue !== undefined) {
            propertyDataToUpdate.area = areaValue;
        } else {
            // If area is explicitly cleared or invalid, remove it from Firestore document
            (propertyDataToUpdate as any).area = admin.firestore.FieldValue.delete();
        }
    }

    // Basic validation for required fields after constructing update object
    if (propertyDataToUpdate.title === 'Untitled Property' || (propertyDataToUpdate.price !== undefined && propertyDataToUpdate.price <= 0) || propertyDataToUpdate.location === 'Unknown Location') {
      console.warn('API_ROUTE_WARN: [PUT /api/properties/:id] Missing or invalid required fields for property update:', propertyDataToUpdate);
      return NextResponse.json({ message: 'Missing or invalid required fields: title, price, and location must be valid.' }, { status: 400 });
    }

    if (Object.keys(propertyDataToUpdate).length === 0) {
        console.warn(`API_ROUTE_WARN: [PUT /api/properties/:id] No valid fields provided for update for property ID ${propertyId}.`);
        return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    const docRef = db.collection('properties').doc(propertyId);
    await docRef.update(propertyDataToUpdate);

    console.log(`API_ROUTE_SUCCESS: [PUT /api/properties/:id] Property with ID ${propertyId} updated in Firestore.`);

    // Fetch the updated property to return it
    const updatedDocSnap = await docRef.get();
    if (!updatedDocSnap.exists) { // Should not happen if update was successful
        console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Property ${propertyId} not found after update.`);
        return NextResponse.json({ message: 'Property not found after update' }, { status: 404 });
    }
    const updatedDataFromDb = updatedDocSnap.data();
    const fullUpdatedProperty: Property = {
        id: docRef.id,
        title: getString(updatedDataFromDb?.title),
        description: getString(updatedDataFromDb?.description),
        location: getString(updatedDataFromDb?.location),
        price: getNumber(updatedDataFromDb?.price),
        images: getStringArray(updatedDataFromDb?.images), // Should be empty
        bedrooms: getNumber(updatedDataFromDb?.bedrooms),
        bathrooms: getNumber(updatedDataFromDb?.bathrooms, 1),
        area: getOptionalNumber(updatedDataFromDb?.area),
        amenities: getStringArray(updatedDataFromDb?.amenities),
        phoneNumber: getOptionalString(updatedDataFromDb?.phoneNumber),
    };


    return NextResponse.json({ message: 'Property updated successfully', propertyId: docRef.id, property: fullUpdatedProperty }, { status: 200 });

  } catch (error: any) {
    console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Error updating property ${params.id} in Firestore:`, error);
    if (error.code === 'NOT_FOUND' || (error.message && error.message.includes('NOT_FOUND'))) { // Firestore error code for not found
      console.warn(`API_ROUTE_WARN: [PUT /api/properties/:id] Property with ID ${params.id} not found for update.`);
      return NextResponse.json({ message: `Property with ID ${params.id} not found.` }, { status: 404 });
    }
    if (error.message && error.message.includes("Value for argument \"dataOrField\" is not a valid Firestore value.")) {
        console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Firestore validation error. Likely an undefined value was passed for update. Details: ${error.message}`);
         return NextResponse.json({ message: `Firestore validation error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating property: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}
