# ProcEngine v1.0.0 [Open Beta]
## What is ProcEngine?
ProcEngine is a step toward having a unified opensource library for different map generation techniques. The library is simple and easy to use. You only have 3 functions to use and 1 attribute:

- `procengine.initialize(data)`: to initialize the system with your rules.
- `procengine.generateLevel()`: to generate a level (you have to call initialize beforehand).
- `procengine.toString()`: to get a string that shows the current data saved in the system.
- `procengine.testing.isDebug` : set to `true` to allow console printing after each step in the system.

A simple example:
```
var data = {
  "mapData": ["15x7", "equal:1x1:1", "solid:empty", "connect:plus:1"],
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

For a simple way to construct the initialization object try using this tool ([link](http://cdn.rawgit.com/amidos2006/procengine/master/Example/index.html)).

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
  "mapData": ["15x7", "equal:1x1:1", "solid:empty", "connect:plus:1"],
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
## What does these sections mean?
As you can see, its super simple, the only thing need explaination is the input data object. Let's explain now in more detail how to construct the input object.

The input data object is consisted of 6 sections. If any section is not existing, it is treated using default values for it. These sections are:
- Names Section: Defines all tile names that are used in the rules. For example: `"names": ["empty", "solid"]` means we have two defined tiles named `empty` and `solid`.
- Neighbourhoods Section: Defines all the neighbourhoods that are used in the rules. Neighbourhoods give the system the way to calculate the surrounding objects. For example: `"neighbourhoods": {"all":"111,101,111", "plus":"010,101,010"}` means we have two neighbourhoods, one is called `all` which consider all the 8 neighbours around the checked tile, while the second one `plus` only consider the ones in the north, south, east, and west tiles. 
- Map Data Section: Contains all the information about the map required to be generated. For example: `"mapData": ["24x16", "equal:4x2:3", "solid:empty", "connect:plus:1"]` always consists of 4 parts. 
  - The first part is the map size and in this example its `15x7` which means the width is `24` and height is `16`. 
  - The second part contains information about how the level is divided and the way to divide it. In the example, it says we will have `3` rooms selected after dividing the map into `equal` rooms of grid `4` by `2`.
  - The third part is the initial value to fill the map and the value used to dig through the map. For example `solid:empy` means that the initial map is totally filled with `solid`, and all the techniques used `empty` to dig through it.
  - The last part is the way how the system deals with unconnected parts in the map. For example `connect:plus:1` means if there is an unconnected part of the map, try to `connect` it back and use the `plus` neighbourhood to check for connectivity and with digging thickness of `1`.
- Starting Rules Section: It defines how each room should be initialized. For example: `"startingRules": ["solid:1","empty:3"]` means that each tile in the room have `3` times chance to be `empty` while `1` time chance to be `solid`.
- Room Rules Section: It defines the rules for the cellular automata that handles the rooms. For example: `"roomRules": ["2", "empty,all,solid,out,0,5,solid:1"]`. The first object in the array is the number of simulation done using cellular automata, in this example only `2`. The rest are the rules for the automata, this rule says if the `tile` is empty and there is `more than` `5` tiles of `solid` then convert the tile to `solid`.
- Smoothing Rules Section: This section is identical to the previous section where you define rules for cellular automata but these rules are used all over the whole map not on a certain rule and after finishing everything.

### How to write the rules?
- **Names Section:**
```
"names": [
  "name1", 
  "name2", 
  ...
  ...
  ...
  "nameN"
]
```
Its a list of all the defined names that the use going to use through all the rules. As seen they are defined as an array of string.
- **Neighbourhoods Section:**
```
"neighbourhoods": {
  "name1": "row1,row2,...rowN",
  "name2": "row1,row2,...rowN",
  ...
  ...
  ...
  "nameN": "row1,row2,...rowN"
}
```
Its a dictionary of all the defined neighbourhood used in your rules. The neighbourhood is a 2D matrix of 0's and 1's of any size. The matrix is written in the following format `row1,row2,...rowN`. Each row is a sequence of 0's and 1's, where 1 means this position to be checked while 0 means don't check.
- **Map Data Section**:
```
"mapData" : [
  "widthxheight", 
  "roomTech:param1xparam2:numRooms", 
  "tileInitial:tileDig", 
  "fixType:neighbourhoodName:thickness"
]
```
This section defines information about the generated map. Its an array of 4 parts:
  - `widthxheight`: 
    - `width`: the map width.
    - `height`: the map height.
  - `roomTech:param1xparam2:numRooms`:
    - `roomTech`: the technique used to divide the map into rooms. The system now support two different values `equal` (divide the map into equal rooms) and `tree` (divide the map using a tree technique which result of unequal size of rooms).
    - `param1`: depends on the technique used. If `equal` is used, this is the num of divisions across the x axis. If `tree` is used, this is the minimum width of the room it shouldn't be less.
    - `param2`: depends on the technique used. If `equal` is used, this is the num of divisions across the y axis. If `tree` is used, this is the minimum height of the room it shouldn't be less.
    - `numRooms`: is the number of rooms the system should achieve.
  - `tileInitial:tileDig`:
    - `tileInitial`: is the initial value the whole map will be initialized with (it must be defined in the Names Section).
    - `tileDig`: is the value used to dig through the map (it must be defined in the Names Section).
  - `fixType:neighbourhoodName:thickness`:
    - `fixType`: the technique used to handle the disconnected parts in a single room. In the current version we have two techniques `delete` (deletes all other parts of the rooms and leave the largest one) and `connect` (connect all the separated parts in the room).
    - `neighbourhoodName`: the neighbourhood used to check connectivity (It must be defined in the Neighbourhoods Section).
    - `thickness`: how thick the digging should be.
- **Starting Rules Section:**
```
"startingRules": [
  "name1:count1",
  "name2:count2",
  ...
  ...
  ...
  "nameN:countN"
]
```
It is an array of names and numbers separated by `:`. All the names must be defined in the Names Section. This part says how to initialize each room. Each tile is selected from this array based on the `count` value, the higher the `count` the higher it will get selected.

- **Room Automata Section:**
```
"roomRules": [
  "numSimulation", 
  "tileName1,neighbourhoodName1,checkTile1,condition1,lowBound1,highBound1,replaceTile11:count11|replaceTile12:count12|...|replaceTile1N:count1N",
  "tileName2,neighbourhoodName2,checkTile2,condition2,lowBound2,highBound2,replaceTile21:count21|replaceTile22:count22|...|replaceTile2N:count2N",
  ...
  ...
  ...
  "tileNameN,neighbourhoodNameN,checkTileN,conditionN,lowBoundN,highBoundN,replaceTileN1:countN1|replaceTileN2:countN2|...|replaceTileNN:countNN"
]
```
This section defines the rules for the cellular automata used to generate the rooms. Its an array of multiple of items but consists of main 2 parts:
  - `numSimulation`: the number of simulations you want the following rules to be applied.
  - `tileName,neighbourhoodName,checkTile,condition,lowBound,highBound,replaceTile1:count1|replaceTile2:count2|...|replaceTileN:countN`:
    - `tileName`: if the tile value is equal to `tileName` then this rule will be applied (`tileName` must be defined in the Names Section).
    - `neighbourhoodName`: the type of neighbourhood used to check if this rule is valid or not (`neighbourhoodName` must be defined in the Neighbourhoods Section).
    - `checkTile`: the tile that is checked in the condition (`checkTile` must be defined in the Names Section).
    - `condition`: the type of condition that is used. It is either `in` (lowBound<value<highBound) or `out` (lowBound>value>highBound).
    - `lowBound`: the low bound in the `condition`.
    - `highBound`: the high bound in the `condition`. 
    - `replaceTile1:count1|replaceTile2:count2|...|replaceTileN:countN`: Is executed the same way like Starting Rules (`replaceTile` must be defined in the Names Section). It could be rewritten as `startingRule1|startingRule2|...|startingRuleN`.
  
- **Smooth Automata Section:**
```
"smoothRules": [
  "numSimulation", 
  "tileName1,neighbourhoodName1,checkTile1,condition1,lowBound1,highBound1,replaceTile11:count11|replaceTile12:count12|...|replaceTile1N:count1N",
  "tileName2,neighbourhoodName2,checkTile2,condition2,lowBound2,highBound2,replaceTile21:count21|replaceTile22:count22|...|replaceTile2N:count2N",
  ...
  ...
  ...
  "tileNameN,neighbourhoodNameN,checkTileN,conditionN,lowBoundN,highBoundN,replaceTileN1:countN1|replaceTileN2:countN2|...|replaceTileNN:countNN"
]
```
Its exactly identical to Room Automata Section the only difference is these rules are applied on the whole map after finishing and not on specific room.

For a simple way to construct the initialization object try using this tool ([link](http://cdn.rawgit.com/amidos2006/procengine/master/Example/index.html)).