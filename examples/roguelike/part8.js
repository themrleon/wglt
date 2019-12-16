
import {Colors} from '../../src/colors.js';
import {fromRgb} from '../../src/color.js';
import {GUI} from '../../src/gui.js';
import {Keys} from '../../src/keys.js';
import {MessageDialog} from '../../src/gui/messagedialog.js';
import {Rect} from '../../src/rect.js';
import {RNG} from '../../src/rng.js';
import {SelectDialog} from '../../src/gui/selectdialog.js';
import {Terminal} from '../../src/terminal.js';
import {TileMap} from '../../src/tilemap.js';

// Actual size of the window
const SCREEN_WIDTH = 80;
const SCREEN_HEIGHT = 50;

// Size of the map
const MAP_WIDTH = 80;
const MAP_HEIGHT = 43;

// Sizes and coordinates relevant for the GUI
const BAR_WIDTH = 20;
const PANEL_HEIGHT = 7;
const PANEL_Y = SCREEN_HEIGHT - PANEL_HEIGHT;
const MSG_X = BAR_WIDTH + 2;
const MSG_WIDTH = SCREEN_WIDTH - BAR_WIDTH - 2;
const MSG_HEIGHT = PANEL_HEIGHT - 1;

// Parameters for dungeon generator
const ROOM_MAX_SIZE = 10;
const ROOM_MIN_SIZE = 6;
const MAX_ROOMS = 30;
const MAX_ROOM_MONSTERS = 3;
const MAX_ROOM_ITEMS = 2;
const TORCH_RADIUS = 10;

// Spell values
const HEAL_AMOUNT = 4;

const COLOR_DARK_WALL = fromRgb(0, 0, 100);
const COLOR_LIGHT_WALL = fromRgb(130, 110, 50);
const COLOR_DARK_GROUND = fromRgb(50, 50, 150);
const COLOR_LIGHT_GROUND = fromRgb(200, 180, 50);

class Entity {
    constructor(x, y, char, name, color, blocks, components) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.name = name;
        this.color = color;
        this.blocks = !!blocks;

        if (components) {
            for (var property in components) {
                if (components.hasOwnProperty(property)) {
                    this[property] = components[property];
                    this[property].owner = this;
                }
            }
        }
    }

    move(dx, dy) {
        if (isBlocked(this.x + dx, this.y + dy)) {
            return;
        }
        this.x += dx;
        this.y += dy;
    }

    moveToward(targetX, targetY) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.hypot(dx, dy);
        this.move(Math.round(dx / distance), Math.round(dy / distance));
    }

    distanceTo(other) {
        return Math.hypot(other.x - this.x, other.y - this.y);
    }

    sendToBack() {
        this.remove();
        entities.unshift(this);
    }

    remove() {
        entities.splice(entities.indexOf(this), 1);
    }

    draw() {
        if (map.isVisible(this.x, this.y)) {
            term.drawString(this.x, this.y, this.char, this.color);
        }
    }
}

class Fighter {
    constructor(hp, defense, power, deathFunction) {
        this.owner = null;
        this.maxHp = hp;
        this.defense = defense;
        this.power = power;
        this.hp = hp;
        this.deathFunction = deathFunction || null;
    }

    attack(target) {
        const damage = this.power - target.fighter.defense;

        if (damage > 0) {
            addMessage(capitalize(this.owner.name) + ' attacks ' + target.name + ' for ' + damage + ' hit points.');
            target.fighter.takeDamage(damage);
        } else {
            addMessage(capitalize(this.owner.name) + ' attacks ' + target.name + ' but it has no effect!');
        }
    }

    takeDamage(damage) {
        this.hp -= damage;

        // Check for death. if there's a death function, call it
        if (this.hp <= 0) {
            this.hp = 0;
            if (this.deathFunction) {
                this.deathFunction(this.owner);
            }
        }
    }

    heal(amount) {
        this.hp = Math.min(this.hp + amount, this.maxHp);
    }
}

class BasicMonster {
    constructor() {
        this.owner = null;
    }

