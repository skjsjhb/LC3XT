# LC3XT

Toolset for the little computer. Built entirely on top of JavaScript / TypeScript.

## The Name?

Short for "**LC**-**3** e**X**tra **T**ools".

## Tools

LC3XT provides several components, listed as below.

### Assembler

LC3XT provides an assembler written in pure TypeScript.

- **Native CLI** - Access the assembler via command-line.

- **Localized** - English and Simplified Chinese are supported out of box. Other languages can also be added easily.

- **Linting** - Discovers common pitfalls and suspicious usage besides error-checking.

- **Extended** - Configurable add-ons for the LC-3 assembly.

- **Debug Friendly** - Capable for generating debug bundle which retains the source information and symbols.

- **Portable** - The core part is just vanilla TypeScript and can be easily ported to the web or Node.js.

### Emulator

LC3XT provides a full-featured LC-3 emulator.

- **Native CLI** - Access the emulator via command-line.

- **LC-3 Compatible** - Supports interrupts, I/O devices, program modes, etc..

- **Test Friendly** - Provides an elegant set of APIs for controlling and measurement.

- **Lightweight** - Memory and I/O resources are allocated on-demand, minimizing resource consumption when idle.

- **Inspecting** - Reveal suspicious instructions and memory accesses even if they are not considered as errors.

- **Traceable** - Capable for generating changes history, making it easy to reproduce the execution process.

- **Portable** - The core part is just vanilla TypeScript and can be easily ported to the web or Node.js.
