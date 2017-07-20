export function getRandomId(): string {
    return (+(new Date())) + '';
}

export function getRandomColor(): number {
    return parseInt(decimalToHexString(r(256 * 256 * 256)), 16);
}

function r(num: number = 256): number {
    return Math.floor(Math.random() * num);
}

function decimalToHexString(number: number): string {
    if (number < 0)
    {
        number = 0xFFFFFFFF + number + 1;
    }

    return number.toString(16).toUpperCase();
}