    takeTurn() {
        const monster = this.owner;

        // A basic monster takes its turn. if you can see it, it can see you
        if (map.isVisible(monster.x, monster.y)) {

            if (monster.distanceTo(player) >= 2) {
                // Move towards player if far away
                monster.moveToward(player.x, player.y);

            } else if (player.fighter.hp > 0) {
                // Close enough, attack! (if the player is still alive.)
                monster.fighter.attack(player);
            }
        }
    }
}

class Item {
    constructor(useFunction) {
        this.useFunction = useFunction;
    }

    pickUp() {
        if (inventory.length >= 26) {
            addMessage('Your inventory is full, cannot pick up ' + this.owner.name + '.', Colors.LIGHT_RED);
        } else {
            inventory.push(this.owner);
            this.owner.remove();
            addMessage('You picked up a ' + this.owner.name + '!', Colors.LIGHT_GREEN);
        }
    }

    use() {
        if (this.useFunction) {
            this.useFunction(this);
        } else {
            addMessage('The ' + this.owner.name + ' cannot be used.');
        }
    }

    remove() {
        inventory.splice(inventory.indexOf(this.owner), 1);
    }
}

function isBlocked(x, y) {
    // First test the map tile
    if (map.grid[y][x].blocked) {
        return true;
    }

    // Now check for any blocking objects
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.blocks && entity.x === x && entity.y === y) {
            return true;
        }
    }

    return false;
}

function createRoom(map, room) {
    for (let y = room.y + 1; y < room.y2; y++) {
        for (let x = room.x + 1; x < room.x2; x++) {
            map.grid[y][x].blocked = false;
            map.grid[y][x].blockSight = false;
        }
    }
}

function createHTunnel(map, x1, x2, y) {
    for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) {
        map.grid[y][x].blocked = false;
        map.grid[y][x].blockSight = false;
    }
}

function createVTunnel(map, y1, y2, x) {
    for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) {
        map.grid[y][x].blocked = false;
        map.grid[y][x].blockSight = false;
    }
}

function createMap() {
    const map = new TileMap(MAP_WIDTH, MAP_HEIGHT);
    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            map.grid[y][x].blocked = true;
            map.grid[y][x].blockSight = true;
        }
    }

    const rooms = [];

    for (let r = 0; r < MAX_ROOMS; r++) {
        // Random width and height
        const w = rng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);
        const h = rng.nextRange(ROOM_MIN_SIZE, ROOM_MAX_SIZE);

        // Random position without going out of the boundaries of the map
        const x = rng.nextRange(0, MAP_WIDTH - w - 1);
        const y = rng.nextRange(0, MAP_HEIGHT - h - 1);

        // "Rect" class makes rectangles easier to work with
        const newRoom = new Rect(x, y, w, h);

        // Run through the other rooms and see if they intersect with this one
        let failed = false;
        for (let j = 0; j < rooms.length; j++) {
            if (newRoom.intersects(rooms[j])) {
                failed = true;
                break;
            }
        }

        if (!failed) {
            // This means there are no intersections, so this room is valid

            // "paint" it to the map's tiles
            createRoom(map, newRoom);

            // Center coordinates of new room, will be useful later
            const center = newRoom.getCenter();

            if (rooms.length === 0) {
                // This is the first room, where the player starts at
                player.x = center.x;
                player.y = center.y;
            } else {
                // All rooms after the first:
                // Connect it to the previous room with a tunnel

                // Center coordinates of previous room
                const prev = rooms[rooms.length - 1].getCenter();

                // Draw a coin (random number that is either 0 or 1)
                if (rng.nextRange(0, 1) === 1) {
                    // First move horizontally, then vertically
                    createHTunnel(map, prev.x, center.x, prev.y);
                    createVTunnel(map, prev.y, center.y, center.x);
                } else {
                    // First move vertically, then horizontally
                    createVTunnel(map, prev.y, center.y, prev.x);
                    createHTunnel(map, prev.x, center.x, center.y);
                }
            }

            // Add some contents to this room, such as monsters
            placeObjects(newRoom);

            // Finally, append the new room to the list
            rooms.push(newRoom);
        }
    }

    return map;
}

