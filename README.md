# ProcEngine v1.1.1 [Open Beta]
## What is ProcEngine?
ProcEngine is a step toward having a unified opensource library for different map generation techniques. The library is simple and easy to use. You only have 3 functions to use and 1 attribute:

- `procengine.initialize(data)`: to initialize the system with your rules.
- `procengine.generateMap()`: to generate a level (you have to call initialize beforehand).
- `procengine.toString()`: to get a string that shows the current data saved in the system.
- `procengine.testing.isDebug` : set to `true` to allow console printing after each step in the system.

A simple example:
```
var data = {
  "mapData": ["15x7", "solid:empty"],
  "roomData": ["equal:1x1:1", "solid:1|empty:2"],
  "names": ["empty:-1", "solid:-1"],
  "neighbourhoods": {"plus":"010,101,010", "all":"111,101,111"},
  "generationRules": [
    {"genData": ["2", "room:-1", "connect:plus:1"], 
      "rules": ["empty,all,or,solid>5,solid:1"]},
    {"genData": ["0", "map:-1", "connect:plus:1"], 
      "rules": []}
  ]
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
- Define any number of names (and max count) as cellular automata objects
- Define any type of neighbourhood as a 2D binary matrix
- Define any probability to spawn new object on the generated map
- Connect/Delete unconnected parts in generated rooms and maps
- Use more than one cellular automata rules either to have new generating layers or smoothing the generated level
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
  "mapData": ["15x7", "solid:empty"],
  "roomData": ["equal:1x1:1", "solid:1|empty:2"],
  "names": ["empty:-1", "solid:-1"],
  "neighbourhoods": {"all":"111,101,111"},
  "generationRules": [
    {"genData": ["2", "room:-1", "connect:plus:1"], 
      "rules": ["empty,all,or,solid>5,solid:1"]}
  ]
};
procengine.initialize(data);
procengine.generateLevel();
```

In this example you are generating a level of size `15x7` with only 1 room (which is the entire space). The map starts as all `solid` then the system start digging in it using `empty`. Each room is fixed (if its not fully connected) by randomly connecting the islands. We have only two defined tile names `solid` and `empty`. We have 1 defined neighbourhood `all` which consider all the objects around me in form of 3x3 matrix. The `empty` tile have twice the chance to be spawned at the begning compared to the `solid` tile. We use cellular automata for `2` simulations using the following rule:
```
if (this tile is "empty" and have more than "5" neighbours based on the "all" neighbourhood) then
  change this tile to "solid"
```
## What does these sections mean?
As you can see, its super simple, the only thing need explaination is the input data object. Let's explain now in more detail how to construct the input object.

The input data object is consisted of 6 sections. If any section is not existing, it is treated using default values for it. These sections are:
- Names Section: Defines all tile names that are used in the rules and the max count. For example: `"names": ["empty:-1", "solid:-1"]` means we have two defined tiles named `empty` and `solid` and have no maximum count (`-1` means there no maximum count, other values are treated as maximum value).
- Neighbourhoods Section: Defines all the neighbourhoods that are used in the rules. Neighbourhoods give the system the way to calculate the surrounding objects. For example: `"neighbourhoods": {"all":"111,101,111", "plus":"010,101,010"}` means we have two neighbourhoods, one is called `all` which consider all the 8 neighbours around the checked tile, while the second one `plus` only consider the ones in the north, south, east, and west tiles. 
- Map Data Section: Contains all the information about the map required to be generated. For example: `"mapData": ["15x7", "solid:empty"]` consists of 2 parts. 
  - The first part is the map size and in this example its `15x7` which means the width is `15` and height is `7`.
  - The third part is the initial value to fill the map and the value used to dig through the map. For example `solid:empy` means that the initial map is totally filled with `solid`, and all the techniques used `empty` to dig through it.
- Room Data Section: Contains all the information about the rooms in the generation. For example: `"roomData": ["equal:4x2:3", "solid:1|empty:2"]` consists of 2 parts.
  - The first part contains information about how the level is divided and the way to divide it. In the example, it says we will have `3` rooms selected after dividing the map into `equal` rooms of grid `4` by `2`.
  - The second part contains information about how to intialize each room for the generation. In this example, it means that each tile in the room have `2` times chance to be `empty` while `1` time chance to be `solid`.
