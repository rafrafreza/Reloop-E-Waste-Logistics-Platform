import { useState, useRef, useMemo, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapEffect({ searchQuery }) {
  const map = useMap();
  
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 3) return;
    
    const timeout = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`)
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            map.flyTo([data[0].lat, data[0].lon], 12, { animate: true, duration: 1.5 });
          }
        })
        .catch(err => console.error("Geocoding failed", err));
    }, 1000); // debounce typing
    
    return () => clearTimeout(timeout);
  }, [searchQuery, map]);
  
  return null;
}

function LocationMarker({ position, setPosition, onAddressFound }) {
  const markerRef = useRef(null);

  const reverseGeocode = async (lat, lng) => {
    if (!onAddressFound) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      if (data && data.address) {
        onAddressFound(data.address);
      }
    } catch(err) {
      console.error(err);
    }
  };

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      reverseGeocode(e.latlng.lat, e.latlng.lng);
    },
  });

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latlng = marker.getLatLng();
          setPosition(latlng);
          reverseGeocode(latlng.lat, latlng.lng);
        }
      },
    }),
    [setPosition, onAddressFound]
  );

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
}

export default function MapPicker({ lat, lng, onChange, onAddressFound, searchQuery }) {
  const defaultCenter = { lat: 20.5937, lng: 78.9629 };
  const initialPosition = lat && lng ? { lat, lng } : null;
  const center = initialPosition || defaultCenter;
  
  const [position, setPosition] = useState(initialPosition);

  useEffect(() => {
    if (position) {
      onChange(position.lat, position.lng);
    }
  }, [position, onChange]);

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl border border-ink/10 relative z-0">
      <MapContainer center={center} zoom={initialPosition ? 15 : 4} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapEffect searchQuery={searchQuery} />
        <LocationMarker position={position} setPosition={setPosition} onAddressFound={onAddressFound} />
      </MapContainer>
      {!position && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-white px-4 py-2 rounded-full shadow-lg text-sm font-medium text-ink whitespace-nowrap">
          Click on the map to drop a pin
        </div>
      )}
    </div>
  );
}