function placeObjects(room) {
    // Choose random number of monsters
    const numMonsters = rng.nextRange(0, MAX_ROOM_MONSTERS);

    for (let i = 0; i < numMonsters; i++) {
        // Choose random spot for this monster
        const x = rng.nextRange(room.x + 1, room.x2 - 1);
        const y = rng.nextRange(room.y + 1, room.y2 - 1);
        let monster = null;

        // Only place it if the tile is not blocked
        // 80% chance of getting an orc
        if (rng.nextRange(0, 100) < 80) {
            // Create an orc
            const fighter = new Fighter(10, 0, 3, monsterDeath);
            const ai = new BasicMonster();
            monster = new Entity(x, y, 'o', 'orc', Colors.LIGHT_GREEN, true, { fighter: fighter, ai: ai });
        } else {
            // Create a troll
            const fighter = new Fighter(16, 1, 4, monsterDeath);
            const ai = new BasicMonster();
            monster = new Entity(x, y, 'T', 'troll', Colors.DARK_GREEN, true, { fighter: fighter, ai: ai });
        }

        entities.push(monster);
    }

    // Choose random number of items
    const numItems = rng.nextRange(0, MAX_ROOM_ITEMS);

    for (let i = 0; i < numItems; i++) {
        // Choose random spot for this item
        const x = rng.nextRange(room.x + 1, room.x2 - 1)
        const y = rng.nextRange(room.y + 1, room.y2 - 1)

        // Create a healing potion
        const itemComponent = new Item(castHeal);

        const item = new Entity(x, y, '!', 'healing potion', Colors.DARK_MAGENTA, false, { item: itemComponent });

        entities.push(item);
        item.sendToBack();  // items appear below other objects
    }
}

function renderBar(x, y, totalWidth, name, value, maximum, barColor, backColor) {
    // Render a bar (HP, experience, etc). first calculate the width of the bar
    const barWidth = Math.round(value / maximum * totalWidth);

    // Render the background first
    term.fillRect(x, y, totalWidth, 1, 0, 0, backColor);

    // Now render the bar on top
    if (barWidth > 0) {
        term.fillRect(x, y, barWidth, 1, 0, 0, barColor);
    }

    // Finally, some centered text with the values
    // term.fillForegroundRect(x, y, totalWidth, 1, Colors.WHITE);
    term.drawCenteredString(x + totalWidth / 2, y, name + ': ' + value + '/' + maximum, Colors.WHITE);
}

function getNamesUnderMouse() {
    const x = term.mouse.x;
    const y = term.mouse.y;

    if (!map.isVisible(x, y)) {
        return '';
    }

    const names = [];

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.x === x && entity.y === y) {
            names.push(entity.name);
        }
    }

    return capitalize(names.join(', '));
}

function addMessage(msg, opt_color) {
    while (messages.length >= MSG_HEIGHT) {
        messages.shift();
    }
    messages.push({ text: msg, color: (opt_color || Colors.WHITE) });
}

function capitalize(str) {
    if (!str) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function playerMoveOrAttack(dx, dy) {
    const x = player.x + dx;
    const y = player.y + dy;

    let target = null;
    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.fighter && entity.x === x && entity.y === y) {
            target = entity;
            break;
        }
    }

    if (target) {
        player.fighter.attack(target);
    } else {
        player.move(dx, dy);
        fovRecompute = true;
    }

    for (let i = 0; i < entities.length; i++) {
        const entity = entities[i];
        if (entity.ai) {
            entity.ai.takeTurn();
        }
    }
}

