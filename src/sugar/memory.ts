import { toHex } from "../util/fmt";
import type { VM } from "./vm";

export type MemoryStat = {
    read: number;
    write: number;
};

/**
 * VM memory provider.
 */
export class Memory {
    private vm: VM;

    private content = new Map<number, number>();

    private readCount = 0;
    private writeCount = 0;

    private deviceAddresses = new Set([0xfe00, 0xfe02, 0xfe04, 0xfe06]);

    constructor(vm: VM) {
        this.vm = vm;
    }

    private checkAddress(addr: number) {
        if (addr > 0xffff || addr < 0) {
            this.vm.raise("address-out-of-range", { address: toHex(addr) });
        } else if (this.vm.isUser()) {
            if (addr < 0x3000) {
                this.vm.raise("memory-permission-denied", {
                    address: toHex(addr)
                });
            } else if (addr >= 0xfe00) {
                this.vm.raise("device-user-access", {
                    address: toHex(addr)
                });
            }
        } else if (addr >= 0xfe00 && !this.deviceAddresses.has(addr)) {
            this.vm.raise("mmio-no-device", { address: toHex(addr) });
        }
    }

    /**
     * Get the stats of the memory.
     */
    getStats(): MemoryStat {
        return {
            read: this.readCount,
            write: this.writeCount
        };
    }

    /**
     * Reads the address, ignoring any rules and does not report exceptions.
     */
    readAnyway(addr: number): number {
        return this.content.get(addr) ?? 0;
    }

    /**
     * Reads the address.
     */
    read(addr: number, count = true): number {
        this.checkAddress(addr);

        // Extra check for reading
        if (!this.content.has(addr) && !this.deviceAddresses.has(addr)) {
            this.vm.raise("unloaded-memory", { address: toHex(addr) });
        }

        if (count) this.readCount++;

        // Emulate keyboard read behavior
        if (addr === 0xfe02) {
            const st = this.content.get(0xfe00) ?? 0;
            this.content.set(0xfe00, st & 0x7fff);
        }

        return this.content.get(addr) ?? 0;
    }

    /**
     * Writes to the address.
     */
    write(addr: number, value: number, count = true) {
        this.checkAddress(addr);
        if (count) this.writeCount++;
        this.content.set(addr, value & 0xffff);
    }

    /**
     * Check if the target address has been loaded.
     */
    isLoaded(addr: number): boolean {
        return this.content.has(addr);
    }
}
