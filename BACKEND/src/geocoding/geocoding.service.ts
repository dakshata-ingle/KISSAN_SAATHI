// src/geocoding/geocoding.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeocodingService {
  constructor(private readonly http: HttpService) {}

  /**
   * Geocode a free-text location string.
   * It can be "Pune", "Pune, Maharashtra, India", "Akola, Maharashtra" etc.
   */
  async geocodeCity(rawQuery: string) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search';

    // Break "Pune, Maharashtra, India" into parts
    const parts = rawQuery
      .split(',')
      .map(p => p.trim())
      .filter(Boolean);

    const candidates: string[] = [];

    // 1) full string: "Pune, Maharashtra, India"
    if (rawQuery && !candidates.includes(rawQuery)) {
      candidates.push(rawQuery);
    }

    // 2) just the first part: "Pune"
    if (parts[0] && !candidates.includes(parts[0])) {
      candidates.push(parts[0]);
    }

    // 3) first part + last part: "Pune, India"
    if (parts.length >= 2) {
      const cityCountry = `${parts[0]}, ${parts[parts.length - 1]}`;
      if (!candidates.includes(cityCountry)) {
        candidates.push(cityCountry);
      }
    }

    // Try each candidate until one returns results
    for (const name of candidates) {
      const { data } = await firstValueFrom(
        this.http.get(url, {
          params: {
            name,
            count: 1,
            language: 'en',
            format: 'json',
          },
        }),
      );

      if (data?.results && data.results.length > 0) {
        const result = data.results[0];

        const displayName = [
          result.name,
          result.admin1,
          result.country,
        ]
          .filter(Boolean)
          .join(', ');

        return {
          latitude: result.latitude,
          longitude: result.longitude,
          displayName,
        };
      }
    }

    // If none of the candidates worked, throw error
    throw new NotFoundException(
      `No location found for city: ${rawQuery}`,
    );
  }
}
