import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WeatherModule } from './weather/weather.module';
import { SoilModule } from './soil/soil.module';
import { GeocodingModule } from './geocoding/geocoding.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),  // <-- This loads .env
    WeatherModule, SoilModule,GeocodingModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
