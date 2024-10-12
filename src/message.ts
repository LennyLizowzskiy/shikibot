export class Message {
    sections: string[][] = [[]];

    newSection() {
        this.sections.push([]);
    }

    addLine(s: string) {
        this.sections[this.sections.length - 1].push(s);
    }

    addResponseLine(lhs: string, rhs: string) {
        this.addLine(`${lhs}: <b>${rhs}</b>`);
    }

    toString(): string {
        return this.sections
            .map((ars) => {
                return ars.join("\n")
            })
            .join("\n\n");
    }
}