import L from "leaflet";

// Fix Leaflet default icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export const busIcon = L.divIcon({
  html: `<div style="background:#4f46e5;color:#fff;padding:6px 10px;border-radius:9999px;font-size:11px;font-weight:600;box-shadow:0 2px 6px rgba(0,0,0,0.2);white-space:nowrap;">🚌</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

export default L;
