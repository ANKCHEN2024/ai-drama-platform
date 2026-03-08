import { Transition } from './types';

export class TransitionManager {
  generateFadeFilter(
    input1: string,
    input2: string,
    output: string,
    duration: number,
    offset: number
  ): string {
    return `[${input1}]fade=t=out:st=${offset}:d=${duration}[v1];[${input2}]fade=t=in:st=0:d=${duration}[v2];[v1][v2]concat=n=2:v=1:a=0[${output}]`;
  }

  generateSlideFilter(
    input1: string,
    input2: string,
    output: string,
    duration: number,
    offset: number,
    direction: 'left' | 'right' | 'up' | 'down' = 'left'
  ): string {
    const slideExpr = direction === 'left' ? 'x=-w*t' : 
                      direction === 'right' ? 'x=w*t' :
                      direction === 'up' ? 'y=-h*t' : 'y=h*t';
    
    return `[${input1}]setpts=PTS-STARTPTS[v1];[${input2}]setpts=PTS-STARTPTS,format=yuva420p,fade=t=in:st=0:d=${duration}:alpha=1[v2];[v1][v2]overlay=${slideExpr}:enable='between(t,0,${duration})'[${output}]`;
  }

  generateWipeFilter(
    input1: string,
    input2: string,
    output: string,
    duration: number,
    offset: number
  ): string {
    return `[${input1}]setpts=PTS-STARTPTS[v1];[${input2}]setpts=PTS-STARTPTS[v2];[v1][v2]xfade=transition=wiperight:duration=${duration}:offset=${offset}[${output}]`;
  }

  generateDissolveFilter(
    input1: string,
    input2: string,
    output: string,
    duration: number,
    offset: number
  ): string {
    return `[${input1}]setpts=PTS-STARTPTS[v1];[${input2}]setpts=PTS-STARTPTS[v2];[v1][v2]xfade=transition=fade:duration=${duration}:offset=${offset}[${output}]`;
  }

  generateFilter(
    input1: string,
    input2: string,
    output: string,
    transitionType: string,
    duration: number,
    offset: number
  ): string {
    switch (transitionType) {
      case 'fade':
        return this.generateFadeFilter(input1, input2, output, duration, offset);
      case 'slide':
        return this.generateSlideFilter(input1, input2, output, duration, offset);
      case 'wipe':
        return this.generateWipeFilter(input1, input2, output, duration, offset);
      case 'dissolve':
        return this.generateDissolveFilter(input1, input2, output, duration, offset);
      default:
        return this.generateFadeFilter(input1, input2, output, duration, offset);
    }
  }
}
