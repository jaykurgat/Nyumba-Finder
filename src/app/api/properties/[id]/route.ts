import { NextResponse, NextRequest } from 'next/server';
import { db } from '@/lib/firebase-admin-config';
import type { Property } from '@/types/property';
import admin from 'firebase-admin';

// Helper functions
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
const getStringArray = (value: any): string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!db) {
    console.error('Firestore not initialized.');
    return NextResponse.json({ message: 'Firestore is not initialized.' }, { status: 500 });
  }

  try {
    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const docRef = db.collection('properties').doc(propertyId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ message: `Property with ID ${propertyId} not found.` }, { status: 404 });
    }

    const data = docSnap.data();
    if (!data) {
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
    return NextResponse.json({ message: `Error fetching property: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not initialized.' }, { status: 500 });
  }

  try {
    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const rawData = await request.json();
    const propertyDataToUpdate: { [key: string]: any } = {};

    if (rawData.hasOwnProperty('title')) propertyDataToUpdate.title = getString(rawData.title, 'Untitled Property');
    if (rawData.hasOwnProperty('description')) propertyDataToUpdate.description = getString(rawData.description);
    if (rawData.hasOwnProperty('location')) propertyDataToUpdate.location = getString(rawData.location, 'Unknown Location');
    if (rawData.hasOwnProperty('price')) propertyDataToUpdate.price = getNumber(rawData.price, 0);
    if (rawData.hasOwnProperty('bedrooms')) propertyDataToUpdate.bedrooms = getNumber(rawData.bedrooms, 0);
    if (rawData.hasOwnProperty('bathrooms')) propertyDataToUpdate.bathrooms = getNumber(rawData.bathrooms, 1);
    if (rawData.hasOwnProperty('amenities')) propertyDataToUpdate.amenities = getStringArray(rawData.amenities);
    if (rawData.hasOwnProperty('images')) propertyDataToUpdate.images = getStringArray(rawData.images);
    if (rawData.hasOwnProperty('phoneNumber')) propertyDataToUpdate.phoneNumber = getString(rawData.phoneNumber);
    if (rawData.hasOwnProperty('area')) {
      const areaValue = getOptionalNumber(rawData.area);
      propertyDataToUpdate.area = areaValue !== undefined ? areaValue : admin.firestore.FieldValue.delete();
    }

    if (
      propertyDataToUpdate.title === 'Untitled Property' ||
      (propertyDataToUpdate.hasOwnProperty('price') && propertyDataToUpdate.price <= 0) ||
      propertyDataToUpdate.location === 'Unknown Location'
    ) {
      return NextResponse.json(
        { message: 'Missing or invalid required fields: title, price, and location must be valid.' },
        { status: 400 }
      );
    }

    if (Object.keys(propertyDataToUpdate).length === 0) {
      return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    const docRef = db.collection('properties').doc(propertyId);
    await docRef.update(propertyDataToUpdate);

    const updatedDocSnap = await docRef.get();
    if (!updatedDocSnap.exists) {
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

    return NextResponse.json(
      { message: 'Property updated successfully', propertyId: docRef.id, property: fullUpdatedProperty },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message && error.message.includes("Value for argument")) {
      return NextResponse.json({ message: `Firestore validation error: ${error.message}` }, { status: 400 });
    }
    return NextResponse.json({ message: `Error updating property: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!db) {
    return NextResponse.json({ message: 'Firestore is not initialized.' }, { status: 500 });
  }

  try {
    const propertyId = params.id;
    if (!propertyId) {
      return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    }

    const docRef = db.collection('properties').doc(propertyId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ message: `Property with ID ${propertyId} not found.` }, { status: 404 });
    }

    const propertyData = docSnap.data() as Property;
    if (
      propertyData.images &&
      propertyData.images.length > 0 &&
      admin.apps.length > 0 &&
      admin.storage().bucket
    ) {
      const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
      if (bucketName) {
        const bucket = admin.storage().bucket(bucketName);
        const deletePromises = propertyData.images.map(async (imageUrl) => {
          try {
            if (!imageUrl.startsWith('http')) return;
            const url = new URL(imageUrl);
            const pathName = decodeURIComponent(url.pathname);
            const match = pathName.match(/\/o\/(.+?)(?:\?|$)/);
            if (match && match[1]) {
              await bucket.file(match[1]).delete();
            }
          } catch (e: any) {
            console.error(`Error deleting image: ${e.message}`);
          }
        });
        await Promise.all(deletePromises);
      }
    }

    await docRef.delete();
    return NextResponse.json({ message: 'Property deleted successfully', propertyId }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: `Error deleting property: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
