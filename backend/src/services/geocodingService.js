/**
 * Geocoding Service (SIH 26036)
 *
 * Abstract geocoding service that converts physical address strings
 * into geospatial coordinates (latitude & longitude) without exposing
 * API keys to the frontend React client.
 *
 * Default Provider: OpenStreetMap Nominatim (Free, no API key required)
 * Configurable Providers: Google Geocoding API, Mapbox
 */

const buildAddressString = (addressObj) => {
  if (typeof addressObj === 'string') {
    return addressObj.trim();
  }

  const parts = [
    addressObj.addressLine1,
    addressObj.addressLine2,
    addressObj.locality || addressObj.village,
    addressObj.landmark,
    addressObj.city,
    addressObj.district,
    addressObj.state,
    addressObj.pincode,
    addressObj.country || 'India',
  ].filter((p) => p && typeof p === 'string' && p.trim().length > 0);

  return parts.join(', ');
};

/**
 * Validate that coordinates are valid geographic numbers and not [0, 0]
 */
const validateCoordinates = (lat, lng) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return { isValid: false, message: 'Coordinates are not valid numbers' };
  }

  if (latitude < -90 || latitude > 90) {
    return { isValid: false, message: `Latitude ${latitude} is out of bounds (-90 to 90)` };
  }

  if (longitude < -180 || longitude > 180) {
    return { isValid: false, message: `Longitude ${longitude} is out of bounds (-180 to 180)` };
  }

  // Never allow [0, 0] (Null Island) as a real address location
  if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
    return { isValid: false, message: 'Coordinates [0, 0] cannot be used as a valid location' };
  }

  return { isValid: true, latitude, longitude };
};

/**
 * Geocode via OpenStreetMap Nominatim API
 */
const geocodeWithNominatim = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&addressdetails=1&limit=1&countrycodes=in`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'LegalMetrology-VerificationSystem/1.0 (sih26036-legal-metrology@gov.in)',
      'Accept-Language': 'en',
    },
  });

  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed with HTTP status ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    // If full address was too strict, try fallback query with city, district, state, and pincode
    return null;
  }

  const result = data[0];
  const validation = validateCoordinates(result.lat, result.lon);

  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  return {
    latitude: validation.latitude,
    longitude: validation.longitude,
    coordinates: [validation.longitude, validation.latitude], // GeoJSON order: [lng, lat]
    formattedAddress: result.display_name,
    provider: 'nominatim',
    raw: result.address,
  };
};

/**
 * Geocode via Google Maps Geocoding API
 */
const geocodeWithGoogle = async (query, apiKey) => {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Google geocoding failed with status ${response.status}`);
  }

  const data = await response.json();
  if (data.status !== 'OK' || !data.results || data.results.length === 0) {
    return null;
  }

  const result = data.results[0];
  const loc = result.geometry.location;
  const validation = validateCoordinates(loc.lat, loc.lng);

  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  return {
    latitude: validation.latitude,
    longitude: validation.longitude,
    coordinates: [validation.longitude, validation.latitude], // GeoJSON order: [lng, lat]
    formattedAddress: result.formatted_address,
    provider: 'google',
  };
};

/**
 * Main abstract geocode function
 * Converts address (string or object) to { latitude, longitude, coordinates: [lng, lat], formattedAddress }
 */
const geocodeAddress = async (addressInput) => {
  if (!addressInput) {
    throw new Error('Please provide an address to locate');
  }

  const addressQuery = buildAddressString(addressInput);
  if (!addressQuery || addressQuery.trim().length < 3) {
    throw new Error('Address is too short or empty');
  }

  const provider = (process.env.GEOCODING_PROVIDER || 'nominatim').toLowerCase();
  const apiKey = process.env.GEOCODING_API_KEY;

  let result = null;

  try {
    if (provider === 'google' && apiKey) {
      result = await geocodeWithGoogle(addressQuery, apiKey);
    } else {
      // Default: Nominatim
      result = await geocodeWithNominatim(addressQuery);

      // Fallback query if very specific local street was not found in Nominatim
      if (!result && typeof addressInput === 'object') {
        const relaxedParts = [
          addressInput.locality || addressInput.landmark,
          addressInput.city,
          addressInput.district,
          addressInput.state,
          addressInput.pincode,
          'India',
        ].filter(Boolean);

        if (relaxedParts.length > 2) {
          result = await geocodeWithNominatim(relaxedParts.join(', '));
        }

        // Second fallback: district, state, pincode
        if (!result && (addressInput.district || addressInput.city)) {
          const minimalParts = [
            addressInput.district || addressInput.city,
            addressInput.state,
            addressInput.pincode,
            'India',
          ].filter(Boolean);
          result = await geocodeWithNominatim(minimalParts.join(', '));
        }
      }
    }
  } catch (err) {
    console.error('[Geocoding Error]:', err.message);
    throw new Error(`Geocoding failed: ${err.message}`);
  }

  if (!result) {
    throw new Error(`Unable to locate address: "${addressQuery}". Please check city, district, or PIN code.`);
  }

  return result;
};

/**
 * Reverse Geocode: [lat, lng] -> formatted address
 */
const reverseGeocode = async (latitude, longitude) => {
  const validation = validateCoordinates(latitude, longitude);
  if (!validation.isValid) {
    throw new Error(validation.message);
  }

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${validation.latitude}&lon=${validation.longitude}&zoom=18&addressdetails=1`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LegalMetrology-VerificationSystem/1.0 (sih26036-legal-metrology@gov.in)',
      },
    });

    if (!response.ok) {
      throw new Error(`Reverse geocoding failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      latitude: validation.latitude,
      longitude: validation.longitude,
      coordinates: [validation.longitude, validation.latitude],
      formattedAddress: data.display_name || `${validation.latitude}, ${validation.longitude}`,
      address: data.address || {},
    };
  } catch (err) {
    return {
      latitude: validation.latitude,
      longitude: validation.longitude,
      coordinates: [validation.longitude, validation.latitude],
      formattedAddress: `${validation.latitude.toFixed(6)}, ${validation.longitude.toFixed(6)}`,
    };
  }
};

module.exports = {
  geocodeAddress,
  reverseGeocode,
  validateCoordinates,
  buildAddressString,
};