- Generation Rule Data: is an array of cellular automatas. Each cellular automata is described as an object that consists of two parts. The following is an example:
```
"generationRules": [
  {"genData": ["2", "room:-1", "connect:plus:1"], 
    "rules": ["empty,all,or,solid>5,solid:1"]}
]
```
  - The first part is general about the cellular automata. In this example `"genData": ["2", "room:-1", "connect:plus:1"]` consists of 3 parts: 
    - The first part is the number of simulations. In this example its `2` simulations. 
    - The second part shows which parts of the map the cellular will be applied. There is two types `map` and `room`. `map` means its gonna be applied over the whole map. `room` means it gonna be applied to all the generated rooms. After `:` could have `-1` which means all the rooms or the whole map. It could also have a coma separated values which described the the parameters. If `map` the values are the (x1,y1) and (x2,y2) which defines the affected area. If `room` then the values are ids for the rooms.
    - The last part is the way how the system deals with unconnected parts in the map. For example `connect:plus:1` means if there is an unconnected part of the map, try to `connect` it back and use the `plus` neighbourhood to check for connectivity and with digging thickness of `1`.
  - The second part is an array of rules for the cellular autoamata. For example `"empty,all,or,solid>5,solid:1"`. This rule says if the `tile` is empty and there is `more than` `5` tiles of `solid` then convert the tile to `solid`.

