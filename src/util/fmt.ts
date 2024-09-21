export function toHex(n: number) {
    return `x${n.toString(16).padStart(4, "0")}`;
}
