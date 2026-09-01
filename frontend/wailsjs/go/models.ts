export namespace deck {
	
	export class Card {
	    id: string;
	    data: Record<string, any>;
	    count: number;
	    frontStyleId: string;
	    backStyleId: string;
	
	    static createFrom(source: any = {}) {
	        return new Card(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.data = source["data"];
	        this.count = source["count"];
	        this.frontStyleId = source["frontStyleId"];
	        this.backStyleId = source["backStyleId"];
	    }
	}
	export class Point {
	    x: number;
	    y: number;
	
	    static createFrom(source: any = {}) {
	        return new Point(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.x = source["x"];
	        this.y = source["y"];
	    }
	}
	export class LayoutElement {
	    id: string;
	    name?: string;
	    type: string;
	    field: string;
	    staticText?: string;
	    x: number;
	    y: number;
	    width: number;
	    height: number;
	    fontSize?: number;
	    color?: string;
	    fontFamily?: string;
	    objectFit?: string;
	    textAlign?: string;
	    verticalAlign?: string;
	    fontWeight?: string;
	    fontStyle?: string;
	    textDecoration?: string;
	    points?: Point[];
	    fillColor?: string;
	    strokeColor?: string;
	    strokeWidth?: number;
	
	    static createFrom(source: any = {}) {
	        return new LayoutElement(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.type = source["type"];
	        this.field = source["field"];
	        this.staticText = source["staticText"];
	        this.x = source["x"];
	        this.y = source["y"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.fontSize = source["fontSize"];
	        this.color = source["color"];
	        this.fontFamily = source["fontFamily"];
	        this.objectFit = source["objectFit"];
	        this.textAlign = source["textAlign"];
	        this.verticalAlign = source["verticalAlign"];
	        this.fontWeight = source["fontWeight"];
	        this.fontStyle = source["fontStyle"];
	        this.textDecoration = source["textDecoration"];
	        this.points = this.convertValues(source["points"], Point);
	        this.fillColor = source["fillColor"];
	        this.strokeColor = source["strokeColor"];
	        this.strokeWidth = source["strokeWidth"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CardLayout {
	    name: string;
	    elements: LayoutElement[];
	
	    static createFrom(source: any = {}) {
	        return new CardLayout(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.elements = this.convertValues(source["elements"], LayoutElement);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class CustomFont {
	    name: string;
	    path: string;
	    family: string;
	
	    static createFrom(source: any = {}) {
	        return new CustomFont(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.path = source["path"];
	        this.family = source["family"];
	    }
	}
	export class RenderedCard {
	    cardId: string;
	    side: string;
	    image: string;
	
	    static createFrom(source: any = {}) {
	        return new RenderedCard(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.cardId = source["cardId"];
	        this.side = source["side"];
	        this.image = source["image"];
	    }
	}
	export class FieldDefinition {
	    name: string;
	    type: string;
	
	    static createFrom(source: any = {}) {
	        return new FieldDefinition(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.type = source["type"];
	    }
	}
	export class Deck {
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
	    customFonts?: CustomFont[];
	    paperSize: string;
	    drawCutGuides: boolean;
	
	    static createFrom(source: any = {}) {
	        return new Deck(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.cards = this.convertValues(source["cards"], Card);
	        this.fields = this.convertValues(source["fields"], FieldDefinition);
	        this.frontStyles = this.convertValues(source["frontStyles"], CardLayout, true);
	        this.backStyles = this.convertValues(source["backStyles"], CardLayout, true);
	        this.defaultFrontStyleId = source["defaultFrontStyleId"];
	        this.defaultBackStyleId = source["defaultBackStyleId"];
	        this.customFonts = this.convertValues(source["customFonts"], CustomFont);
	        this.paperSize = source["paperSize"];
	        this.drawCutGuides = source["drawCutGuides"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class PDFLayout {
	    pageWidth: number;
	    pageHeight: number;
	    cardsPerRow: number;
	    cardsPerCol: number;
	    cardWidth: number;
	    cardHeight: number;
	    spacing: number;
	    marginLeft: number;
	    marginTop: number;
	
	    static createFrom(source: any = {}) {
	        return new PDFLayout(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pageWidth = source["pageWidth"];
	        this.pageHeight = source["pageHeight"];
	        this.cardsPerRow = source["cardsPerRow"];
	        this.cardsPerCol = source["cardsPerCol"];
	        this.cardWidth = source["cardWidth"];
	        this.cardHeight = source["cardHeight"];
	        this.spacing = source["spacing"];
	        this.marginLeft = source["marginLeft"];
	        this.marginTop = source["marginTop"];
	    }
	}
	

}

export namespace game {
	
	export class Game {
	    schemaVersion: number;
	    name: string;
	    decks: deck.Deck[];
	
	    static createFrom(source: any = {}) {
	        return new Game(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.schemaVersion = source["schemaVersion"];
	        this.name = source["name"];
	        this.decks = this.convertValues(source["decks"], deck.Deck);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace main {
	
	export class ExcelSelection {
	    filePath: string;
	    sheets: string[];
	
	    static createFrom(source: any = {}) {
	        return new ExcelSelection(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	        this.sheets = source["sheets"];
	    }
	}

}

