export interface Coordinates {
  lat: number;
  lng: number;
}

export const hasValidCoordinates = (coordinates?: Coordinates | null) => {
  if (!coordinates) return false;
  const { lat, lng } = coordinates;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

export const buildGoogleMapsNavigationUrl = (
  destination: Coordinates,
  origin?: Coordinates
) => {
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat},${destination.lng}`,
    travelmode: 'driving',
    dir_action: 'navigate',
  });

  if (origin && hasValidCoordinates(origin)) {
    params.set('origin', `${origin.lat},${origin.lng}`);
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
};

export const openGoogleMapsNavigation = (
  destination: Coordinates,
  options: {
    origin?: Coordinates | null;
    label?: string;
    onMissingDestination?: () => void;
  } = {}
) => {
  if (!hasValidCoordinates(destination)) {
    options.onMissingDestination?.();
    return;
  }

  const openMaps = (origin?: Coordinates | null) => {
    const url = buildGoogleMapsNavigationUrl(
      destination,
      hasValidCoordinates(origin) ? origin : undefined
    );
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.href = url;
    }
  };

  if (hasValidCoordinates(options.origin)) {
    openMaps(options.origin);
    return;
  }

  if (!navigator.geolocation) {
    openMaps();
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      openMaps({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    () => {
      if (options.label) {
        console.warn(`Opening Google Maps without origin for ${options.label}`);
      }
      openMaps();
    },
    { enableHighAccuracy: true, timeout: 7000, maximumAge: 30000 }
  );
};
