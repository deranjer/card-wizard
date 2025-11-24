export namespace cards {
	
	export class Card {
	    id: string;
	    name: string;
	    description: string;
	    copies: number;
	
	    static createFrom(source: any = {}) {
	        return new Card(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.description = source["description"];
	        this.copies = source["copies"];
	    }
	}

}

