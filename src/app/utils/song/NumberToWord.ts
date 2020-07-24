export class NumberToWord {
    constructor() { }

    /* Array of units as words */
    units = ['', 'bénn', 'gnaar', 'gnett', 'gneent', 'diouróom', 'diouróom-bénn', 'diouróom-gnaar', 'diouróom-gnett', 'diouróom-gnéent'];

    /* Array of tens as words */
    tens = ['', 'fouk', '', 'fanwéer'];

    cents = ['téeméer']

    /* Array of scales as words */
    scales = ['', , 'diounni', 'tamndaréet', 'tamgnaréet'];

    numberToWolof(thenumber: number) {

        // Zero rule
        if (thenumber == 0) {
            return 'séro';
        }

        // Array to hold four three-digit groups
        let digitGroups: number[] = new Array<number>(4);

        // Ensure a positive number to extract from
        let positive: number = Math.abs(thenumber);

        // Extract the three-digit groups
        for (let i = 0; i < 4; i++) {
            digitGroups[i] = positive % 1000;
            positive = (positive - digitGroups[i]) / 1000;
        }

        // Convert each three-digit group to words
        let groupText: string[] = new Array<string>(4);

        for (let i = 0; i < 4; i++) {
            groupText[i] = this.ThreeDigitGroupToWolof(digitGroups[i]);
        }

        let combinaison: string = groupText[0];
        // Process the remaining groups in turn, smallest to largest
        for (let i = 1; i < 4; i++) {
            // Only add non-zero items
            if (digitGroups[i] != 0) {
                // Build the string to add as a prefix
                let prefix: string = "";
                if (groupText[i] === "1")
                    prefix = this.scales[i + 1];
                else
                    prefix = groupText[i] + " " + this.scales[i + 1];

                if (combinaison.length != 0)
                    prefix += " ak ";

                // Add the three-digit group to the combined string
                combinaison = prefix + combinaison;
            }
        }


        console.log("combinaison:" + combinaison);
        return combinaison;

    }

    // Converts a three-digit group into English words
    private ThreeDigitGroupToWolof(threeDigits: number): string {

        // Initialise the return text
        let groupText: string = "";

        // Determine the hundreds and the remainder

        let tensUnits: number = threeDigits % 100;
        let hundreds: number = (threeDigits - tensUnits) / 100;

        // Hundreds rules
        if (hundreds != 0) {
            //console.log("Numéro:"+hundreds+" hundred:"+this.units[hundreds])
            if (hundreds == 1)
                groupText += this.cents[0];
            else
                groupText += this.units[hundreds] + " " + this.cents[0];

            if (tensUnits != 0)
                groupText += " ak ";
        }

        // Determine the tens and units

        let units: number = tensUnits % 10;
        let tens: number = (tensUnits - units) / 10;

        // Tens rules
        if (tens != 0) {
            if (tens === 1 || tens === 3)
                groupText += this.tens[tens];
            else
                groupText += this.units[tens] + " " + this.tens[1];

            if (units != 0)
                groupText += " ak ";
        }

        if (units != 0) {
            groupText += this.units[units];
        }
        //console.log("groupe:"+groupText);
        return groupText;
    }

}