### How to write the rules?
- **Names Section:**
```
"names": [
  "name1:maxCount1", 
  "name2:maxCount2", 
  ...
  ...
  ...
  "nameN:maxCountN"
]
```
Its a list of all the defined names that the use going to use through all the rules. As seen they are defined as an array of string with a maximum count. If maximum count is -1, it means there is no maximum count.
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
  "tileInitial:tileDig"
]
```
This section defines information about the generated map. Its an array of 4 parts:
  - `widthxheight`: 
    - `width`: the map width.
    - `height`: the map height.
  - `tileInitial:tileDig`:
    - `tileInitial`: is the initial value the whole map will be initialized with (it must be defined in the Names Section).
    - `tileDig`: is the value used to dig through the map (it must be defined in the Names Section).
  - `fixType:neighbourhoodName:thickness`:
    - `fixType`: the technique used to handle the disconnected parts in a single room. In the current version we have three techniques `delete` (deletes all other parts of the rooms and leave the largest one), `connect` (connect all the separated parts in the room), and `none` (do nothing).
    - `neighbourhoodName`: the neighbourhood used to check connectivity (It must be defined in the Neighbourhoods Section).
    - `thickness`: how thick the digging should be.
- **Room Data Section:**
```
"roomData": [
  "roomTech:param1xparam2:numRooms", 
  "name1:count1|name2:count2|...|nameN:countN"
  "fixType:neighbourhoodName:thickness"
]
```
  - `roomTech:param1xparam2:numRooms`:
    - `roomTech`: the technique used to divide the map into rooms. The system now support two different values `equal` (divide the map into equal rooms) and `tree` (divide the map using a tree technique which result of unequal size of rooms).
    - `param1`: depends on the technique used. If `equal` is used, this is the num of divisions across the x axis. If `tree` is used, this is the minimum width of the room it shouldn't be less.
    - `param2`: depends on the technique used. If `equal` is used, this is the num of divisions across the y axis. If `tree` is used, this is the minimum height of the room it shouldn't be less.
    - `numRooms`: is the number of rooms the system should achieve.
  - "name1:count1|name2:count2|...|nameN:countN":
    - It is a list of names and numbers separated by `:` and connected with `|`. All the names must be defined in the Names Section. This part says how to initialize each room. Each tile is selected from this array based on the `count` value, the higher the `count` the higher it will get selected.

- **Generation Rule Section:**
```
"generationRules": [
  {"genData": ["numSimulation", "genType:param1,param2,...,paramN", "fixType:neighbourhoodName:thickness"], 
    "rules": [
      "tileName1,neighbourhoodName1,conditionType1,checkTile11 condition11 value11|checkTile12 condition12 value12|...|checkTile1N condition1N value1N,replaceTile11:count11|replaceTile12:count12|...|replaceTile1N:count1N",
      "tileName2,neighbourhoodName2,conditionType2,checkTile21 condition21 value21|checkTile22 condition22 value22|...|checkTile2N condition2N value2N,replaceTile21:count21|replaceTile22:count22|...|replaceTile2N:count2N",
      ...
      ...
      ...
      "tileNameN,neighbourhoodNameN,conditionTypeN,checkTileN1 conditionN1 valueN1|checkTileN2 conditionN2 valueN2|...|checkTileNN conditionNN valueNN,replaceTileN1:countN1|replaceTileN2:countN2|...|replaceTileNN:countNN"
    ]
  },
  {"genData": ["numSimulation", "genType:param1,param2,...,paramN", "fixType:neighbourhoodName:thickness"], 
    "rules": [
      "tileName1,neighbourhoodName1,conditionType1,checkTile11 condition11 value11|checkTile12 condition12 value12|...|checkTile1N condition1N value1N,replaceTile11:count11|replaceTile12:count12|...|replaceTile1N:count1N",
      "tileName2,neighbourhoodName2,conditionType2,checkTile21 condition21 value21|checkTile22 condition22 value22|...|checkTile2N condition2N value2N,replaceTile21:count21|replaceTile22:count22|...|replaceTile2N:count2N",
      ...
      ...
      ...
      "tileNameN,neighbourhoodNameN,conditionTypeN,checkTileN1 conditionN1 valueN1|checkTileN2 conditionN2 valueN2|...|checkTileNN conditionNN valueNN,replaceTileN1:countN1|replaceTileN2:countN2|...|replaceTileNN:countNN"
    ]
  },
  ...
  ...
  ...
  {"genData": ["numSimulation", "genType:param1,param2,...,paramN", "fixType:neighbourhoodName:thickness"], 
    "rules": [
      "tileName1,neighbourhoodName1,conditionType1,checkTile11 condition11 value11|checkTile12 condition12 value12|...|checkTile1N condition1N value1N,replaceTile11:count11|replaceTile12:count12|...|replaceTile1N:count1N",
      "tileName2,neighbourhoodName2,conditionType2,checkTile21 condition21 value21|checkTile22 condition22 value22|...|checkTile2N condition2N value2N,replaceTile21:count21|replaceTile22:count22|...|replaceTile2N:count2N",
      ...
      ...
      ...
      "tileNameN,neighbourhoodNameN,conditionTypeN,checkTileN1 conditionN1 valueN1|checkTileN2 conditionN2 valueN2|...|checkTileNN conditionNN valueNN,replaceTileN1:countN1|replaceTileN2:countN2|...|replaceTileNN:countNN"
    ]
  }
]
```
This section defines the rules for the cellular automata used to generate the rooms. Its an array of objects that defines the cellular automata and it consists of main 2 parts:
  - The first object is defined by `genData` tag and its an array of values.
    - `numSimulation`: the number of simulations you want the following rules to be applied.
    - `genType:param1,param2,...,paramN`: how the cellular autoamata should be applied to the map. `genType` can be `room` or `map`. `room` means that the cellular autoamata is applied to the generated rooms. `map` means that the whole map is applied to the whole map. The `param` could be -1 which means all the rooms or the whole map. If its a `map` there will be four values coma separated which define a rectangle on the map that will be applied `x, y, width, height`. If its `room` it can have any number of parameters but each parameter must be an index for a room.
  - `"tileName,neighbourhoodName,conditionType,checkTile1 condition1 value1|checkTile2 condition2 value2|...|checkTileN conditionN valueN,startingRule1|startingRule2|...|startingRuleN"`:
    - `tileName`: if the tile value is equal to `tileName` then this rule will be applied (`tileName` must be defined in the Names Section).
    - `neighbourhoodName`: the type of neighbourhood used to check if this rule is valid or not (`neighbourhoodName` must be defined in the Neighbourhoods Section).
    - `conditionType`: the condition type is either `and` or `or` which means the condition parts are anded or ored.
    - `checkTile`: the tile that is checked in the condition (`checkTile` must be defined in the Names Section).
    - `condition`: the type of condition which might be `>`, `<`, `>=`, `<=`, `==`, and `!=`.
    - `value`: the value that the check tile is compared to it based on the `condition`.
    - `replaceTile1:count1|replaceTile2:count2|...|replaceTileN:countN`: Is executed the same way like Starting Rules (`replaceTile` must be defined in the Names Section). It could be rewritten as `startingRule1|startingRule2|...|startingRuleN`.

For a simple way to construct the initialization object try using this tool ([link](http://cdn.rawgit.com/amidos2006/procengine/master/Example/index.html)).