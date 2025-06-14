import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Tag } from './tag.entity';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';
// Assuming UserModule is not strictly needed for TagModule's core functionality (defining Tag entity and service)
// If TagService/Controller had direct dependencies on User providers, UserModule would be needed in imports.

@Module({
  imports: [
    MikroOrmModule.forFeature({ entities: [Tag] }), // Provides EntityRepository<Tag>
  ],
  controllers: [TagController],
  providers: [TagService],
  exports: [
    MikroOrmModule, // Exports the providers for EntityRepository<Tag>
    TagService,     // Exports TagService if other modules need it directly
  ],
})
export class TagModule {}
