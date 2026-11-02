import { Module } from "@nestjs/common";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { GatewayExceptionFilter } from "./common/filters/gateway-exception.filter";
import { RequestIdInterceptor } from "./common/interceptors/request-id.interceptor";
import {
  CHANNEL_PROVIDERS,
  ChannelProviderFactory,
} from "./factory/channel-provider.factory";
import { ChannelManagerController } from "./controllers/channel-manager.controller";
import { ChannelManagerService } from "./services/channel-manager.service";
import { DjuboChannelProvider } from "./providers/djubo/djubo-channel.provider";
import { DjuboModule } from "./providers/djubo/djubo.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    DjuboModule,
  ],
  controllers: [ChannelManagerController],
  providers: [
    ChannelManagerService,
    ChannelProviderFactory,
    {
      provide: CHANNEL_PROVIDERS,
      useFactory: (djubo: DjuboChannelProvider) => [djubo],
      inject: [DjuboChannelProvider],
    },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_FILTER, useClass: GatewayExceptionFilter },
  ],
})
export class AppModule {}
