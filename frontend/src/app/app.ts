import { Component } from '@angular/core';
import { Transcriber } from './components/transcriber/transcriber';

@Component({
  selector: 'app-root',
  imports: [Transcriber],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
