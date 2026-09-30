import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Property } from '@/types/property';

const getString = (value: unknown, defaultValue = '') => typeof value === 'string' ? value : defaultValue;
const getOptionalString = (value: unknown) => typeof value === 'string' && value.trim() !== '' ? value : undefined;
const getNumber = (value: unknown, defaultValue = 0) => {
  const num = Number(value);
  return Number.isNaN(num) ? defaultValue : num;
};
const getOptionalNumber = (value: unknown) => {
  if (value === undefined || value === null || String(value).trim() === '') return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};
const getStringArray = (value: unknown): string[] =>
  Array.isArray(value) && value.every(item => typeof item === 'string') ? value : [];

const toProperty = (data: any): Property => ({
  id: data.id, title: data.title, description: data.description, location: data.location,
  price: data.price, images: data.images, bedrooms: data.bedrooms, bathrooms: data.bathrooms,
  area: data.area ?? undefined, amenities: data.amenities, phoneNumber: data.phoneNumber ?? undefined,
});

const getId = async (params: Promise<{ id: string }>) => (await params).id;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) return NextResponse.json({ message: 'Property not found' }, { status: 404 });
    return NextResponse.json(toProperty(property));
  } catch (error) {
    console.error('API_ROUTE_ERROR: [GET /api/properties/:id]', error);
    return NextResponse.json({ message: 'Error fetching property details.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    const rawData = await request.json();
    const data: Record<string, unknown> = {};

    if ('title' in rawData) data.title = getString(rawData.title);
    if ('description' in rawData) data.description = getString(rawData.description);
    if ('location' in rawData) data.location = getString(rawData.location);
    if ('price' in rawData) data.price = getNumber(rawData.price);
    if ('bedrooms' in rawData) data.bedrooms = Math.max(0, Math.trunc(getNumber(rawData.bedrooms)));
    if ('bathrooms' in rawData) data.bathrooms = Math.max(1, Math.trunc(getNumber(rawData.bathrooms, 1)));
    if ('area' in rawData) data.sizeSqm = getOptionalNumber(rawData.area) ?? null;
    if ('amenities' in rawData) data.amenities = getStringArray(rawData.amenities);
    if ('images' in rawData) data.images = getStringArray(rawData.images);
    if ('phoneNumber' in rawData) data.phoneNumber = getOptionalString(rawData.phoneNumber) ?? null;

    if (!Object.keys(data).length) return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    if ('price' in data && Number(data.price) <= 0) return NextResponse.json({ message: 'Price must be greater than zero.' }, { status: 400 });
    if ('title' in data && !data.title) return NextResponse.json({ message: 'Title is required.' }, { status: 400 });
    if ('location' in data && !data.location) return NextResponse.json({ message: 'Location is required.' }, { status: 400 });

    const updated = await prisma.property.update({ where: { id }, data });
    return NextResponse.json({ message: 'Property updated successfully', propertyId: id, property: toProperty(updated) });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [PUT /api/properties/:id]', error);
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    if (error instanceof SyntaxError) return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    return NextResponse.json({ message: 'Error updating property.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = await getId(params);
    if (!id) return NextResponse.json({ message: 'Property ID is required' }, { status: 400 });
    await prisma.property.delete({ where: { id } });
    return NextResponse.json({ message: 'Property deleted successfully', propertyId: id });
  } catch (error: any) {
    console.error('API_ROUTE_ERROR: [DELETE /api/properties/:id]', error);
    if (error?.code === 'P2025') return NextResponse.json({ message: 'Property not found.' }, { status: 404 });
    return NextResponse.json({ message: 'Error deleting property.' }, { status: 500 });
  }
}
