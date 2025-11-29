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
    type: 'text' | 'image';
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
    styleId: string;
    side: 'front' | 'back';
    image: string; // base64 encoded PNG
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
    customFonts: CustomFont[];
    paperSize: 'letter' | 'a4';
    drawCutGuides?: boolean;
    renderedCards?: RenderedCard[]; // Optional for PDF generation
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

export const DEFAULT_LAYOUT: CardLayout = {
    name: 'Default Style',
    elements: [],
};

export interface Game {
    name: string;
    decks: Deck[];
}

export const DEFAULT_DECK: Deck = {
    id: 'deck-1',
    name: 'New Deck',
    width: 63.5, // Standard Poker size in mm
    height: 88.9,
    cards: [],
    fields: [],
    frontStyles: {
        'default-front': { name: 'Default Front', elements: [] }
    },
    backStyles: {
        'default-back': { name: 'Default Back', elements: [] }
    },
    customFonts: [],
    paperSize: 'letter',
};
