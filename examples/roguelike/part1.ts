
import { Colors } from '../../src/colors';
import { Keys } from '../../src/keys';
import { Terminal } from '../../src/terminal';

// Actual size of the window
const SCREEN_WIDTH = 80;
const SCREEN_HEIGHT = 45;

function handleKeys() {
    if (term.isKeyPressed(Keys.VK_UP)) {
        y--;
    }
    if (term.isKeyPressed(Keys.VK_LEFT)) {
        x--;
    }
    if (term.isKeyPressed(Keys.VK_RIGHT)) {
        x++;
    }
    if (term.isKeyPressed(Keys.VK_DOWN)) {
        y++;
    }
}

function renderAll() {
    term.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, 0, Colors.YELLOW, Colors.DARK_BLUE)
    term.drawString(1, 1, 'Hello world!');
    term.drawString(1, 3, 'Use arrow keys to move');
    term.drawString(x, y, '@');
}

const term = new Terminal(document.querySelector('canvas') as HTMLCanvasElement, SCREEN_WIDTH, SCREEN_HEIGHT);

let x = 10;
let y = 10;

term.update = function () {
    handleKeys();
    renderAll();
};
