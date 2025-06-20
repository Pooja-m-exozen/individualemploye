export const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            return data.results[0].formatted_address;
        }
        return 'Address not found';
    } catch (error) {
        console.error('Error fetching address:', error);
        return 'Error fetching address';
    }
};