
import { type NextRequest, NextResponse } from 'next/server';
import type { Property } from '@/types/property';

// In-memory store to simulate a database for now
let propertiesStore: Property[] = [
  // Initial mock properties (can be expanded or loaded from a JSON file later)
  { id: '1', title: 'Spacious 2 Bedroom Apt in Kilimani', price: 75000, location: 'Kilimani, Nairobi', description: 'Modern apartment with great views and amenities.', images: ['https://placehold.co/600x400.png'], bedrooms: 2, bathrooms: 2, area: 120, amenities: ['Parking', 'Swimming Pool', 'Gym'] },
  { id: '2', title: 'Cozy Studio near Yaya Centre', price: 40000, location: 'Kilimani, Nairobi', description: 'Perfect studio for singles or couples.', images: ['https://placehold.co/600x400.png'], bedrooms: 0, bathrooms: 1, area: 45, amenities: ['Parking', 'Security'] },
  { id: '3', title: 'Family Home in Lavington', price: 150000, location: 'Lavington, Nairobi', description: 'Beautiful 4-bedroom house with a garden.', images: ['https://placehold.co/600x400.png'], bedrooms: 4, bathrooms: 3, area: 300, amenities: ['Parking', 'Garden', 'Security'] },
  { id: '4', title: 'Beachfront Villa in Nyali', price: 120000, location: 'Nyali, Mombasa', description: 'Stunning villa with direct beach access.', images: ['https://placehold.co/600x400.png'], bedrooms: 3, bathrooms: 3, area: 250, amenities: ['Parking', 'Swimming Pool', 'Beach Access'] },
  { id: '5', title: 'Affordable Bedsitter in Roysambu', price: 15000, location: 'Roysambu, Nairobi', description: 'Budget-friendly bedsitter, close to TRM.', images: ['https://placehold.co/600x400.png'], bedrooms: 0, bathrooms: 1, area: 30, amenities: ['Security'] },
  { id: '6', title: 'Modern 1 Bedroom in Westlands', price: 60000, location: 'Westlands, Nairobi', description: 'Chic apartment in a prime location.', images: ['https://placehold.co/600x400.png'], bedrooms: 1, bathrooms: 1, area: 65, amenities: ['Parking', 'Gym', 'Security'] },
];

export async function GET(request: NextRequest) {
  try {
    // Simulate fetching all properties
    // In a real scenario, you'd fetch from your database here.
    // Apply search parameters if any
    const searchParams = request.nextUrl.searchParams;
    const locationQuery = searchParams.get('location')?.toLowerCase();

    let filteredProperties = propertiesStore;

    if (locationQuery) {
      filteredProperties = propertiesStore.filter(prop => 
        prop.location.toLowerCase().includes(locationQuery)
      );
    }
    
    return NextResponse.json(filteredProperties, { status: 200 });
  } catch (error) {
    console.error('API GET Error fetching properties:', error);
    return NextResponse.json({ message: 'Error fetching properties' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const propertyData = await request.json() as Omit<Property, 'id'>;
    
    // Basic server-side validation (can be expanded with Zod or similar)
    if (!propertyData.title || !propertyData.price || !propertyData.location) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const newProperty: Property = {
      ...propertyData,
      id: `prop_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`, // Generate a unique ID
      images: propertyData.images || ['https://placehold.co/600x400.png'], // Ensure images array or default
    };

    propertiesStore.push(newProperty);
    console.log('API POST: Property added to store:', newProperty);
    
    // In a real scenario, you'd save to your database here.
    return NextResponse.json({ message: 'Property listed successfully', property: newProperty }, { status: 201 });
  } catch (error) {
    console.error('API POST Error listing property:', error);
    // Check if error is due to JSON parsing
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error listing property' }, { status: 500 });
  }
}
