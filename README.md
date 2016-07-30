# ProcEngine v1.0.0
## What is ProcEngine?
ProcEngine is a step toward having a unified opensource library for different map generation techniques. The library is simple and easy to use. You only have 3 functions to use and 1 attribute:

- `procengine.initialize(data)`: to initialize the system with your rules.
- `procengine.generateLevel()`: to generate a level (you have to call initialize beforehand).
- `procengine.toString()`: to get a string that shows the current data saved in the system.
- `procengine.testing.isDebug` : set to `true` to allow console printing after each step in the system.

A simple example:
```
var data = {
  "mapData": ["15x7", "equal:1x1:1", "solid:empty", "connect:plus"],
  "names": ["empty", "solid"],
  "neighbourhoods": {"all":"111,101,111"},
  "startingRules": ["solid:1","empty:2"],
  "roomRules": ["2", "empty,all,solid,out,0,5,solid:1"]
};
procengine.initialize(data);
procengine.generateLevel();
```

These are some examples of the results:
```
111111111111111
110000000000111
100011110001011
101011101000011
100000000011011
110000011011111
111111111111111

111111111111111
111000111100111
100100110001011
100000000000011
110100000000011
111001000001111
111111111111111

111111111111111
111101111001111
110000000000111
100001000100111
100111100001111
111111100001111
111111111111111
```

This library is inspired by Kate Compton `tracery.js` and Nicky Case `Simulating the world (in Emoji)`.

## What is the main features?
- 2 different room spawning techniques (equal split/tree division)
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

## How to use ProcEngine as a TypeScript library?
Copy the definition file `procengine.d.ts` to your TypeScript project. Don't forget to add the `procengine.js` to the output directory and import it as a javascript file in your html before using it.

## How to use ProcEngine?
The library is very simple to use. You just define your data object that contains these keys/members `mapData`, `names`, `neighbourhoods`, `startingRules`, `roomRules`, and `smoothRules` then use this object to intialize the system by calling `procengine.initialize(data);`. At this point the system is ready to generate any level based on the current initialized information. Each time you call `procengine.generateLevel()` it returns a new generated level as a 2D matrix of strings (the strings are defined in the `names` member during intialization).

Here is a simple example:
```
var data = {
  "mapData": ["15x7", "equal:1x1:1", "solid:empty", "connect:plus"],
  "names": ["empty", "solid"],
  "neighbourhoods": {"all":"111,101,111"},
  "startingRules": ["solid:1","empty:2"],
  "roomRules": ["2", "empty,all,solid,out,0,5,solid:1"]
};
procengine.initialize(data);
procengine.generateLevel();
```

In this example you are generating a level of size `15x7` with only 1 room (which is the entire space). The map starts as all `solid` then the system start digging in it using `empty`. Each room is fixed (if its not fully connected) by randomly connecting them. We have only two defined tile names `solid` and `empty`. We have 1 defined neighbourhood `all` which consider all the objects around me in form of 3x3 matrix. The `empty` tile have twice the chance to be spawned at the begning compared to the `solid` tile. We use cellular automata for `2` simulations using the following rule:
```
if (this tile is "empty" and have more than "5" neighbours based on the "all" neighbourhood) then
  change this tile to "solid"
```