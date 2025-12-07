import { Injectable, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeocodingService {
  constructor(private readonly http: HttpService) {}

  async geocodeCity(city: string) {
    const url = 'https://geocoding-api.open-meteo.com/v1/search';

    const { data } = await firstValueFrom(
      this.http.get(url, {
        params: {
          name: city,
          count: 1,
        },
      }),
    );

    if (!data.results || data.results.length === 0) {
      throw new NotFoundException(`No location found for city: ${city}`);
    }

    const result = data.results[0];

    return {
      latitude: result.latitude,
      longitude: result.longitude,
      displayName: result.name,
    };
  }
}
