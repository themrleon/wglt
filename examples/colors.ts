
import {fromHsv} from '../src/color';
import {Terminal} from '../src/terminal';

const WIDTH = 80;
const HEIGHT = 45;

const term = new Terminal(document.querySelector('canvas') as HTMLCanvasElement, WIDTH, HEIGHT);
let hue = 0;

term.update = function () {
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const sat = x / WIDTH;
            const val = 1.0 - (y / HEIGHT);
            term.drawChar(x, y, 0, 0, fromHsv(hue, sat, val));
        }
    }
    hue += 0.001;
};