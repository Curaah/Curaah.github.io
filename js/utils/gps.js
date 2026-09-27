// GPS utilities. Nothing else.

// Returns { lat, lng } or null if unavailable / denied.
function getCurrentPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()    => resolve(null),
      { timeout: 8000, maximumAge: 60000 },
    );
  });
}

// Straight-line distance in kilometres between two GPS coordinates.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180)
    * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Human-readable distance: "800m" or "2.4 km"
function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${Math.round(km * 10) / 10} km`;
}
