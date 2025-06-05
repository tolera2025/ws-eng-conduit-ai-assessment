import { Component, OnInit } from '@angular/core';
import { RosterService } from './roster.service';
import { RosterItem } from './roster.models';

@Component({
  selector: 'realworld-roster',
  templateUrl: './roster.component.html',
  styleUrls: [],
  providers: [],
  imports: [],
  standalone: true,
})
export class RosterComponent implements OnInit {
  rosterItems: RosterItem[] = [];

  constructor(private rosterService: RosterService) {}

  ngOnInit() {
    this.rosterService.getRoster().subscribe({
      next: (data: RosterItem[]) => {
        this.rosterItems = data;
      },
      error: (err) => console.error('Error fetching roster:', err),
    });
  }
}
