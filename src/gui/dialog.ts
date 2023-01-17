import { Console } from '../console';
import { Point } from '../point';
import { Rect } from '../rect';
import { Terminal } from '../terminal';

export abstract class Dialog {
  readonly contentsRect: Rect;
  readonly title: string;
  readonly titleColor: number | undefined;

  constructor(contentsRect: Rect, title: string, titleColor: number | undefined) {
    this.contentsRect = contentsRect;
    this.title = title;
    this.titleColor = titleColor;
  }

  abstract drawContents(console: Console, offset: Point): void;

  abstract handleInput(terminal: Terminal, offset: Point): boolean;
}