function handleKeys() {
    if (player.fighter.hp <= 0) {
        return;
    }

    if (gui.handleInput()) {
        return;
    }

    if (term.isKeyPressed(Keys.VK_UP)) {
        playerMoveOrAttack(0, -1);
    }
    if (term.isKeyPressed(Keys.VK_LEFT)) {
        playerMoveOrAttack(-1, 0);
    }
    if (term.isKeyPressed(Keys.VK_RIGHT)) {
        playerMoveOrAttack(1, 0);
    }
    if (term.isKeyPressed(Keys.VK_DOWN)) {
        playerMoveOrAttack(0, 1);
    }
    if (term.isKeyPressed(Keys.VK_G)) {
        // Pick up an item
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity.x === player.x && entity.y === player.y && entity.item) {
                entity.item.pickUp();
            }
        }
    }
    if (term.isKeyPressed(Keys.VK_I)) {
        if (inventory.length === 0) {
            gui.add(new MessageDialog('ALERT', 'Inventory is empty'));
        } else {
            const options = inventory.map(item => item.name);
            gui.add(new SelectDialog('INVENTORY', options, useInventory));
        }
    }
}

function useInventory(choice) {
    if (choice >= 0) {
        inventory[choice].item.use();
    }
}

function playerDeath(player) {
    addMessage('You died!', Colors.LIGHT_RED);
}

function monsterDeath(monster) {
    addMessage(capitalize(monster.name) + ' is dead!', Colors.BROWN);
    monster.char = '%';
    monster.color = Colors.DARK_RED;
    monster.blocks = false;
    monster.fighter = null;
    monster.ai = null;
    monster.name = 'remains of ' + monster.name;
    monster.sendToBack();
}

function castHeal(item) {
    // Heal the player
    if (player.fighter.hp === player.fighter.maxHp) {
        addMessage('You are already at full health.', Colors.DARK_RED);
        return;
    }

    addMessage('Your wounds start to feel better!', Colors.LIGHT_MAGENTA);
    player.fighter.heal(HEAL_AMOUNT);
    item.remove();
}

function renderAll() {
    if (fovRecompute) {
        map.computeFov(player.x, player.y, TORCH_RADIUS);
        fovRecompute = false;
    }

    for (let y = 0; y < MAP_HEIGHT; y++) {
        for (let x = 0; x < MAP_WIDTH; x++) {
            const visible = map.isVisible(x, y);
            const wall = map.grid[y][x].blockSight;
            let color = Colors.BLACK;

            if (visible) {
                // It's visible
                color = wall ? COLOR_LIGHT_WALL : COLOR_LIGHT_GROUND;
                map.grid[y][x].explored = true;
            } else if (map.grid[y][x].explored) {
                // It's remembered
                color = wall ? COLOR_DARK_WALL : COLOR_DARK_GROUND;
            }

            term.drawChar(x, y, 0, 0, color);
        }
    }

    for (let i = 0; i < entities.length; i++) {
        entities[i].draw();
    }

    // Prepare to render the GUI panel
    term.fillRect(0, PANEL_Y, SCREEN_WIDTH, PANEL_HEIGHT, 0, Colors.WHITE, Colors.BLACK);

    // Print the game messages, one line at a time
    let y = PANEL_Y + 1;
    for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        term.drawString(MSG_X, y, message.text, message.color);
        y++;
    }

    // Show the player's stats
    renderBar(
        1, PANEL_Y + 1, BAR_WIDTH,
        'HP', player.fighter.hp, player.fighter.maxHp,
        Colors.LIGHT_RED, Colors.DARK_RED);

    // Display names of objects under the mouse
    term.drawString(1, PANEL_Y, getNamesUnderMouse(), Colors.LIGHT_GRAY);

    // Draw dialog boxes
    gui.draw();
}

const term = new Terminal(document.querySelector('canvas'), SCREEN_WIDTH, SCREEN_HEIGHT);
const gui = new GUI(term);
const rng = new RNG(1);
const player = new Entity(40, 25, '@', 'player', Colors.WHITE, true, { fighter: new Fighter(20, 2, 5, playerDeath) });
const entities = [player];
const messages = [];
const map = createMap();
let fovRecompute = true;
const inventory = [];

addMessage('Welcome stranger! Prepare to perish!', Colors.DARK_RED);

term.update = function () {
    handleKeys();
    renderAll();
};