
import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin-config';
import type { Property } from '@/types/property';
import admin from 'firebase-admin';

// Helper functions for robust type conversion
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

interface ApiContext {
  params: { id: string };
}

export async function GET(
  request: Request, // Changed from NextRequest
  context: ApiContext // Changed how params are accessed
) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [GET /api/properties/:id] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const propertyId = context.params.id; // Access id from context.params
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
        return NextResponse.json({ message: 'Property data is missing' }, { status: 404 });
    }

    const propertyData: Property = {
      id: docSnap.id,
      title: getString(data.title),
      description: getString(data.description),
      location: getString(data.location),
      price: getNumber(data.price),
      images: getStringArray(data.images),
      bedrooms: getNumber(data.bedrooms),
      bathrooms: getNumber(data.bathrooms, 1),
      area: getOptionalNumber(data.area),
      amenities: getStringArray(data.amenities),
      phoneNumber: getOptionalString(data.phoneNumber),
    };

    return NextResponse.json(propertyData, { status: 200 });
  } catch (error: any) {
    console.error(`API_ROUTE_ERROR: [GET /api/properties/:id] Error fetching property ${context.params.id} from Firestore:`, error);
    return NextResponse.json({ message: `Error fetching property details: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}


export async function PUT(
  request: Request, // Changed from NextRequest
  context: ApiContext // Changed how params are accessed
) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [PUT /api/properties/:id] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const propertyId = context.params.id; // Access id from context.params
    if (!propertyId) {
      console.warn('API_ROUTE_WARN: [PUT /api/properties/:id] Property ID is missing from params.');
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const rawData = await request.json();
    console.log(`API_ROUTE_INFO: [PUT /api/properties/:id] Received data for updating property ${propertyId}:`, rawData);

    const propertyDataToUpdate: { [key: string]: any } = {}; // Use a more flexible type for updates

    if (rawData.hasOwnProperty('title')) propertyDataToUpdate.title = getString(rawData.title, 'Untitled Property');
    if (rawData.hasOwnProperty('description')) propertyDataToUpdate.description = getString(rawData.description);
    if (rawData.hasOwnProperty('location')) propertyDataToUpdate.location = getString(rawData.location, 'Unknown Location');
    if (rawData.hasOwnProperty('price')) propertyDataToUpdate.price = getNumber(rawData.price, 0);
    if (rawData.hasOwnProperty('bedrooms')) propertyDataToUpdate.bedrooms = getNumber(rawData.bedrooms, 0);
    if (rawData.hasOwnProperty('bathrooms')) propertyDataToUpdate.bathrooms = getNumber(rawData.bathrooms, 1);
    if (rawData.hasOwnProperty('amenities')) propertyDataToUpdate.amenities = getStringArray(rawData.amenities);
    
    // For images, we expect URLs from Firebase Storage or an empty array.
    // The client should handle the upload to storage and provide URLs.
    // To prevent oversized documents, we are still cautious about directly saving large image arrays.
    // For now, if 'images' is present, we assume it's an array of URLs.
    if (rawData.hasOwnProperty('images')) {
      propertyDataToUpdate.images = getStringArray(rawData.images);
    }
    
    if (rawData.hasOwnProperty('phoneNumber')) {
        propertyDataToUpdate.phoneNumber = getString(rawData.phoneNumber); // Empty string is fine
    }

    if (rawData.hasOwnProperty('area')) {
        const areaValue = getOptionalNumber(rawData.area);
        if (areaValue !== undefined) {
            propertyDataToUpdate.area = areaValue;
        } else {
             propertyDataToUpdate.area = admin.firestore.FieldValue.delete();
        }
    }
    
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

    const updatedDocSnap = await docRef.get();
    if (!updatedDocSnap.exists) { 
        console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Property ${propertyId} not found after update.`);
        return NextResponse.json({ message: 'Property not found after update' }, { status: 404 });
    }
    const updatedDataFromDb = updatedDocSnap.data()!;
    const fullUpdatedProperty: Property = {
        id: docRef.id,
        title: getString(updatedDataFromDb.title),
        description: getString(updatedDataFromDb.description),
        location: getString(updatedDataFromDb.location),
        price: getNumber(updatedDataFromDb.price),
        images: getStringArray(updatedDataFromDb.images),
        bedrooms: getNumber(updatedDataFromDb.bedrooms),
        bathrooms: getNumber(updatedDataFromDb.bathrooms, 1),
        area: getOptionalNumber(updatedDataFromDb.area),
        amenities: getStringArray(updatedDataFromDb.amenities),
        phoneNumber: getOptionalString(updatedDataFromDb.phoneNumber),
    };

    return NextResponse.json({ message: 'Property updated successfully', propertyId: docRef.id, property: fullUpdatedProperty }, { status: 200 });

  } catch (error: any) {
    console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Error updating property ${context.params.id} in Firestore:`, error);
    if (error.code === 'NOT_FOUND' || (error.message && error.message.includes('NOT_FOUND'))) { 
      console.warn(`API_ROUTE_WARN: [PUT /api/properties/:id] Property with ID ${context.params.id} not found for update.`);
      return NextResponse.json({ message: `Property with ID ${context.params.id} not found.` }, { status: 404 });
    }
    if (error.message && error.message.includes("Value for argument \"dataOrField\" is not a valid Firestore value.")) {
        console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Firestore validation error. Likely an undefined value was passed for update. Details: ${error.message}`);
         return NextResponse.json({ message: `Firestore validation error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating property: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}

export async function DELETE(
  request: Request, // Changed from NextRequest
  context: ApiContext // Changed how params are accessed
) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [DELETE /api/properties/:id] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const propertyId = context.params.id; // Access id from context.params
    if (!propertyId) {
      console.warn('API_ROUTE_WARN: [DELETE /api/properties/:id] Property ID is missing from params.');
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    console.log(`API_ROUTE_INFO: [DELETE /api/properties/:id] Attempting to delete property with ID: ${propertyId}`);
    
    // Before deleting the Firestore document, delete associated images from Firebase Storage
    const docToDeleteSnap = await db.collection('properties').doc(propertyId).get();
    if (docToDeleteSnap.exists) {
      const propertyData = docToDeleteSnap.data() as Property;
      if (propertyData.images && propertyData.images.length > 0) {
        const { storage, ref: storageRefImport, deleteObject } = await import('@/lib/firebase-client-config');
        const deletePromises = propertyData.images.map(imageUrl => {
          try {
            // Extract file path from URL. Assumes URLs are from Firebase Storage.
            // Example URL: https://firebasestorage.googleapis.com/v0/b/your-bucket.appspot.com/o/properties%2FpropertyId%2FimageName.jpg?alt=media...
            // We need the path after "/o/" and before "?alt=media"
            const url = new URL(imageUrl);
            const pathName = decodeURIComponent(url.pathname); // Decodes '%2F' to '/' etc.
            // Path typically looks like /v0/b/bucket-name/o/full/path/to/file.jpg
            const filePath = pathName.substring(pathName.indexOf('/o/') + 3);


            if (filePath) {
                const imageFileRef = storageRefImport(storage, filePath);
                console.log(`API_ROUTE_INFO: Attempting to delete image from storage: ${filePath}`);
                return deleteObject(imageFileRef).catch(err => {
                  console.error(`API_ROUTE_ERROR: Failed to delete image ${filePath} from storage: `, err);
                  // Don't let a failed image deletion stop the Firestore doc deletion
                });
            }
          } catch (e) { 
            console.error(`API_ROUTE_ERROR: Error processing image URL ${imageUrl} for deletion from storage: `, e);
          }
          return Promise.resolve(); // Resolve if URL is invalid or processing fails
        });
        await Promise.all(deletePromises);
        console.log(`API_ROUTE_INFO: Attempted to delete associated images from Firebase Storage for property ${propertyId}.`);
      }
    } else {
      console.warn(`API_ROUTE_WARN: [DELETE /api/properties/:id] Property document ${propertyId} not found for image deletion pre-check. It might have already been deleted or never existed.`);
    }


    const docRef = db.collection('properties').doc(propertyId);
    // Re-check existence before delete, in case it was deleted between image check and now (unlikely but good practice)
    const currentDocSnap = await docRef.get(); 
    if (!currentDocSnap.exists) {
      console.warn(`API_ROUTE_WARN: [DELETE /api/properties/:id] Property with ID ${propertyId} not found for deletion from Firestore.`);
      return NextResponse.json({ message: `Property with ID ${propertyId} not found for deletion.` }, { status: 404 });
    }
    
    await docRef.delete();

    console.log(`API_ROUTE_SUCCESS: [DELETE /api/properties/:id] Property with ID ${propertyId} deleted from Firestore.`);
    return NextResponse.json({ message: 'Property deleted successfully', propertyId }, { status: 200 });

  } catch (error: any) {
    console.error(`API_ROUTE_ERROR: [DELETE /api/properties/:id] Error deleting property ${context.params.id} from Firestore:`, error);
    return NextResponse.json({ message: `Error deleting property: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}

