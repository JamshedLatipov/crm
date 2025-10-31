import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallScriptsService } from './call-scripts.service';
import { CallScriptsController } from './call-scripts.controller';
import { CallScriptCategoryService } from './call-script-category.service';
import { CallScriptCategoryController } from './call-script-category.controller';
import { CallScript } from './entities/call-script.entity';
import { CallScriptCategory } from './entities/call-script-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CallScript, CallScriptCategory])],
  controllers: [CallScriptsController, CallScriptCategoryController],
  providers: [CallScriptsService, CallScriptCategoryService],
  exports: [CallScriptsService, CallScriptCategoryService],
})
export class CallScriptsModule {}