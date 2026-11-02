import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(false);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}

bootstrap();
