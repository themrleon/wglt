/**
 * The delay in frames before input repeating.
 * Time in milliseconds.
 */
const INPUT_REPEAT_DELAY = 200.0;

/**
 * The delay between subsequent repeat firing.
 * Time in milliseconds.
 */
const INPUT_REPEAT_RATE = 1000.0 / 15.0;

/**
 * The Input class represents a physical input.
 * Example: keyboard key or mouse button.
 */
export class Input {
  down: boolean;
  downTime: number;
  repeat: boolean;
  repeatTime: number;
  downCount: number;
  upCount: number;

  constructor() {
    this.down = false;
    this.downTime = 0;
    this.repeat = false;
    this.repeatTime = 0;
    this.downCount = 0;
    this.upCount = 100;
  }

  setDown(down: boolean): void {
    if (this.down !== down) {
      this.down = down;
      this.repeat = false;
      this.downTime = this.repeatTime = performance.now();
    }
  }

  update(time: number): void {
    this.repeat = false;
    if (this.down) {
      this.downCount++;
      this.upCount = 0;
      if (time - this.downTime >= INPUT_REPEAT_DELAY && time - this.repeatTime >= INPUT_REPEAT_RATE) {
        this.repeat = true;
        this.repeatTime = time;
      }
    } else {
      this.downCount = 0;
      this.upCount++;
    }
  }

  /**
   * Returns true if the input is "pressed".
   * Pressed is a one time event when the input first goes down.
   * It then repeats on repeat delay.
   */
  isPressed(): boolean {
    return this.downCount === 1 || this.repeat;
  }

  /**
   * Returns true if the input is "clicked".
   * Clicked is a one time event when the input first goes up.
   */
  isClicked(): boolean {
    return this.upCount === 1;
  }
}

export class InputSet<T> {
  readonly inputs = new Map<T, Input>();

  clear(): void {
    this.inputs.clear();
  }

  get(key: T): Input {
    let input = this.inputs.get(key);
    if (!input) {
      input = new Input();
      this.inputs.set(key, input);
    }
    return input;
  }

  updateAll(time: number): void {
    this.inputs.forEach((input) => input.update(time));
  }
}
