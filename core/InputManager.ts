
export class InputManager {
  keys: { [key: string]: boolean } = {};

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
  }

  mount() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  unmount() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  handleKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  handleMouseDown(e: MouseEvent) {
    if (e.button === 0) this.keys['MouseLeft'] = true;
  }

  handleMouseUp(e: MouseEvent) {
    if (e.button === 0) this.keys['MouseLeft'] = false;
  }

  getPlayerInput() {
    return {
      x: (this.keys['KeyD'] ? 1 : 0) - (this.keys['KeyA'] ? 1 : 0),
      jump: this.keys['KeyW'] || this.keys['KeyZ'] || this.keys['Space'],
      dash: this.keys['Space'],
      attack: this.keys['MouseLeft']
    };
  }
}
