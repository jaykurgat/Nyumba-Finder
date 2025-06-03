
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin-config';
import type { Property } from '@/types/property';
import admin from 'firebase-admin'; // For FieldValue and admin.storage()

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

export async function GET(
  request: Request, // Changed to standard Request
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
    console.error(`API_ROUTE_ERROR: [GET /api/properties/:id] Error fetching property ${params.id} from Firestore:`, error);
    return NextResponse.json({ message: `Error fetching property details: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}

export async function PUT(
  request: Request, // Changed to standard Request
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
    console.log(`API_ROUTE_INFO: [PUT /api/properties/:id] Received data for updating property ${propertyId}:`, rawData);

    const propertyDataToUpdate: { [key: string]: any } = {};

    if (rawData.hasOwnProperty('title')) propertyDataToUpdate.title = getString(rawData.title, 'Untitled Property');
    if (rawData.hasOwnProperty('description')) propertyDataToUpdate.description = getString(rawData.description);
    if (rawData.hasOwnProperty('location')) propertyDataToUpdate.location = getString(rawData.location, 'Unknown Location');
    if (rawData.hasOwnProperty('price')) propertyDataToUpdate.price = getNumber(rawData.price, 0);
    if (rawData.hasOwnProperty('bedrooms')) propertyDataToUpdate.bedrooms = getNumber(rawData.bedrooms, 0);
    if (rawData.hasOwnProperty('bathrooms')) propertyDataToUpdate.bathrooms = getNumber(rawData.bathrooms, 1);
    if (rawData.hasOwnProperty('amenities')) propertyDataToUpdate.amenities = getStringArray(rawData.amenities);
    
    if (rawData.hasOwnProperty('images')) {
      propertyDataToUpdate.images = getStringArray(rawData.images);
    }
    
    if (rawData.hasOwnProperty('phoneNumber')) {
        propertyDataToUpdate.phoneNumber = getString(rawData.phoneNumber); // Allow empty string
    }

    if (rawData.hasOwnProperty('area')) {
        const areaValue = getOptionalNumber(rawData.area);
        if (areaValue !== undefined) {
            propertyDataToUpdate.area = areaValue;
        } else {
             propertyDataToUpdate.area = admin.firestore.FieldValue.delete();
        }
    }
    
    if (propertyDataToUpdate.title === 'Untitled Property' || (propertyDataToUpdate.hasOwnProperty('price') && propertyDataToUpdate.price <= 0) || propertyDataToUpdate.location === 'Unknown Location') {
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
    console.error(`API_ROUTE_ERROR: [PUT /api/properties/:id] Error updating property ${params.id} in Firestore:`, error);
    if (error.code === 'NOT_FOUND' || (error.message && error.message.includes('NOT_FOUND'))) { 
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

export async function DELETE(
  request: Request, // Changed to standard Request
  { params }: { params: { id: string } }
) {
  if (!db) {
    console.error('API_ROUTE_ERROR: [DELETE /api/properties/:id] Firestore is not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized. Check server logs.' }, { status: 500 });
  }

  try {
    const propertyId = params.id;
    if (!propertyId) {
      console.warn('API_ROUTE_WARN: [DELETE /api/properties/:id] Property ID is missing from params.');
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    console.log(`API_ROUTE_INFO: [DELETE /api/properties/:id] Attempting to delete property with ID: ${propertyId}`);
    
    const docRef = db.collection('properties').doc(propertyId);
    const docToDeleteSnap = await docRef.get();

    if (docToDeleteSnap.exists) {
      const propertyData = docToDeleteSnap.data() as Property;
      if (propertyData.images && propertyData.images.length > 0 && admin.apps.length) {
        // Use Firebase Admin SDK to delete images from storage
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET; // Or your server-side env var for bucket name
        if (!bucketName) {
            console.error("API_ROUTE_ERROR: [DELETE /api/properties/:id] Firebase Storage bucket name (e.g., NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) is not configured in environment variables. Cannot delete images from storage.");
        } else {
            const bucket = admin.storage().bucket(bucketName);
            const deletePromises = propertyData.images.map(async (imageUrl) => {
              try {
                const url = new URL(imageUrl);
                const pathName = decodeURIComponent(url.pathname);
                // Firebase Storage URL path typically looks like: /v0/b/YOUR_BUCKET_NAME/o/path%2Fto%2Ffile.jpg?alt=media&token=...
                // We need to extract "path/to/file.jpg"
                const filePathRegex = /\/o\/(.+?)\?alt=media/;
                const match = pathName.match(filePathRegex);

                if (match && match[1]) {
                    const filePath = decodeURIComponent(match[1]); // This is the actual path within the bucket
                    console.log(`API_ROUTE_INFO: [DELETE /api/properties/:id] Attempting to delete image from storage via Admin SDK: gs://${bucketName}/${filePath}`);
                    await bucket.file(filePath).delete().catch(err => {
                      // Log error but don't let it block Firestore deletion if file not found or other minor issue
                      console.warn(`API_ROUTE_WARN: [DELETE /api/properties/:id] Failed to delete image ${filePath} from storage (Admin SDK). It might have already been deleted or path is incorrect. Error: `, err.message);
                    });
                } else {
                     console.warn(`API_ROUTE_WARN: [DELETE /api/properties/:id] Could not extract file path from image URL for deletion: ${imageUrl}`);
                }
              } catch (e: any) {
                console.error(`API_ROUTE_ERROR: [DELETE /api/properties/:id] Error processing image URL ${imageUrl} for Admin SDK deletion: `, e.message);
              }
            });
            await Promise.all(deletePromises);
            console.log(`API_ROUTE_INFO: [DELETE /api/properties/:id] Attempted to delete associated images from Firebase Storage (Admin SDK) for property ${propertyId}.`);
        }
      }
    } else {
      console.warn(`API_ROUTE_WARN: [DELETE /api/properties/:id] Property document ${propertyId} not found for deletion or image pre-check.`);
      return NextResponse.json({ message: `Property with ID ${propertyId} not found.` }, { status: 404 });
    }
    
    await docRef.delete(); // Delete Firestore document after attempting image deletion

    console.log(`API_ROUTE_SUCCESS: [DELETE /api/properties/:id] Property with ID ${propertyId} deleted from Firestore.`);
    return NextResponse.json({ message: 'Property deleted successfully', propertyId }, { status: 200 });

  } catch (error: any) {
    console.error(`API_ROUTE_ERROR: [DELETE /api/properties/:id] Error deleting property ${params.id} from Firestore:`, error);
    return NextResponse.json({ message: `Error deleting property: ${error.message || 'Unknown server error'}` }, { status: 500 });
  }
}
