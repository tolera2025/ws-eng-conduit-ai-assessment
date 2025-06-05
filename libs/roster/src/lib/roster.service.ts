import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RosterItem } from './roster.models';

@Injectable({
  providedIn: 'root',
})
export class RosterService {
  constructor(private http: HttpClient) {}

  getRoster(): Observable<RosterItem[]> {
    return this.http.get<RosterItem[]>('/api/users/roster');
  }
}
