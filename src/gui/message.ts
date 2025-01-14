import { Color } from '../color';
import { serializable } from '../serialize';

export enum MessageAlign {
  LEFT,
  CENTER,
  RIGHT
}

@serializable
export class Message {
  constructor(
    readonly text: string | undefined,
    readonly fg?: Color | undefined,
    readonly bg?: Color | undefined,
    readonly children?: Message[],
    readonly align?: MessageAlign
  ) { }

  getWidth(): number {
    let width = 0;

    if (this.text) {
      for (const line of this.text.split('\n')) {
        width = Math.max(width, line.length);
      }
    }

    if (this.children) {
      for (const child of this.children) {
        width = Math.max(width, child.getWidth());
      }
    }

    return width;
  }

  getHeight(): number {
    let result = 0;

    if (this.text) {
      result += this.text.split('\n').length;
    }

    if (this.children) {
      for (const child of this.children) {
        result += child.getHeight();
      }
    }

    return result;
  }
}
