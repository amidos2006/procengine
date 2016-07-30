# ProcEngine v1.0
## What is ProcEngine?
ProcEngine is a step toward having a unified opensource library for different map generation techniques. The library is simple and easy to use. You only have 3 functions to use and 1 attribute:

- `procengine.initialize(data)`: to initialize the system with your rules.
- `procengine.generateLevel()`: to generate a level (you have to call initialize beforehand).
- `procengine.toString()`: to get a string that shows the current data saved in the system.
- `procengine.testing.isDebug` : set to `true` to allow console printing after each step in the system.

This library is inspired by Kate Compton `tracery.js` and Nicky Case `Simulating the world (in Emoji)`.

## What is the main features?
- 3 different room spawning techniques (equal split/tree division/digger)
- Spawn objects and have room structures using advanced cellular automata rules (inspired by Nicky Case)
- Define any number of names as cellular automata objects
- Define any type of neighbourhood as a 2D binary matrix for each of your cellular automata rule
- Define any probability to spawn new object on the generated map
- Connect/Delete unconnected parts in generated rooms due to cellular automata rules
- Use a secondary cellular automata rules to smooth the whole word
- Debug attribute to print what's happening after each step in the system.

## How to use ProcEngine as a browser library?
Copy `procengine.js` to your `js` folder then import it as a javascript file in your html before using it.

`<script src="js/procengine.js"></script>`

## How to use ProcEngine as TypeScript library?
Copy the definition file `procengine.d.ts` to your TypeScript project. Don't forget to add the `procengine.js` to the output directory and import it as a javascript file in your html before using it.

## How to use ProcEngine?