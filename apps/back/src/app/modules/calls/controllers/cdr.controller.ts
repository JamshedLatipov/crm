import { Controller, Get, Param, Query, Post, Body } from '@nestjs/common';
import { CdrService, CdrFilterDto } from '../services/cdr.service';
import { SaveCallLogDto } from '../dto/save-call-log.dto';
import { ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Cdr } from '../entities/cdr.entity';

@ApiTags('CDR')
@Controller('cdr')
export class CdrController {
  constructor(private readonly cdrService: CdrService) {}

  @Get()
  @ApiOperation({ summary: 'List CDR records with filtering & pagination' })
  @ApiQuery({ name: 'fromDate', required: false })
  @ApiQuery({ name: 'toDate', required: false })
  @ApiQuery({ name: 'src', required: false })
  @ApiQuery({ name: 'dst', required: false })
  @ApiQuery({ name: 'disposition', required: false, description: 'Single disposition or multiple via repeated query param (not array JSON)' })
  @ApiQuery({ name: 'minDuration', required: false, type: Number })
  @ApiQuery({ name: 'maxDuration', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'operatorId', required: false, description: 'Filter by operator id (matches channel or src/dst)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiOkResponse({ description: 'Paged result', schema: { properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Cdr' } }, total: { type: 'number' }, page: { type: 'number' }, limit: { type: 'number' } } } })
  list(@Query() query: CdrFilterDto) {
    return this.cdrService.find(query);
  }

  @Get('by-src/:src')
  @ApiOperation({ summary: 'Filter by source number' })
  @ApiOkResponse({ type: Object })
  bySrc(@Param('src') src: string, @Query() q: CdrFilterDto) {
    return this.cdrService.find({ ...q, src });
  }

  @Get('by-dst/:dst')
  @ApiOperation({ summary: 'Filter by destination number' })
  byDst(@Param('dst') dst: string, @Query() q: CdrFilterDto) {
    return this.cdrService.find({ ...q, dst });
  }

  @Get('by-disposition/:disp')
  @ApiOperation({ summary: 'Filter by disposition' })
  byDisposition(@Param('disp') disposition: string, @Query() q: CdrFilterDto) {
    return this.cdrService.find({ ...q, disposition });
  }

  @Get('unique/:id')
  @ApiOperation({ summary: 'Get single CDR by uniqueid' })
  @ApiOkResponse({ type: Cdr, description: 'Single CDR (nullable if not found)' })
  one(@Param('id') id: string) {
    return this.cdrService.findOne(id);
  }

  @Post('log')
  async saveLog(@Body() body: SaveCallLogDto) {
    const rec = await this.cdrService.createCallLog({
      callId: body.callId ?? null,
      note: body.note ?? null,
      callType: body.callType ?? null,
      scriptBranch: body.scriptBranch ?? null,
      duration: typeof body.duration === 'number' ? body.duration : null,
      disposition: body.disposition ?? null,
    });
    return { ok: true, id: rec.id };
  }
}
