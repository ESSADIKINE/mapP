export type PlaceCategory = 'Principal' | 'Secondary' | 'Other';

export interface PlaceFooterInfo {
  location?: string;
  distance?: string;
  time?: string;
}

export interface Place {
  _id?: string;
  name: string;
  latitude: number;
  longitude: number;
  virtualtour?: string;
  tourUrl?: string;
  googleMapsUrl?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  description?: string;
  placeType?: string;
  zoom?: number;
  bounds?: number[][];
  heading?: number;
  category: PlaceCategory;
  routesFromBase?: string[];
  footerInfo?: PlaceFooterInfo;
}

export interface Project {
  _id?: string;
  title: string;
  logoUrl?: string;
  description?: string;
  styleURL?: string;
  principal: Place;
  secondaries: Place[];
}

export interface RouteSummary {
  distance: string;
  duration: string;
}

export interface ActiveRoute {
  id: string;
  geometry: GeoJSON.LineString;
  summary: RouteSummary;
}
