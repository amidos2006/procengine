var procengine = {
  ////////////////////////////Data Members//////////////////////////////////////
  /**
  * to make sure people call Initialize function before generate
  */
  isInitialized: false,
  /**
  * for debugging the engine
  */
  isDebug: true,
  /**
  * the size of the map [width x height]
  */
  mapSize: [],
  /**
  * number of rooms to be generated in the level
  */
  roomNumber: 1,
  /**
  * the tile used to fill the map
  */
  mapStart: -1,
  /**
  * the tile used to dig through the map
  */
  mapDig: -1,
  /**
  * handling the unconnected areas
  */
  unconnected: -1,
  /**
  * checking unconnected areas
  */
  connectionType: [[]],
  /**
  * dictionary contains all defined names and coressponding ids
  */
  namesIndex: {},
  /**
  * dictionary contains all defined ids and coressponding names
  */
  indexNames: {},
  /**
  * dictionary for all the defined neigbourhoods
  */
  neigbourhoods: {},
  /**
  * contains all the information about the cellular automata
  */
  roomAutomata:{
    /**
    * number of simulations for the cellular automata
    */
    simulationNumber: 2,
    /**
    * starting rules that is used to starting distribution
    */
    startingRules: [],
    /**
    * rules for the cellular automata
    */
    rules: []
  },
  /**
  * contains all the information about smoothing cellular automata
  */
  smoothAutomata:{
    /**
    * number of smooth simulations
    */
    simulationNumber: 0,
    /**
    * rules for the smoothing cellular automata
    */
    rules:[]
  },
  ///////////////////////////////Classes////////////////////////////////////////
  /**
  * ConditionType is an enumarator with two values "in" or "out"
  */
  ConditionType: {
    "in": 0,
    "out": 1
  },
  /**
  * Type to treat isolated areas
  */
  Unconnected: {
    "connect":0,
    "delete":1
  },
  /**
  * used to check if unconnected
  */
  ConnectionType: {
    "plus":[[0,1,0], [1,0,1], [0,1,0]],
    "all":[[111], [101], [111]]
  },
  /**
  * ReplacingRule class contains data about inserting a tile using probabilities
  * @param dataLine {string} "tile:probability"
  * @member tile {Number} the tile that should appear in a specific tile
  * @member probability {Number} the probability of this tile to show
  * @function toString {function} return a string that contains all the data
  */
  ReplacingRule: function(dataLine){
    var pieces = dataLine.split(":");
    this.tile = procengine.namesIndex[pieces[0].trim().toLowerCase()];
    this.probability = parseFloat(pieces[1].trim());
    this.toString = function(){
      return procengine.indexNames[this.tile] + " " + this.probability.toString();
    };
  },
  /**
  * Rule class contains data about cellular automata rules
  * @param dataLine {string} "tile,neighbourhood,checkTile,conditionType,
  *                           lowBoundary,highBoundary,ReplacingRule|
  *                           ReplacingRule|..."
  * @member tile {Number} if the current x,y is this tile
  * @member neighbourhood {Number[][]} the positions of tiles to check
  * @member checkTile {Number} the tile type to check
  * @member conditionType {ConditionType} in "lowBoundary<value<highBoundary" or
  *                                       out "lowBoundary>value<highBoundary"
  * @member lowBoundary {Number} the lower bound condition
  * @member highBoundary {Number} the high bound condition
  * @member replacingRules {ReplacingRule[]} the rules that are used in applying
  * @function toString {function}
  */
  Rule: function(dataLine){
    var pieces = dataLine.split(",");
    this.tile = procengine.namesIndex[pieces[0].trim().toLowerCase()];
    this.neighbourhood = procengine.neigbourhoods[pieces[1].trim().toLowerCase()];
    this.checkTile = procengine.namesIndex[pieces[2].trim().toLowerCase()];
    this.conditionType = procengine.ConditionType[pieces[3].trim().toLowerCase()];
    this.lowBoundary = parseInt(pieces[4].trim().toLowerCase());
    this.highBoundary = parseInt(pieces[5].trim().toLowerCase());
    pieces = pieces[6].split("|");
    this.replacingRules = [];
    for (var i = 0; i < pieces.length; i++) {
      this.replacingRules.push(new procengine.ReplacingRule(pieces[i]));
    }
    procengine.fixRulesProbability(this.replacingRules,
      procengine.getTotalProbability(this.replacingRules));
    this.toString = function(){
      return procengine.indexNames[this.tile] + " " +
        procengine.indexNames[this.checkTile] + " " + this.conditionType + " " +
        this.lowBoundary.toString() + " " + this.highBoundary.toString() + " [" +
        this.replacingRules.toString() + "]";
    };
  },
  /**
  * Point data structure
  * @param x
  * @param y
  * @member x
  * @member y
  * @function clone
  */
  Point: function(x, y){
    this.x = x;
    this.y = y;
    this.clone = function(){
      return new procengine.Point(this.x, this.y);
    }
  },
  /**
  * Rectangle class to handle a rectangle data
  * @param x {Number} x position for the rectangle
  * @param y {Number} y position for the rectangle
  * @param width {Number} rectangle width
  * @param height {Number} rectangle height
  * @member x {Number} x position for the rectangle
  * @member y {Number} y position for the rectangle
  * @member width {Number} rectangle width
  * @member height {Number} rectangle height
  */
  Rectangle: function(x, y, width, height){
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  },
  //////////////////////////Private Functions///////////////////////////////////
  /**
  * Gets a random integer number
  * @param max {Number} maximum boundary
  * @return {Number} random integer number
  */
  randomInt: function(max){
    return Math.floor(Math.random() * max);
  },
  /**
  * get the sign of the number
  * @param number {Number} the current number to check
  * @return {Number} the sign of the number (+1, -1, 0)
  */
  sign: function(number){
    if(number > 0) return 1;
    if(number < 0) return -1;
    return 0;
  },
  /**
  * get the biggest label in the map
  * @param labeledPoints {Point[][]} the labeledPoints on the map
  * @return {Number} the label of the largest area
  */
  getBiggestLabel(labeledPoints){
    var result = -1;
    var maxLength = 0;
    for (var i = 0; i < labeledPoints.length; i++) {
      if(labeledPoints[i].length > maxLength){
        result = i;
        maxLength = labeledPoints[i].length;
      }
    }
    return result;
  },
  /**
  * Check if the x and y are in the array
  * @param x {Number} the x position to Check
  * @param y {Number} the y position to Check
  * @param array {Point[]} the array to Check
  * @return {boolean} if the point exisits in the array
  */
  pointInArray: function(x, y, array){
    for (var i = 0; i < array.length; i++) {
      if(x == array[i].x && y == array[i].y){
        return true;
      }
    }
    return false;
  },
  /**
  * append the second array to the first array
  * @param array1 {Obejct[]} first array
  * @param array2 {Object[]} second array
  */
  appendArray(array1, array2){
    for (var i = 0; i < array2.length; i++) {
      array1.push(array2[i]);
    }
  },
  /**
  * Get the total sum of probability attribute in the rules array
  * @param rules {ReplacingRule[]} an array of ReplacingRule
  * @return {Number} total sum of probabilities of the replacing rules
  */
  getTotalProbability: function(rules){
    var totalValue = 0;
    for (var i = 0; i < rules.length; i++) {
      totalValue += rules[i].probability;
    }
    return totalValue;
  },
  /**
  * Changing the values to probabilities
  * @param rules {ReplacingRule[]} an array of ReplacingRule
  * @param totalValue {Number} the total summation of probabilities in the rules
  */
  fixRulesProbability: function(rules, totalValue){
    for (var i = 0; i < rules.length; i++) {
      rules[i].probability /= totalValue;
    }
  },
  /**
  * parse neighbourhood data into 2D matrix
  * @param dataLine {string} a comma separated string for each row in the matrix
  * @return {Number[][]} 2D matrix of 1s and 0s which define the neighbourhood
  */
  parseNeighbourhood: function(dataLine){
    var pieces = dataLine.split(",");
    var result = [];
    for(var j=0; j<pieces.length; j++){
      var line = pieces[j];
      result.push([]);
      for(var i=0; i<line.length; i++){
        var bit = parseInt(line.trim().charAt(i));
        result[result.length - 1].push(bit);
      }
    }
    return result;
  },
  /**
  * Flood fill the map starting from the point x, y
  * @param map {Number[][]} the current labeled map
  * @param x {Number} the current x position to flood
  * @param y {Number} the current y position to floodFill
  * @param connection {Number[][]} connection type
  * @param currentLabel {Number} the current label
  */
  floodFill: function(map, x, y, connection, currentLabel){
    if(x < 0 || y < 0 || x >= map[0].length || y >= map.length || map[y][x] != 0){
      return;
    }
    map[y][x] = currentLabel;
    var center = new procengine.Point(Math.floor(connection[0].length / 2),
      Math.floor(connection.length / 2));
    for (var i = 0; i < connection.length; i++) {
      for (var j = 0; j < connection[i].length; j++) {
        if(connection[i][j] == 1){
          procengine.floodFill(map, x + j - center.x, y + i - center.y,
            connection, currentLabel);
        }
      }
    }
  },
  /**
  * label the map and get the results
  * @param map {Number[][]} the current map
  * @param connection {Number[][]} direction of connection for tiles
  * @param mapStart (Number) the inpassable tile
  * @return {Point[][]} a 2D array contains all the points with labels
  */
  labelMap: function(map, connection, mapStart){
    var tempMap = [];
    for (var y = 0; y < map.length; y++) {
      tempMap.push([]);
      for (var x = 0; x < map[y].length; x++) {
        tempMap[y].push(0);
        if(map[y][x] == mapStart){
          tempMap[y][x] = -1;
        }
      }
    }

    var currentLabel = 0;
    for (var y = 0; y < tempMap.length; y++) {
      for (var x = 0; x < tempMap[y].length; x++) {
        if(tempMap[y][x] == 0){
          currentLabel += 1;
          procengine.floodFill(tempMap, x, y, connection, currentLabel);
        }
      }
    }

    var result = [];
    for (var i = 0; i < currentLabel; i++) {
      result.push([]);
    }

    for (var y = 0; y < tempMap.length; y++) {
      for (var x = 0; x < tempMap[y].length; x++) {
        if(tempMap[y][x] != -1){
          result[tempMap[y][x] - 1].push(new procengine.Point(x, y));
        }
      }
    }

    return result;
  },
  /**
  * debugging printing function
  * @param map {Number[][]} the current map
  */
  printDebugMap: function(map){
    if(!procengine.isDebug){
      return;
    }

    var result = "";
    for (var y = 0; y < map.length; y++) {
      for (var x = 0; x < map[y].length; x++) {
        if(map[y][x] < 0) {
          result += "#";
        }
        else{
          result += map[y][x].toString();
        }
      }
      result += "\n";
    }
    console.log(result);
  },
  /**
  * generate the starting map
  * @return {Number[][]} 2D array of mapStart tile index
  */
  getStartingMap: function(){
    var map = [];
    for (var y = 0; y < procengine.mapSize[1]; y++) {
      map.push([]);
      for (var x = 0; x < procengine.mapSize[0]; x++) {
        map[y].push(procengine.mapStart);
      }
    }
    return map;
  },
  /**
  * Dig the map to construct rooms where cellular automata can be applied
  * @param map {Number[][]} the current map to be modified
  * @return {Rectangle[]} array of all the rooms to be adjusted
  */
  getRooms: function(map){
    return [new procengine.Rectangle(1, 1, procengine.mapSize[0] - 2, procengine.mapSize[1] - 2)];
  },
  /**
  *
  */
  fixUnconnected: function(map){
    var labeledData = procengine.labelMap(map, procengine.connectionType,
      procengine.mapStart);
    if(procengine.unconnected == procengine.Unconnected["delete"]){
      var largestLabel = procengine.getBiggestLabel(labeledData);
      for (var i = 0; i < labeledData.length; i++) {
        if(i == largestLabel){
          continue;
        }
        for (var j = 0; j < labeledData[i].length; j++) {
          var point = labeledData[i][j];
          map[point.y][point.x] = procengine.mapStart;
        }
      }
    }
    if(procengine.unconnected == procengine.Unconnected["connect"]){
      while(labeledData.length > 1){
        var randomLabel = procengine.randomInt(labeledData.length - 1) + 1;
        var p1 = labeledData[0][procengine.randomInt(labeledData[0].length)].
          clone();
        var p2 = labeledData[randomLabel][procengine.randomInt(
          labeledData[randomLabel].length)].clone();
        procengine.appendArray(labeledData[0], labeledData[randomLabel]);
        labeledData.splice(randomLabel, 1);
        if(Math.random() < 0.5){
          var temp = p2;
          p2 = p1;
          p1 = temp;
        }
        if(Math.random() < 0.5){
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            procengine.sign(p2.x - p1.x), 0), procengine.mapStart,
            procengine.mapDig);
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            0, procengine.sign(p2.y - p1.y)), procengine.mapStart,
            procengine.mapDig);
        }
        else{
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            0, procengine.sign(p2.y - p1.y)), procengine.mapStart,
            procengine.mapDig);
          procengine.connectPoints(map, p1, p2, new procengine.Point(
            procengine.sign(p2.x - p1.x), 0), procengine.mapStart,
            procengine.mapDig);
        }
      }
    }
  },
  /**
  * connect the map between p1 and p2
  * @param p1 {Point} the first position
  * @param p2 {Point} the second position
  * @param dir {Point} the direction of connection
  * @param mapStart {Number} impassable tile
  * @param mapDig {Number} passable tile
  */
  connectPoints: function(map, p1, p2, dir, mapStart, mapDig){
    if(dir.x != 0){
      while(p1.x != p2.x){
        if(map[p1.y][p1.x] == mapStart){
          map[p1.y][p1.x] = mapDig;
        }
        p1.x += dir.x;
      }
    }
    if(dir.y != 0){
      while(p1.y != p2.y){
        if(map[p1.y][p1.x] == mapStart){
          map[p1.y][p1.x] = mapDig;
        }
        p1.y += dir.y;
      }
    }
  },
  /**
  * Apply cellular automata to couple of rectangles
  * @param map {Number[][]} the map need to be modified
  * @param simNumber {Number} number of simulations
  * @param rects {Rectangle[]} an array of rooms
  * @param startingRules {ReplacingRule[]} the intializing rules for the
                        cellular automata
  * @param rules {Rule[]} the cellular automata rules
  */
  applyCellularAutomata: function(map, simNumber, rects, startingRules, rules){
    for (var i = 0; i < rects.length; i++) {
      var rect = rects[i];
      if(startingRules.length > 0){
        procengine.roomInitialize(map, rect, startingRules);
        procengine.printDebugMap(map);
      }
      for (var s = 0; s < simNumber; s++) {
        procengine.roomSimulate(map, rect, rules);
        procengine.printDebugMap(map);
      }
    }
  },
  /**
  * initialize the room based on the starting rules
  * @param map {Number[][]} the current map to be modified
  * @param rect {Rectangle} the current room dimension
  * @param rules {ReplacingRule[]} an array of ReplacingRule to be applied
  */
  roomInitialize: function(map, rect, rules){
    for (var y = rect.y; y < rect.y + rect.height; y++) {
      for (var x = rect.x; x < rect.x + rect.width; x++) {
        procengine.applyRule(map, x, y, rules);
      }
    }
  },
  /**
  * Apply one simulation run on a certain area
  * @param map {Number[][]} the current map
  * @param rect {Rectangle} the specific area need to be altered
  * @param rules {Rule[]} the rules of the cellular automata
  */
  roomSimulate: function(map, rect, rules){
    var tempMap = [];
    for (var i = 0; i < map.length; i++) {
      tempMap.push([]);
      for (var j = 0; j < map[i].length; j++) {
        tempMap[i].push(map[i][j]);
      }
    }

    for (var y = rect.y; y < rect.y + rect.height; y++) {
      for (var x = rect.x; x < rect.x + rect.width; x++) {
        for (var i = 0; i < rules.length; i++) {
          if(procengine.checkRule(map, x, y, rules[i])){
            procengine.applyRule(tempMap, x, y, rules[i].replacingRules);
          }
        }
      }
    }

    for (var y = rect.y; y < rect.y + rect.height; y++) {
      for (var x = rect.x; x < rect.x + rect.width; x++) {
        map[y][x] = tempMap[y][x];
      }
    }
  },
  /**
  * check if the rule can be applied on this tile
  * @param map {Number[][]} the current map
  * @param x {Number} the current x location
  * @param y {Number} the current y location
  * @param rule {Rule} the current rule to check
  * @return true it can be applied and false otherwise
  */
  checkRule: function(map, x, y, rule){
    var centerY = Math.floor(rule.neighbourhood.length / 2);
    var centerX = Math.floor(rule.neighbourhood[0].length / 2);
    var value = 0;
    for (var iy = 0; iy < rule.neighbourhood.length; iy++) {
      for (var ix = 0; ix < rule.neighbourhood[iy].length; ix++) {
        var tempY = y - centerY + iy;
        var tempX = x - centerX + ix;
        if(tempY >= map.length || tempY < 0 || tempX >= map[iy].length || tempX < 0){
          continue;
        }
        if(rule.neighbourhood[iy][ix] != 0 &&
          map[tempY][tempX] == rule.checkTile){
          value += 1;
        }
      }
    }

    if(rule.conditionType == procengine.ConditionType["in"]){
      return value > rule.lowBoundary && value < rule.highBoundary;
    }
    if(rule.conditionType == procengine.ConditionType["out"]){
      return value < rule.lowBoundary || value > rule.highBoundary;
    }
    return false;
  },
  /**
  * Apply a group of replacing rules on a certain tile
  * @param map {Number[][]} the current map
  * @param x {Number} the current x location
  * @param y {Number} the current y location
  * @param rules {ReplacingRule[]} the replacing rules to be applied
  */
  applyRule: function(map, x, y, rules){
    var randomValue = Math.random();
    var amountValue = 0;
    for (var i = 0; i < rules.length; i++) {
      amountValue += rules[i].probability;
      if(randomValue < amountValue){
        map[y][x] = rules[i].tile;
        break;
      }
    }
  },
  /**
  * Get generated map that use maps
  * @param map {Number[][]} the current generated map
  * @param {string[][]} map using the names defined
  */
  getNamesMap: function(map){
    var tempMap = [];
    for (var i = 0; i < map.length; i++) {
      tempMap.push([]);
      for (var j = 0; j < map[i].length; j++) {
        tempMap[i].push(procengine.indexNames[map[i][j]]);
      }
    }
    return tempMap;
  },
  //////////////////////////Public Functions////////////////////////////////////
  /**
  * initialize the whole framework with new data
  * @param data {Object} have the following fields "mapData", "names",
  *                      "neigbourhoods", "startingRules", "roomRules",
  *                      "smoothRules"
  */
  initialize: function(data){
    procengine.mapSize = [];
    procengine.roomNumber = 1;
    procengine.mapStart = "";
    procengine.mapDig = "";
    procengine.unconnected = procengine.Unconnected["connect"];
    procengine.connectionType = procengine.ConnectionType["plus"];
    procengine.namesIndex = {};
    procengine.indexNames = {};
    procengine.neigbourhoods = {};
    procengine.roomAutomata = {
      simulationNumber: 2,
      startingRules: [],
      rules: []
    };
    procengine.smoothAutomata = {
      simulationNumber:0,
      rules:[]
    };

    if(data.hasOwnProperty("mapData")){
      procengine.mapSize.push(parseInt(data["mapData"][0]));
      procengine.mapSize.push(parseInt(data["mapData"][1]));
      procengine.roomNumber = parseInt(data["mapData"][2]);
    }
    else{
      procengine.mapSize.push(24);
      procengine.mapSize.push(24);
      procengine.roomNumber = 1;
    }

    if(data.hasOwnProperty("names")){
      var index = 0;
      for(var i = 0; i < data["names"].length; i++) {
        procengine.namesIndex[data["names"][i].trim().toLowerCase()] = index;
        procengine.indexNames[index] = data["names"][i].trim().toLowerCase();
        index+=1;
      }
    }
    else{
      procengine.namesIndex = {"solid":0, "empty":1};
    }

    if(data.hasOwnProperty("mapData")){
      procengine.mapStart = procengine.namesIndex[data["mapData"][3].trim().toLowerCase()];
      procengine.mapDig = procengine.namesIndex[data["mapData"][4].trim().toLowerCase()];
      var dataPieces = data["mapData"][5].split(":");
      procengine.unconnected = procengine.Unconnected[dataPieces[0].trim().toLowerCase()];
      procengine.connectionType = procengine.ConnectionType[dataPieces[1].trim().toLowerCase()];
    }
    else{
      procengine.mapStart = procengine.namesIndex["solid"];
      procengine.mapDig = procengine.namesIndex["empty"];
      procengine.unconnected = procengine.Unconnected["connect"];
      procengine.connectionType = procengine.ConnectionType["plus"]
    }

    if(data.hasOwnProperty("neighbourhood")){
      for(var key in data["neighbourhood"]){
        procengine.neigbourhoods[key.trim().toLowerCase()] =
          procengine.parseNeighbourhood(data["neighbourhood"][key]);
      }
    }
    else{
      procengine.neigbourhoods = {
        "plus": procengine.parseNeighbourhood("010,101,010"),
        "all": procengine.parseNeighbourhood("111","101","111")
      };
    }

    if(data.hasOwnProperty("startingRules")){
      procengine.roomAutomata.simulationNumber = parseInt(data["startingRules"][0]);
      for(var i = 1; i < data["startingRules"].length; i++) {
        procengine.roomAutomata.startingRules.push(new procengine.ReplacingRule(data["startingRules"][i]));
      }
    }
    else{
      procengine.roomAutomata.simulationNumber = 2;
      procengine.roomAutomata.startingRules.push(new procengine.ReplacingRule("solid,2"));
      procengine.roomAutomata.startingRules.push(new procengine.ReplacingRule("empty,1"));
    }
    procengine.fixRulesProbability(procengine.roomAutomata.startingRules,
      procengine.getTotalProbability(procengine.roomAutomata.startingRules));

    if(data.hasOwnProperty("roomRules")){
      for(var i = 0; i < data["roomRules"].length; i++) {
        procengine.roomAutomata.rules.push(new procengine.Rule(data["roomRules"][i]));
      }
    }
    else{
      procengine.roomAutomata.rules.push(new procengine.Rule("empty,1,all,solid,out,0,5,solid"));
    }

    if(data.hasOwnProperty("smoothRules")){
      procengine.roomAutomata.simulationNumber = parseInt(data["smoothRules"][0]);
      for(var i = 1; i < data["smoothRules"].length; i++) {
        procengine.smoothAutomata.rules.push(new procengine.Rule(data["smoothRules"][i]));
      }
    }
    else{
      procengine.smoothAutomata.simulationNumber = 0;
    }

    isInitialized = true;
  },
  /**
  * generate a level based on the intialized data
  */
  generateLevel: function(){
    if(!isInitialized){
      console.log("you must call initialize first");
    }

    var map = procengine.getStartingMap();
    if(procengine.isDebug){
      console.log("After constructing the matrix:\n");
      procengine.printDebugMap(map);
    }
    var rooms = procengine.getRooms(map);
    if(procengine.isDebug){
      console.log("After digging the rooms:\n");
      procengine.printDebugMap(map);
      if(procengine.roomAutomata.simulationNumber > 0){
        console.log("Room Automata:\n");
      }
    }
    procengine.applyCellularAutomata(map,
      procengine.roomAutomata.simulationNumber, rooms,
      procengine.roomAutomata.startingRules, procengine.roomAutomata.rules);
    procengine.fixUnconnected(map);
    if(procengine.isDebug){
      console.log("After using connection Method:\n");
      procengine.printDebugMap(map);
      if(procengine.smoothAutomata.simulationNumber > 0){
        console.log("Smooth Automata:\n");
      }
    }
    procengine.applyCellularAutomata(map,
      procengine.smoothAutomata.simulationNumber,
      [new procengine.Rectangle(0, 0, procengine.mapSize[0],
        procengine.mapSize[1])], [], procengine.smoothAutomata.rules);
    return procengine.getNamesMap(map);
  },
  /**
  * get string contains all the data about the generator
  */
  toString: function(){
    return "mapSize: " + procengine.mapSize[0].toString() + "x" +
                         procengine.mapSize[1].toString() + "\n" +
      "roomNumber: " + procengine.roomNumber.toString() + "\n" +
      "Unconnected: " + procengine.unconnected + "\n" +
      "mapStart: " + procengine.indexNames[procengine.mapStart] + " mapDig: " +
                     procengine.indexNames[procengine.mapDig] + "\n" +
      "names: " + procengine.indexNames.toString() + "\n" +
      "roomAutomata:\n" +
      "\tsimulationNumber: " + procengine.roomAutomata.simulationNumber.toString() + "\n" +
      "\tstartingRules: [" + procengine.roomAutomata.startingRules.toString() + "]\n" +
      "\trules: [" + procengine.roomAutomata.rules.toString() + "]\n" +
      "smoothAutomata:\n" +
      "\tsimulationNumber: " + procengine.smoothAutomata.simulationNumber.toString() + "\n" +
      "\trules: [" + procengine.smoothAutomata.rules.toString() + "]\n";
  }
};
///////////////////////////////Testing Code/////////////////////////////////////
var data = {
  "mapData": ["15", "7", "1", "solid", "empty", "connect:plus"],
  "names": ["solid", "empty"],
  "neighbourhood": {"plus":"010,101,010", "all":"111,101,111"},
  "startingRules": ["2","solid:1","empty:2"],
  "roomRules": ["empty,all,solid,out,0,5,solid:1"]
};
procengine.initialize(data);
procengine.generateLevel();
