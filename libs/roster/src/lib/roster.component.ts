import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RosterService } from './roster.service';
import { RosterItem } from './roster.models';

@Component({
  selector: 'realworld-roster',
  templateUrl: './roster.component.html',
  styleUrls: ['./roster.component.css'],
  imports: [CommonModule, RouterModule],
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
      error: (err: any) => console.error('Error fetching roster:', err),
    });
  }
}
