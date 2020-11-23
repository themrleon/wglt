import { Console } from './console';
import { Cell } from './cell';
import { Point } from './point';

const dxs = [-1, 0, 1, -1, 1, -1, 0, 1];
const dys = [-1, -1, -1, 0, 0, 1, 1, 1];
const costs = [1.4, 1, 1.4, 1, 1, 1.4, 1, 1.4];
let pathId = 0;

/**
 * Calculates Dijkstra's algorithm.
 *
 * @param {!Object} source Starting point, must have x and y properties.
 * @param {!Object=} opt_dest Optional destination point, must have x and y properties.
 * @param {!number=} opt_maxDist Optional maximum distance to examine.
 * @return {?Array} Array of steps if destination found; null otherwise.
 */
export function computePath(map: Console, source: Point, dest: Point, maxDist: number) {
  pathId++;

  const sourceCell = map.grid[source.y][source.x];
  sourceCell.pathId = pathId;
  sourceCell.g = 0.0;
  sourceCell.h = Math.hypot(source.x - dest.x, source.y - dest.y);
  sourceCell.prev = null;

  const q = new SortedSet([sourceCell]);

  while (q.size() > 0) {
    const u = q.pop() as Cell;

    if (u.x === dest.x && u.y === dest.y) {
      return buildPath(u);
    }

    for (let i = 0; i < dxs.length; i++) {
      const x = u.x + dxs[i];
      const y = u.y + dys[i];
      if (x >= 0 && x < map.width && y >= 0 && y < map.height) {
        const v = map.grid[y][x];
        if (v.blocked && v.explored && (x !== dest.x || y !== dest.y)) {
          continue;
        }
        if (v.pathId !== pathId) {
          v.pathId = pathId;
          v.g = Infinity;
          v.h = Math.hypot(x - dest.x, y - dest.y);
          v.prev = null;
        }
        const alt = u.g + costs[i];
        if (alt < v.g && alt <= maxDist) {
          v.g = alt;
          v.prev = u;
          q.insert(v);
        }
      }
    }
  }
  return null;
}

function buildPath(cell: Cell) {
  const result = [];
  let curr: Cell | null = cell;
  while (curr) {
    result.push(curr);
    curr = curr.prev;
  }
  result.reverse();
  return result;
}

class SortedSet {
  private readonly values: Cell[];

  constructor(initialValues: Cell[]) {
    this.values = initialValues
  }

  insert(cell: Cell) {
    const array = this.values;
    let low = 0;
    let high = array.length;
    let index = 0;

    while (low < high) {
      const mid = (low + high) >>> 1;
      const midCell = array[mid];
      if (midCell.g + midCell.h > cell.g + cell.h) {
        low = mid + 1;
        index = low;
      } else {
        high = mid;
        index = high;
      }
    }
    array.splice(index, 0, cell);
  }

  pop() {
    return this.values.pop();
  }

  size() {
    return this.values.length;
  }
}