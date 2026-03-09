declare module 'html2canvas' {
  const html2canvas: (element: HTMLElement, options?: object) => Promise<HTMLCanvasElement>;
  export default html2canvas;
}

declare module 'jspdf' {
  export class jsPDF {
    constructor(orientation?: string, unit?: string, format?: string);
    addImage(imgData: string, format: string, x: number, y: number, w: number, h: number): void;
    addPage(): void;
    save(filename: string): void;
  }
}
