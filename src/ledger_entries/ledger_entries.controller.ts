import { Controller, Get, Query } from '@nestjs/common';
import { LedgerEntriesService } from './ledger_entries.service';
import { LedgerEntry } from './entities/ledger_entry.entity';

@Controller('ledger_entries')
export class LedgerEntriesController {
  constructor(private readonly ledgerEntriesService: LedgerEntriesService) {}

  @Get()
  async getLedgerEntries(
    @Query('merchant_id') merchantId: string,
  ): Promise<LedgerEntry[]> {
    return this.ledgerEntriesService.findByMerchant(merchantId);
  }
}
