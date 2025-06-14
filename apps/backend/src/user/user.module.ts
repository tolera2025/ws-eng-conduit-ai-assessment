// apps/backend/src/user/user.module.ts
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';
import { UserController } from './user.controller';
import { User } from './user.entity';
import { UserService } from './user.service';
import { MikroOrmModule } from '@mikro-orm/nestjs';

@Module({
  controllers: [UserController],
  imports: [MikroOrmModule.forFeature({ entities: [User] })], // Provides EntityRepository<User> internally
  providers: [UserService],
  exports: [
    UserService,      // Export UserService if other modules need it
    MikroOrmModule    // <<<< ADD THIS LINE TO EXPORT REPOSITORY PROVIDERS
  ],
})
export class UserModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'user', method: RequestMethod.GET }, { path: 'user', method: RequestMethod.PUT });
  }
}
