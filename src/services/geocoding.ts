/**
 * Represents a geographical location with latitude and longitude coordinates.
 */
export interface Coordinates {
  /**
   * The latitude of the location.
   */
  lat: number;
  /**
   * The longitude of the location.
   */
  lng: number;
}

/**
 * Asynchronously retrieves coordinates for a given Kenyan location.
 *
 * @param location The Kenyan location for which to retrieve coordinates.
 * @returns A promise that resolves to a Coordinates object containing latitude and longitude.
 */
export async function getCoordinates(location: string): Promise<Coordinates> {
  // TODO: Implement this by calling an API.

  return {
    lat: -1.286389,
    lng: 36.817223,
  };
}
