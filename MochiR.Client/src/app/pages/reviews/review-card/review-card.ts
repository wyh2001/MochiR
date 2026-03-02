import { Component, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReviewSummaryDto } from '../../../api/models/review-summary-dto';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './review-card.html',
})
export class ReviewCard {
  readonly review = input.required<ReviewSummaryDto>();
}
