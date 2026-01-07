import { PresentationState, ThemeConfig } from '../model/schema';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_THEME: ThemeConfig = {
  colors: ['#000000', '#FFFFFF', '#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
  fonts: {
    heading: 'Calibri Light',
    body: 'Calibri'
  }
};

export class PPTStore {
  private state: PresentationState;
  private listeners: Set<(state: PresentationState) => void> = new Set();

  constructor(initialState?: Partial<PresentationState>) {
    this.state = {
      id: uuidv4(),
      title: 'New Presentation',
      slides: [],
      masters: [],
      layouts: [],
      theme: DEFAULT_THEME,
      ...initialState
    };
  }

  getState(): PresentationState {
    return this.state;
  }

  /**
   * Internal method to update state.
   * In a real application, this should only be called by the Command system.
   */
  setState(updater: (prevState: PresentationState) => PresentationState) {
    this.state = updater(this.state);
    this.notify();
  }

  subscribe(listener: (state: PresentationState) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(l => l(this.state));
  }
}
