import { Console } from '../console';
import { Key } from '../keys';
import { Point } from '../point';
import { Rect } from '../rect';
import { Terminal } from '../terminal';
import { Dialog } from './dialog';
import { Message } from './message';

export class Scrollable2DMessageDialog extends Dialog {
  readonly messagesHeight: number;
  readonly messagesWidth: number;
  readonly scrollMaxY: number;
  readonly scrollMaxX: number;
  scrollY = 0;
  scrollX = 0;

  constructor(rect: Rect, title: string, titleColor: number | undefined, readonly message: Message) {
    super(rect, title,titleColor);
    this.messagesHeight = message.getHeight();
    this.messagesWidth = message.getWidth();
    this.scrollMaxY = Math.max(1, this.messagesHeight - this.contentsRect.height);
    this.scrollMaxX = Math.max(1, this.messagesWidth - this.contentsRect.width);
  }

  drawContents(console: Console, offset: Point): void {
    console.clip = new Rect(offset.x, offset.y, this.contentsRect.width+1, this.contentsRect.height);
    console.drawMessage(offset.x - this.scrollX, offset.y - this.scrollY, this.message, this.message.getWidth());
    console.clip = undefined;
  }

  handleInput(terminal: Terminal): boolean {
    const moveKey = terminal.getMovementKey();
    if (moveKey) {
      this.scrollY += moveKey.y;
      this.scrollX += moveKey.x;
    }
    if (terminal.isKeyPressed(Key.VK_HOME)) {
      this.scrollX -= this.contentsRect.width;
    }
    if (terminal.isKeyPressed(Key.VK_END)) {
      this.scrollX += this.contentsRect.width;
    }
    if (terminal.isKeyPressed(Key.VK_PAGE_DOWN)) {
      this.scrollY += this.contentsRect.height;
    }
    if (terminal.isKeyPressed(Key.VK_PAGE_UP)) {
      this.scrollY -= this.contentsRect.height;
    }
    if (terminal.mouse.wheelDeltaY !== 0) {
      this.scrollY += terminal.mouse.wheelDeltaY < 0 ? -5 : 5;
      terminal.mouse.wheelDeltaY = 0;
    }
    this.scrollY = Math.max(0, Math.min(this.scrollMaxY, this.scrollY));
    this.scrollX = Math.max(0, Math.min(this.scrollMaxX, this.scrollX));
    return terminal.isKeyPressed(Key.VK_ESCAPE);
  }
}
