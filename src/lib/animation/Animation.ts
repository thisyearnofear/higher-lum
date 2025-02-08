interface AnimationConfig {
  startValue: number;
  endValue: number;
  duration: number;
  easingFunction?: (t: number, b: number, c: number, d: number) => number;
}

export class Animation {
  private startValue: number;
  private endValue: number;
  private duration: number;
  private easingFunction: (
    t: number,
    b: number,
    c: number,
    d: number
  ) => number;
  private startTime: number | null = null;
  private direction: "forwards" | "backwards" = "forwards";
  private isRunning: boolean = false;

  constructor({
    startValue,
    endValue,
    duration,
    easingFunction = (t: number, b: number, c: number, d: number) => {
      return (c * t) / d + b;
    },
  }: AnimationConfig) {
    this.startValue = startValue;
    this.endValue = endValue;
    this.duration = duration;
    this.easingFunction = easingFunction;
  }

  start() {
    this.startTime = Date.now();
    this.isRunning = true;
    return this;
  }

  forwards() {
    this.direction = "forwards";
    return this;
  }

  backwards() {
    this.direction = "backwards";
    return this;
  }

  update(updateFn: (value: number) => void) {
    if (!this.startTime || !this.isRunning) return;

    const currentTime = Date.now();
    const elapsed = currentTime - this.startTime;

    if (elapsed >= this.duration) {
      updateFn(this.direction === "forwards" ? this.endValue : this.startValue);
      this.isRunning = false;
      return;
    }

    const start =
      this.direction === "forwards" ? this.startValue : this.endValue;
    const end = this.direction === "forwards" ? this.endValue : this.startValue;
    const value = this.easingFunction(
      elapsed,
      start,
      end - start,
      this.duration
    );

    updateFn(value);
  }

  get isAnimating() {
    return this.isRunning;
  }
}
