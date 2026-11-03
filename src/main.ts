import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  app.setGlobalPrefix("api-gateway/v1", {
    exclude: ["health", "metrics"],
  });

  await app.listen(process.env.PORT ?? 8000);
}

bootstrap().catch((error: unknown) => {
  console.error("Application failed to start", error);
  process.exitCode = 1;
});
