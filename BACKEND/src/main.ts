import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:3000', // jahan tumhara frontend chal raha hai
  });
  
  await app.listen(4000);
}
bootstrap();
