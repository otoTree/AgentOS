import { Range } from '../../model/schema';
import { SizeManager } from '../../core/size-manager';

export class ScrollManager {
  private container: HTMLElement;
  private contentHeight: number;
  private contentWidth: number;
  private scrollTop: number = 0;
  private scrollLeft: number = 0;
  private onScrollCallback: ((viewport: Range) => void) | null = null;
  private sizeManager: SizeManager;

  // Configuration
  private headerWidth = 50;
  private headerHeight = 25;
  private bufferSize = 2; // Extra rows/cols to render

  constructor(
    container: HTMLElement, 
    sizeManager: SizeManager,
    headerWidth: number,
    headerHeight: number
  ) {
    this.container = container;
    this.sizeManager = sizeManager;
    this.headerWidth = headerWidth;
    this.headerHeight = headerHeight;

    // Calculate total virtual size
    this.contentHeight = sizeManager.getTotalHeight() + headerHeight;
    this.contentWidth = sizeManager.getTotalWidth() + headerWidth;

    this.initScrollbars();
  }

  private initScrollbars() {
    // Create a dummy element to force scrollbars on the container
    const dummy = document.createElement('div');
    dummy.style.width = `${this.contentWidth}px`;
    dummy.style.height = `${this.contentHeight}px`;
    dummy.style.position = 'absolute';
    dummy.style.top = '0';
    dummy.style.left = '0';
    dummy.style.zIndex = '-1'; // Behind canvas
    dummy.style.visibility = 'hidden';
    
    // Ensure container is scrollable
    this.container.style.overflow = 'auto';
    this.container.style.position = 'relative';
    this.container.appendChild(dummy);

    this.container.addEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll() {
    this.scrollTop = this.container.scrollTop;
    this.scrollLeft = this.container.scrollLeft;
    this.updateViewport();
  }

  public updateViewport() {
    if (!this.onScrollCallback) return;

    const viewportWidth = this.container.clientWidth;
    const viewportHeight = this.container.clientHeight;

    // Calculate visible range indices
    // We subtract header dimensions because scroll affects content, but headers are fixed (conceptually)
    // However, in this simple implementation, we scroll the whole canvas, so we need to map scroll pos to indices.
    
    // Effective scroll position for content
    const effectiveScrollY = Math.max(0, this.scrollTop);
    const effectiveScrollX = Math.max(0, this.scrollLeft);

    const startRow = this.sizeManager.getRowIndexAtOffset(effectiveScrollY);
    const startCol = this.sizeManager.getColIndexAtOffset(effectiveScrollX);

    const endRow = this.sizeManager.getRowIndexAtOffset(effectiveScrollY + viewportHeight);
    const endCol = this.sizeManager.getColIndexAtOffset(effectiveScrollX + viewportWidth);

    this.onScrollCallback({
      startRow: Math.max(0, startRow - this.bufferSize),
      startCol: Math.max(0, startCol - this.bufferSize),
      endRow: endRow + this.bufferSize,
      endCol: endCol + this.bufferSize
    });
  }

  public onScroll(callback: (viewport: Range) => void) {
    this.onScrollCallback = callback;
    // Trigger initial update
    this.updateViewport();
  }

  public updateContentSize() {
      this.contentHeight = this.sizeManager.getTotalHeight() + this.headerHeight;
      this.contentWidth = this.sizeManager.getTotalWidth() + this.headerWidth;

      // Update dummy element
      const dummy = this.container.firstElementChild as HTMLElement;
      if (dummy) {
          dummy.style.width = `${this.contentWidth}px`;
          dummy.style.height = `${this.contentHeight}px`;
      }
      this.updateViewport();
  }

  public getScrollPosition() {
    return { scrollTop: this.scrollTop, scrollLeft: this.scrollLeft };
  }
  
  public destroy() {
      this.container.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}
