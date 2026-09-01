export interface FieldDefinition {
  name: string;
  type: 'text' | 'image';
}

export interface CardBack {
  id: string;
  name: string;
  type: 'color' | 'image';
  content: string;
}

export interface Card {
  id: string;
  data: Record<string, any>; // From XLSX
  count: number;
  frontStyleId: string;
  backStyleId: string;
}

export interface LayoutElement {
  id: string;
  name?: string; // User-friendly name for layers
  type: 'text' | 'image' | 'shape';
  field?: string; // The key from the data source (optional for static text)
  staticText?: string; // Manually defined text
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontWeight?: 'normal' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline';
  // Shape properties
  points?: { x: number; y: number }[]; // Normalized 0-1 relative to width/height
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface CardLayout {
  name: string;
  elements: LayoutElement[];
}

export interface CustomFont {
  name: string;
  path: string;
  family: string;
}

export interface RenderedCard {
  cardId: string;
  side: 'front' | 'back';
  image: string; // data URL or bare base64 PNG
}

export interface Deck {
  id: string;
  name: string;
  width: number;
  height: number;
  cards: Card[];
  fields: FieldDefinition[];
  frontStyles: Record<string, CardLayout>;
  backStyles: Record<string, CardLayout>;
  defaultFrontStyleId: string;
  defaultBackStyleId: string;
  customFonts: CustomFont[];
  paperSize: 'letter' | 'a4';
  drawCutGuides?: boolean;
}

export interface PDFLayout {
  pageWidth: number;
  pageHeight: number;
  cardsPerRow: number;
  cardsPerCol: number;
  cardWidth: number;
  cardHeight: number;
  spacing: number;
  marginLeft: number;
  marginTop: number;
}

export interface Game {
  /** Save-format version; stamped by the Go layer on save. */
  schemaVersion?: number;
  name: string;
  decks: Deck[];
}

let deckSeq = 0;

/**
 * Build a fresh default deck. Every call returns brand-new nested objects
 * (styles, cards, fields) so decks created from the default never share
 * mutable state — the previous `DEFAULT_DECK` constant did, which let an edit
 * to one deck leak into another.
 */
export function makeDefaultDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: `deck-${Date.now().toString(36)}-${deckSeq++}`,
    name: 'New Deck',
    width: 63.5, // Standard Poker size in mm
    height: 88.9,
    cards: [],
    fields: [],
    frontStyles: {
      'default-front': { name: 'Default Front', elements: [] },
    },
    backStyles: {
      'default-back': { name: 'Default Back', elements: [] },
    },
    defaultFrontStyleId: 'default-front',
    defaultBackStyleId: 'default-back',
    customFonts: [],
    paperSize: 'letter',
    ...overrides,
  };
}

export function makeDefaultGame(): Game {
  return { name: 'New Game', decks: [makeDefaultDeck()] };
}
