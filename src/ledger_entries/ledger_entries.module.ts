import { Module } from '@nestjs/common';
import { LedgerEntriesService } from './ledger_entries.service';
import { LedgerEntriesController } from './ledger_entries.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LedgerEntry } from './entities/ledger_entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LedgerEntry])],
  controllers: [LedgerEntriesController],
  providers: [LedgerEntriesService],
})
export class LedgerEntriesModule {}
