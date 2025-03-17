//-----
// This example class allows the user to get a 'Hello World'
//-----

import { Main } from './Main';

export class ExampleClass {

  main: Main;

  constructor (main:Main) {

    this.main = main;
  }

  getServerStatusString(): string {

    return `The server status is: ${this.main.httpServer.getStatus()}.`;
  }
}