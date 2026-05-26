import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { MapPlaceholder } from './MapPlaceholder';

type MapPoint = {
  id: string;
  name: string;
  lat?: number | string | null;
  lng?: number | string | null;
  address?: string | null;
};

type GoogleMapProps = {
  points?: MapPoint[];
  keyword?: string;
  label?: string;
  className?: string;
};

type MapStatus = 'idle' | 'loading' | 'ready' | 'missing-key' | 'error';

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (container: HTMLElement, options: GoogleMapOptions) => GoogleMapInstance;
        Marker: new (options: GoogleMarkerOptions) => GoogleMarkerInstance;
        InfoWindow: new (options: GoogleInfoWindowOptions) => GoogleInfoWindowInstance;
        LatLngBounds: new () => GoogleLatLngBounds;
        places?: {
          PlacesService: new (container: HTMLDivElement | GoogleMapInstance) => GooglePlacesService;
          PlacesServiceStatus: {
            OK: string;
          };
        };
      };
    };
    __oddtripGoogleMapsPromise?: Promise<void>;
    __oddtripInitGoogleMaps?: () => void;
    gm_authFailure?: () => void;
  }
}

type GoogleLatLngLiteral = { lat: number; lng: number };

interface GoogleMapOptions {
  center: GoogleLatLngLiteral;
  zoom: number;
  mapTypeControl?: boolean;
  streetViewControl?: boolean;
  fullscreenControl?: boolean;
}

interface GoogleMapInstance {
  setCenter: (latlng: GoogleLatLngLiteral) => void;
  fitBounds: (bounds: GoogleLatLngBounds) => void;
}

interface GoogleMarkerOptions {
  map?: GoogleMapInstance;
  position: GoogleLatLngLiteral;
  title?: string;
}

interface GoogleMarkerInstance {}

interface GoogleInfoWindowOptions {
  content: string;
}

interface GoogleInfoWindowInstance {
  open: (options: { map: GoogleMapInstance; anchor: GoogleMarkerInstance }) => void;
}

interface GoogleLatLngBounds {
  extend: (latlng: GoogleLatLngLiteral) => void;
}

type GooglePlaceResult = {
  name?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

interface GooglePlacesService {
  textSearch: (
    request: { query: string },
    callback: (results: GooglePlaceResult[] | null, status: string) => void,
  ) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const DEFAULT_CENTER = { lat: 37.566826, lng: 126.9786567 };

export function GoogleMap({ points = [], keyword, label = '지도 영역', className = '' }: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<MapStatus>('idle');
  const [message, setMessage] = useState('');

  const normalizedPoints = useMemo(
    () => points.map(normalizePoint).filter((point): point is NormalizedPoint => Boolean(point)),
    [points],
  );

  useEffect(() => {
    let cancelled = false;

    async function renderMap() {
      if (!GOOGLE_MAPS_API_KEY) {
        setStatus('missing-key');
        return;
      }

      if (!containerRef.current) return;

      setStatus('loading');

      try {
        window.gm_authFailure = () => {
          if (cancelled) return;
          setStatus('error');
          setMessage('지도를 불러올 권한을 확인하지 못했습니다. Google 지도 키 설정을 확인하세요.');
          console.error('[OddTrip] Google Maps auth failed. Check VITE_GOOGLE_MAPS_API_KEY, Maps JavaScript API, billing, and HTTP referrer restrictions.');
        };
        await loadGoogleMapsSdk(GOOGLE_MAPS_API_KEY);
        if (cancelled || !containerRef.current || !window.google?.maps) return;

        const maps = window.google.maps;
        const center = normalizedPoints[0] ?? DEFAULT_CENTER;
        const map = new maps.Map(containerRef.current, {
          center,
          zoom: normalizedPoints.length > 1 ? 12 : 14,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        if (normalizedPoints.length) {
          const bounds = new maps.LatLngBounds();
          normalizedPoints.forEach((point) => {
            bounds.extend({ lat: point.lat, lng: point.lng });
            const marker = new maps.Marker({
              map,
              position: { lat: point.lat, lng: point.lng },
              title: point.name,
            });
            const info = new maps.InfoWindow({
              content: `<div style="padding:8px 10px;font-size:12px;font-weight:700;white-space:nowrap;">${escapeHtml(point.name)}</div>`,
            });
            info.open({ map, anchor: marker });
          });
          if (normalizedPoints.length > 1) map.fitBounds(bounds);
          setStatus('ready');
          return;
        }

        if (keyword && maps.places) {
          const service = new maps.places.PlacesService(containerRef.current);
          service.textSearch({ query: keyword }, (results, searchStatus) => {
            if (cancelled || !window.google?.maps) return;
            const place = results?.[0];
            const location = place?.geometry?.location;
            if (searchStatus !== window.google.maps.places?.PlacesServiceStatus.OK || !location) {
              setStatus('error');
              setMessage('장소 검색 결과가 없습니다.');
              return;
            }

            const position = { lat: location.lat(), lng: location.lng() };
            map.setCenter(position);
            const marker = new window.google.maps.Marker({
              map,
              position,
              title: place.name,
            });
            const info = new window.google.maps.InfoWindow({
              content: `<div style="padding:8px 10px;font-size:12px;font-weight:700;white-space:nowrap;">${escapeHtml(place.name ?? keyword)}</div>`,
            });
            info.open({ map, anchor: marker });
            setStatus('ready');
          });
          return;
        }

        setStatus('ready');
      } catch (error) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Google Maps를 불러오지 못했습니다. 지도 키와 허용 주소 설정을 확인하세요.');
          console.error('[OddTrip] Failed to load Google Maps SDK:', error);
        }
      }
    }

    void renderMap();

    return () => {
      cancelled = true;
    };
  }, [keyword, normalizedPoints]);

  if (status === 'missing-key') {
    return <MapPlaceholder label={`${label} · 지도 키 필요`} />;
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-white/70 bg-white/70 shadow-soft ${className}`}>
      <div ref={containerRef} className="aspect-[4/3] min-h-56 w-full" aria-label={label} />
      {status === 'loading' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/75 text-sm font-bold text-slate-700">
          지도를 불러오는 중입니다
        </div>
      ) : null}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-white/85 p-4 text-center">
          <div>
            <MapPin className="mx-auto mb-2 h-7 w-7 text-brand-700" />
            <p className="text-sm font-bold text-slate-700">{message || '지도 표시를 실패했습니다.'}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type NormalizedPoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

function normalizePoint(point: MapPoint): NormalizedPoint | null {
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    id: point.id,
    name: point.name,
    lat,
    lng,
  };
}

function loadGoogleMapsSdk(appKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (window.__oddtripGoogleMapsPromise) return window.__oddtripGoogleMapsPromise;

  window.__oddtripGoogleMapsPromise = new Promise((resolve, reject) => {
    window.__oddtripInitGoogleMaps = () => resolve();

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(appKey)}&libraries=places&loading=async&callback=__oddtripInitGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps SDK.'));
    document.head.appendChild(script);
  });

  return window.__oddtripGoogleMapsPromise;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
