export type Sport = "ride" | "run" | "swim" | "triathlon";

export interface ActivityData {
  athlete_name: string;
  avg_heart_rate?: number;
  avg_pace_min_per_km?: string;
  avg_pace_per_100m?: string;
  avg_speed_kmh?: number;
  date: string;
  distance_km: number;
  duration: string;
  elevation_gain_m?: number;
  location: string;
  ride_name: string;
  sport: Sport;
}

export const SAMPLE_RIDE: ActivityData = {
  sport: "ride",
  ride_name: "Saturday in the Elbsandstein",
  date: "May 18, 2026",
  location: "Sächsische Schweiz, Germany",
  athlete_name: "Manuel",
  distance_km: 87.3,
  duration: "3h 42m",
  elevation_gain_m: 1240,
  avg_speed_kmh: 23.6,
  avg_heart_rate: 142,
};

export const SAMPLE_RUN: ActivityData = {
  sport: "run",
  ride_name: "Föhrer Westwind",
  date: "April 27, 2026",
  location: "Föhr, North Sea",
  athlete_name: "Manuel",
  distance_km: 18.4,
  duration: "1h 32m",
  elevation_gain_m: 86,
  avg_pace_min_per_km: "4:59",
  avg_heart_rate: 158,
};
