//---------
// Entry point of the application
//---------

import { Main } from './src/Main';

const main = new Main();

let debug: number = 0;
setInterval(() => {
    debug++;  // set breakpoint here to pause script
}, 1000);