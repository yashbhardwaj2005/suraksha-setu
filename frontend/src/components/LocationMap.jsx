import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function LocationMap({ latitude, longitude, accuracy = 0, label = 'Last shared location' }) {
  const point = [latitude, longitude];
  return <div className="location-map" role="region" aria-label={label}><MapContainer key={point.join(',')} center={point} zoom={accuracy > 2000 ? 11 : 15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" /><Circle center={point} radius={accuracy} pathOptions={{ color: '#087f74', fillOpacity: 0.08, weight: 1 }} /><CircleMarker center={point} radius={9} pathOptions={{ color: '#fff', fillColor: '#087f74', fillOpacity: 1, weight: 3 }}><Popup>{label}</Popup></CircleMarker></MapContainer></div>;
}

export default LocationMap;
