import { Body, Controller, Param, Post } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CreateRefundDto } from './dto/create-refund.dto';

@Controller('refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  createRefund(@Body() body: CreateRefundDto) {
    return this.refundsService.createRefund(
      body.payment_id,
      body.amount,
      body.reason,
    );
  }

  @Post(':id/complete')
  completeRefund(@Param('id') id: string) {
    return this.refundsService.completeRefund(id);
  }
}
