import {useEffect, useCallback} from 'react';
import {
    GoogleMap,
    Circle,
    Polyline,
    TrafficLayer,
    useJsApiLoader,
    OverlayView,
    OverlayViewF,
} from '@react-google-maps/api';
import {useSimStore} from '../store/simStore';
import {MAP_CENTER, COVERAGE_ZONES} from '../data/locations';
import {getRoute} from '../utils/directionsServices';
import type {Ambulance, Incident} from '@sacs/shared-types';

// ─── Constants ────────────────────────────────────────────────────────────────

const MAP_CONTAINER_STYLE = {width: '100%', height: '100%'};
const GOOGLE_MAPS_LIBRARIES: ['places'] = ['places'];

const STATUS_COLORS: Record<Ambulance['status'], string> = {
    idle: '#34d399',
    en_route: '#fbbf24',
    on_scene: '#f97316',
    transporting: '#f87171',
    returning: '#60a5fa',
    on_break: '#94a3b8',
};

const PRIORITY_COLORS: Record<Incident['priority'], string> = {
    critical: '#ef4444',
    urgent: '#f59e0b',
    standard: '#38bdf8',
};

const MAP_STYLES: google.maps.MapTypeStyle[] = [
    {elementType: 'geometry', stylers: [{color: '#0d1825'}]},
    {elementType: 'labels.text.stroke', stylers: [{color: '#0d1825'}]},
    {elementType: 'labels.text.fill', stylers: [{color: '#7f93a6'}]},
    {featureType: 'road', elementType: 'geometry', stylers: [{color: '#1a2e42'}]},
    {featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#223a50'}]},
    {featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{color: '#1a2e42'}]},
    {featureType: 'water', elementType: 'geometry', stylers: [{color: '#071018'}]},
    {featureType: 'poi', stylers: [{visibility: 'off'}]},
    {featureType: 'transit', stylers: [{visibility: 'off'}]},
    {featureType: 'administrative', elementType: 'geometry', stylers: [{color: '#263340'}]},
    {featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{color: '#4a6070'}]},
];

// ─── MapView ──────────────────────────────────────────────────────────────────

interface MapViewProps {
    showTraffic: boolean;
}

export default function MapView({showTraffic}: MapViewProps) {
    const ambulances = useSimStore((s) => s.ambulances);
    const incidents = useSimStore((s) => s.incidents);
    const trafficModel = useSimStore((s) => s.trafficModel);

    const {isLoaded, loadError} = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES,
    });

    // Upgrade straight-line routes to real road routes after dispatch
    const upgradeRoutes = useCallback(async () => {
        for (const amb of ambulances) {
            if (amb.routePath.length !== 2) continue;
            if (amb.routeSource !== 'fallback_no_sdk' && amb.routeSource !== undefined) continue;
            if (amb.status !== 'en_route' && amb.status !== 'returning' && amb.status !== 'transporting') continue;

            const origin = amb.routePath[0];
            const destination = amb.routePath[1];
            if (!origin || !destination) continue;

            const result = await getRoute(origin, destination, trafficModel);
            if (result.source === 'cache' || result.source === 'api') {
                useSimStore.setState((state) => ({
                    ambulances: state.ambulances.map((a) =>
                        a.id === amb.id
                            ? {...a, routePath: result.path, routeSource: result.source}
                            : a,
                    ),
                }));
            }
        }
    }, [ambulances, trafficModel]);

    useEffect(() => {
        if (!isLoaded) return;
        void upgradeRoutes();
    }, [isLoaded, upgradeRoutes]);

    if (loadError) {
        return (
            <div className="map-placeholder" data-testid="map-error">
                <span className="map-placeholder__icon">⚠️</span>
                <span>Error loading Google Maps. Check your API key.</span>
            </div>
        );
    }

    if (!isLoaded) {
        return (
            <div className="map-placeholder">
                <span className="map-placeholder__icon">🗺</span>
                <span>Loading map...</span>
            </div>
        );
    }

    return (
        <GoogleMap
            mapContainerStyle={MAP_CONTAINER_STYLE}
            center={MAP_CENTER}
            zoom={11}
            options={{
                styles: MAP_STYLES,
                disableDefaultUI: true,
                zoomControl: true,
                gestureHandling: 'greedy',
                backgroundColor: '#0d1825',
            }}
        >
            {showTraffic && <TrafficLayer/>}

            {/* ── Coverage zones ── */}
            {COVERAGE_ZONES.map((zone) => (
                <Circle
                    key={zone.id}
                    center={zone.center}
                    radius={600}
                    options={{
                        fillColor: '#38bdf8',
                        fillOpacity: 0.06,
                        strokeColor: '#38bdf8',
                        strokeOpacity: 0.3,
                        strokeWeight: 1,
                    }}
                />
            ))}

            {/* ── Ambulance coverage radii ── */}
            {ambulances.map((amb) => (
                <Circle
                    key={`cov-${amb.id}`}
                    center={amb.position}
                    radius={amb.coverageRadiusMeters}
                    options={{
                        fillColor: STATUS_COLORS[amb.status],
                        fillOpacity: 0.04,
                        strokeColor: STATUS_COLORS[amb.status],
                        strokeOpacity: 0.2,
                        strokeWeight: 1,
                    }}
                />
            ))}

            {/* ── Routes ── */}
            {ambulances
                .filter((a) => a.routePath.length > 1)
                .map((amb) => (
                    <Polyline
                        key={`route-${amb.id}`}
                        path={[...amb.routePath]}
                        options={{
                            strokeColor: STATUS_COLORS[amb.status],
                            strokeOpacity: 0.85,
                            strokeWeight: 3,
                        }}
                    />
                ))}

            {/* ── Ambulances ── */}
            {ambulances.map((amb) => (
                <OverlayViewF
                    key={amb.id}
                    position={amb.position}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                >
                    <div
                        title={`${amb.callSign} — ${amb.status}`}
                        style={{
                            background:    STATUS_COLORS[amb.status],
                            border:        '2.5px solid #0d1825',
                            borderRadius:  '50%',
                            width:         28,
                            height:        28,
                            display:       'flex',
                            alignItems:    'center',
                            justifyContent:'center',
                            fontSize:      9,
                            fontFamily:    'monospace',
                            fontWeight:    'bold',
                            color:         '#0d1825',
                            transform:     'translate(-50%, -50%)',
                            cursor:        'pointer',
                            boxShadow:     '0 2px 6px rgba(0,0,0,0.5)',
                            userSelect:    'none',
                        }}
                    >
                        {amb.callSign.replace('SEM-', '')}
                    </div>
                </OverlayViewF>
            ))}

            {/* ── Incidents ── */}
            {incidents
                .filter((i) => i.status !== 'resolved')
                .map((inc) => (
                    <OverlayViewF
                        key={inc.id}
                        position={inc.position}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    >
                        <div
                            title={inc.label}
                            style={{
                                width:         16,
                                height:        16,
                                background:    PRIORITY_COLORS[inc.priority],
                                border:        '2px solid #0d1825',
                                borderRadius:  '3px',
                                transform:     'translate(-50%, -50%) rotate(45deg)',
                                boxShadow:     '0 2px 6px rgba(0,0,0,0.5)',
                                cursor:        'pointer',
                            }}
                        />
                    </OverlayViewF>
                ))}
        </GoogleMap>
    );
}